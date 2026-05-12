package com.myfinance.service;

import com.myfinance.domain.*;
import com.myfinance.dto.*;
import com.myfinance.repository.ExchangeRateRepository;
import com.myfinance.repository.PositionOrderRepository;
import com.myfinance.repository.PositionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class TaxLossHarvestingService {

    private static final BigDecimal PFU_RATE    = new BigDecimal("0.30");
    private static final BigDecimal PS_RATE     = new BigDecimal("0.172");
    private static final BigDecimal ZERO        = BigDecimal.ZERO;

    // Enveloppes fiscales éligibles au basket CTO (hors PEA, AV, PER, PEE_PERCO)
    private static final Set<FiscalEnvelope> CTO_ELIGIBLE = Set.of(
            FiscalEnvelope.CTO, FiscalEnvelope.FLAT_TAX, FiscalEnvelope.AUTRE, FiscalEnvelope.NONE
    );

    private final PositionRepository positionRepository;
    private final PositionOrderRepository positionOrderRepository;
    private final ExchangeRateRepository exchangeRateRepository;
    private final CryptoTaxService cryptoTaxService;

    // ── Point d'entrée public ──────────────────────────────────

    /**
     * @param taxOption     "PFU" (défaut 30 %) ou "BAREME" (TMI + 17,2 %)
     * @param tmi           Tranche marginale en % (ex. 30.0). Ignoré si taxOption != BAREME.
     * @param mvReporteesCto    Moins-values CTO reportées des années précédentes (case 3VH N-1..N-10)
     * @param mvReporteesCrypto Moins-values CRYPTO reportées des années précédentes
     */
    public TaxLossSummaryDto computeSummary(User user, int year,
                                             String taxOption, Float tmi,
                                             BigDecimal mvReporteesCto,
                                             BigDecimal mvReporteesCrypto) {
        BigDecimal rate       = effectiveRate(taxOption, tmi);
        BigDecimal mvCto      = mvReporteesCto    != null ? mvReporteesCto.max(ZERO)    : ZERO;
        BigDecimal mvCrypto   = mvReporteesCrypto != null ? mvReporteesCrypto.max(ZERO) : ZERO;

        Map<String, BigDecimal> exchangeRates = loadExchangeRates();
        List<Position> active = positionRepository.findByUserAndStatusOrderByCreatedAtDesc(user, PositionStatus.ACTIVE);

        List<Position> ctoPositions = active.stream()
                .filter(p -> p.getCategory() == AssetCategory.BOURSE
                        && CTO_ELIGIBLE.contains(envelope(p)))
                .toList();

        List<Position> cryptoPositions = active.stream()
                .filter(p -> p.getCategory() == AssetCategory.CRYPTO)
                .toList();

        BasketAnalysisDto cto    = analyseCtoBasket(ctoPositions, exchangeRates, year, rate, mvCto);
        BasketAnalysisDto crypto = analyseCryptoBasket(cryptoPositions, user, exchangeRates, year, rate, mvCrypto);

        return new TaxLossSummaryDto(cto, crypto, year, taxOption != null ? taxOption : "PFU",
                tmi, mvCto, mvCrypto);
    }

    private BigDecimal effectiveRate(String taxOption, Float tmi) {
        if ("BAREME".equalsIgnoreCase(taxOption) && tmi != null && tmi > 0) {
            return BigDecimal.valueOf(tmi / 100.0).add(PS_RATE).setScale(4, RoundingMode.HALF_UP);
        }
        return PFU_RATE;
    }

    // ── Basket CTO (BOURSE, enveloppes hors PEA/AV/PER/PEE_PERCO) ──

    private BasketAnalysisDto analyseCtoBasket(List<Position> positions,
                                               Map<String, BigDecimal> rates,
                                               int year, BigDecimal taxRate,
                                               BigDecimal mvReportees) {
        if (positions.isEmpty()) {
            return emptyBasket("Compte-titres ordinaire");
        }

        Map<Long, List<PositionOrder>> ordersByPos = batchLoadOrders(positions);

        // PV brutes de l'année, réduites des MV reportées antérieures
        BigDecimal pvBrutes    = positions.stream()
                .map(p -> computeRealizedGainsCto(ordersByPos.getOrDefault(p.getId(), List.of()), year))
                .reduce(ZERO, BigDecimal::add);
        BigDecimal pvRealisees = pvBrutes.subtract(mvReportees).max(ZERO);

        return buildBasket("Compte-titres ordinaire", positions, ordersByPos, pvRealisees, rates, taxRate, mvReportees, pvBrutes.max(ZERO));
    }

    /**
     * Calcule les plus-values réalisées sur les SELL de l'année N pour une position CTO.
     * Méthode du coût moyen pondéré (CMP) — légale pour les actions françaises.
     */
    private BigDecimal computeRealizedGainsCto(List<PositionOrder> orders, int year) {
        BigDecimal totalQty  = ZERO;
        BigDecimal totalCost = ZERO;
        BigDecimal realized  = ZERO;

        for (PositionOrder order : orders) {
            if (order.getQuantity() == null) continue;

            if (order.getOrderType() == OrderType.BUY
                    || order.getOrderType() == OrderType.AIRDROP
                    || order.getOrderType() == OrderType.ABONDEMENT) {
                totalQty  = totalQty.add(order.getQuantity());
                totalCost = totalCost.add(order.getAmountEur());
            } else if (order.getOrderType() == OrderType.SELL
                    && order.getOrderDate().getYear() == year
                    && totalQty.compareTo(ZERO) > 0) {
                BigDecimal avgCost  = totalCost.divide(totalQty, 10, RoundingMode.HALF_UP);
                BigDecimal costBasis = order.getQuantity().multiply(avgCost);
                realized  = realized.add(order.getAmountEur().subtract(costBasis));
                // Mise à jour du stock résiduel après cession
                BigDecimal remainQty = totalQty.subtract(order.getQuantity()).max(ZERO);
                totalCost = remainQty.compareTo(ZERO) == 0 ? ZERO : remainQty.multiply(avgCost);
                totalQty  = remainQty;
            }
        }
        return realized;
    }

    // ── Basket CRYPTO ──────────────────────────────────────────

    private BasketAnalysisDto analyseCryptoBasket(List<Position> positions,
                                                  User user,
                                                  Map<String, BigDecimal> rates,
                                                  int year, BigDecimal taxRate,
                                                  BigDecimal mvReportees) {
        BigDecimal pvBrutes    = computeCryptoPvRealisees(user, year);
        BigDecimal pvRealisees = pvBrutes.subtract(mvReportees).max(ZERO);
        Map<Long, List<PositionOrder>> ordersByPos = batchLoadOrders(positions);
        return buildBasket("Crypto-monnaies", positions, ordersByPos, pvRealisees, rates, taxRate, mvReportees, pvBrutes);
    }

    private BigDecimal computeCryptoPvRealisees(User user, int year) {
        try {
            CryptoTaxSummaryDto summary = cryptoTaxService.getSummary(user, year, "PFU", null);
            return summary.plusValueNetteImposable().max(ZERO);
        } catch (Exception e) {
            log.warn("Impossible de calculer les PV crypto pour l'année {} : {}", year, e.getMessage());
            return ZERO;
        }
    }

    // ── Construction commune des baskets ───────────────────────

    private BasketAnalysisDto buildBasket(String label,
                                         List<Position> positions,
                                         Map<Long, List<PositionOrder>> ordersByPos,
                                         BigDecimal pvRealisees,
                                         Map<String, BigDecimal> rates,
                                         BigDecimal taxRate,
                                         BigDecimal mvReportees,
                                         BigDecimal pvBrutes) {
        List<TaxLossCandidateDto> candidates = buildCandidates(positions, ordersByPos, pvRealisees, rates, taxRate);

        BigDecimal totalUnrealized = candidates.stream()
                .map(TaxLossCandidateDto::unrealizedLossEur)
                .reduce(ZERO, BigDecimal::add);

        BigDecimal compensable = pvRealisees.min(totalUnrealized.abs());
        BigDecimal economie    = compensable.multiply(taxRate).setScale(2, RoundingMode.HALF_UP);

        return new BasketAnalysisDto(
                label,
                pvBrutes.setScale(2, RoundingMode.HALF_UP),
                mvReportees.setScale(2, RoundingMode.HALF_UP),
                pvRealisees.setScale(2, RoundingMode.HALF_UP),
                totalUnrealized.setScale(2, RoundingMode.HALF_UP),
                compensable.setScale(2, RoundingMode.HALF_UP),
                economie,
                candidates
        );
    }

    /**
     * Construit la liste des candidats (positions en MV latente),
     * triés par impact décroissant, avec le nombre de parts recommandées à vendre.
     */
    private List<TaxLossCandidateDto> buildCandidates(List<Position> positions,
                                                      Map<Long, List<PositionOrder>> ordersByPos,
                                                      BigDecimal pvRealisees,
                                                      Map<String, BigDecimal> rates,
                                                      BigDecimal taxRate) {
        // Filtrer et trier les positions en MV latente (les plus grosses pertes d'abord)
        record PosGain(Position pos, BigDecimal capitalGain, BigDecimal units) {}

        List<PosGain> losers = new ArrayList<>();
        for (Position pos : positions) {
            List<PositionOrder> orders = ordersByPos.getOrDefault(pos.getId(), List.of());
            PositionComputedDto computed = PositionDto.computeForSnapshot(pos, orders, rates);
            if (computed.capitalGainEur() != null && computed.capitalGainEur().compareTo(ZERO) < 0) {
                BigDecimal units = computed.units() != null ? computed.units() : ZERO;
                losers.add(new PosGain(pos, computed.capitalGainEur(), units));
            }
        }
        losers.sort(Comparator.comparing(PosGain::capitalGain)); // du plus négatif au moins négatif

        List<TaxLossCandidateDto> candidates = new ArrayList<>();
        BigDecimal pvRestant = pvRealisees;

        for (PosGain pg : losers) {
            BigDecimal mv    = pg.capitalGain(); // négatif
            BigDecimal units = pg.units();

            BigDecimal sellQty;
            BigDecimal realizedMv;
            BigDecimal saving;

            if (pvRestant.compareTo(ZERO) <= 0 || units.compareTo(ZERO) == 0) {
                sellQty    = ZERO;
                realizedMv = ZERO;
                saving     = ZERO;
            } else if (mv.abs().compareTo(pvRestant) >= 0) {
                // Vente partielle : juste assez pour couvrir la PV restante
                sellQty    = units.multiply(pvRestant).divide(mv.abs(), 6, RoundingMode.HALF_UP);
                realizedMv = pvRestant.negate();
                saving     = pvRestant.multiply(taxRate).setScale(2, RoundingMode.HALF_UP);
                pvRestant  = ZERO;
            } else {
                // Vendre tout
                sellQty    = units;
                realizedMv = mv;
                saving     = mv.abs().multiply(taxRate).setScale(2, RoundingMode.HALF_UP);
                pvRestant  = pvRestant.subtract(mv.abs());
            }

            candidates.add(new TaxLossCandidateDto(
                    pg.pos().getId(),
                    pg.pos().getLabel(),
                    pg.pos().getPartner(),
                    pg.pos().getCategory(),
                    envelope(pg.pos()),
                    units.setScale(6, RoundingMode.HALF_UP),
                    mv.setScale(2, RoundingMode.HALF_UP),
                    sellQty.setScale(6, RoundingMode.HALF_UP),
                    realizedMv.setScale(2, RoundingMode.HALF_UP),
                    saving
            ));
        }
        return candidates;
    }

    // ── Récapitulatif des cessions CTO ────────────────────────

    /**
     * Retourne la liste de toutes les cessions BOURSE/CTO de l'année N,
     * avec le coût d'acquisition (CMP) et la plus/moins-value réalisée par ligne.
     * Inclut les positions ACTIVE et CLOSED (le tout est de l'historique).
     */
    public CtoCessionsSummaryDto getCtoCessions(User user, int year) {
        // Toutes les positions BOURSE avec enveloppe éligible (actives + clôturées)
        List<Position> positions = positionRepository.findByUserOrderByCreatedAtDesc(user)
                .stream()
                .filter(p -> p.getCategory() == AssetCategory.BOURSE && CTO_ELIGIBLE.contains(envelope(p)))
                .toList();

        if (positions.isEmpty()) {
            return new CtoCessionsSummaryDto(year, List.of(), ZERO, ZERO, ZERO);
        }

        Map<Long, List<PositionOrder>> ordersByPos = batchLoadOrders(positions);

        // Calculer les cessions par position puis fusionner et trier par date
        List<CtoCessionDto> allCessions = new ArrayList<>();
        for (Position pos : positions) {
            List<PositionOrder> orders = ordersByPos.getOrDefault(pos.getId(), List.of());
            allCessions.addAll(computeCessionsForPosition(pos, orders, year));
        }
        allCessions.sort(Comparator.comparing(CtoCessionDto::cessionDate));

        // Calcul du running total
        List<CtoCessionDto> withRunning = new ArrayList<>();
        BigDecimal running = ZERO;
        for (CtoCessionDto c : allCessions) {
            running = running.add(c.capitalGainEur());
            withRunning.add(new CtoCessionDto(
                    c.positionId(), c.positionLabel(), c.partner(),
                    c.cessionDate(), c.quantity(),
                    c.sellAmountEur(), c.costBasisEur(), c.capitalGainEur(),
                    running.setScale(2, RoundingMode.HALF_UP)
            ));
        }

        BigDecimal net = running;
        BigDecimal case3VG = net.max(ZERO).setScale(2, RoundingMode.HALF_UP);
        BigDecimal case3VH = net.min(ZERO).abs().setScale(2, RoundingMode.HALF_UP);

        return new CtoCessionsSummaryDto(year, withRunning, net.setScale(2, RoundingMode.HALF_UP), case3VG, case3VH);
    }

    private List<CtoCessionDto> computeCessionsForPosition(Position pos, List<PositionOrder> orders, int year) {
        BigDecimal totalQty  = ZERO;
        BigDecimal totalCost = ZERO;
        List<CtoCessionDto> cessions = new ArrayList<>();

        for (PositionOrder order : orders) {
            if (order.getQuantity() == null) continue;

            if (order.getOrderType() == OrderType.BUY
                    || order.getOrderType() == OrderType.AIRDROP
                    || order.getOrderType() == OrderType.ABONDEMENT) {
                totalQty  = totalQty.add(order.getQuantity());
                totalCost = totalCost.add(order.getAmountEur());
            } else if (order.getOrderType() == OrderType.SELL
                    && order.getOrderDate().getYear() == year
                    && totalQty.compareTo(ZERO) > 0) {
                BigDecimal avgCost   = totalCost.divide(totalQty, 10, RoundingMode.HALF_UP);
                BigDecimal costBasis = order.getQuantity().multiply(avgCost).setScale(2, RoundingMode.HALF_UP);
                BigDecimal pv        = order.getAmountEur().subtract(costBasis).setScale(2, RoundingMode.HALF_UP);

                cessions.add(new CtoCessionDto(
                        pos.getId(),
                        pos.getLabel(),
                        pos.getPartner(),
                        order.getOrderDate(),
                        order.getQuantity().setScale(6, RoundingMode.HALF_UP),
                        order.getAmountEur().setScale(2, RoundingMode.HALF_UP),
                        costBasis,
                        pv,
                        ZERO // running total calculé ensuite
                ));

                // Mise à jour du stock résiduel
                BigDecimal remainQty = totalQty.subtract(order.getQuantity()).max(ZERO);
                totalCost = remainQty.compareTo(ZERO) == 0 ? ZERO : remainQty.multiply(avgCost);
                totalQty  = remainQty;
            } else if (order.getOrderType() == OrderType.SELL && totalQty.compareTo(ZERO) > 0) {
                // SELL hors année cible : mettre à jour le stock quand même
                BigDecimal avgCost   = totalCost.divide(totalQty, 10, RoundingMode.HALF_UP);
                BigDecimal remainQty = totalQty.subtract(order.getQuantity()).max(ZERO);
                totalCost = remainQty.compareTo(ZERO) == 0 ? ZERO : remainQty.multiply(avgCost);
                totalQty  = remainQty;
            }
        }
        return cessions;
    }

    /** Génère le CSV pré-formaté pour la déclaration 2042C (cases 3VG/3VH). */
    public String exportCtoCessionsCsv(User user, int year) {
        CtoCessionsSummaryDto summary = getCtoCessions(user, year);
        StringBuilder sb = new StringBuilder();
        sb.append("Date de cession,Position,Intermédiaire,Quantité,Produit de cession (€),Coût d'acquisition CMP (€),Plus/Moins-value (€),Cumul (€)\n");

        for (CtoCessionDto c : summary.cessions()) {
            sb.append(c.cessionDate()).append(",")
              .append(escape(c.positionLabel())).append(",")
              .append(escape(c.partner() != null ? c.partner() : "")).append(",")
              .append(c.quantity()).append(",")
              .append(c.sellAmountEur()).append(",")
              .append(c.costBasisEur()).append(",")
              .append(c.capitalGainEur()).append(",")
              .append(c.runningTotalEur()).append("\n");
        }

        sb.append("\n");
        sb.append("NET IMPOSABLE,,,,,,").append(summary.netCapitalGainEur()).append(",\n");
        if (summary.case3VG().compareTo(ZERO) > 0) {
            sb.append("→ Case 3VG (gains imposables),,,,,,").append(summary.case3VG()).append(",\n");
        }
        if (summary.case3VH().compareTo(ZERO) > 0) {
            sb.append("→ Case 3VH (pertes reportables),,,,,,").append(summary.case3VH()).append(",\n");
        }

        return sb.toString();
    }

    private String escape(String s) {
        if (s == null) return "";
        return s.contains(",") ? "\"" + s.replace("\"", "\"\"") + "\"" : s;
    }

    // ── Helpers ────────────────────────────────────────────────

    private Map<Long, List<PositionOrder>> batchLoadOrders(List<Position> positions) {
        if (positions.isEmpty()) return Map.of();
        Map<Long, List<PositionOrder>> map = new LinkedHashMap<>();
        positionOrderRepository.findByPositionInOrderByOrderDateAsc(positions)
                .forEach(o -> map.computeIfAbsent(o.getPosition().getId(), k -> new ArrayList<>()).add(o));
        return map;
    }

    private Map<String, BigDecimal> loadExchangeRates() {
        Map<String, BigDecimal> rates = new HashMap<>();
        rates.put("EUR", BigDecimal.ONE);
        exchangeRateRepository.findAll().forEach(r -> rates.put(r.getCurrency(), r.getRate()));
        return rates;
    }

    private FiscalEnvelope envelope(Position p) {
        return p.getFiscalEnvelope() != null ? p.getFiscalEnvelope() : FiscalEnvelope.NONE;
    }

    private BasketAnalysisDto emptyBasket(String label) {
        return new BasketAnalysisDto(label, ZERO, ZERO, ZERO, ZERO, ZERO, ZERO, List.of());
    }
}
