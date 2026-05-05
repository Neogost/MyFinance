package com.myfinance.service;

import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.CryptoOperationTypeEnum;
import com.myfinance.domain.Instrument;
import com.myfinance.domain.PositionOrder;
import com.myfinance.domain.User;
import com.myfinance.dto.ConfirmCryptoHistoryRequest;
import com.myfinance.dto.CryptoCessionDto;
import com.myfinance.dto.CryptoTaxStateDto;
import com.myfinance.dto.CryptoTaxSummaryDto;
import com.myfinance.repository.ExchangeRateHistoryRepository;
import com.myfinance.repository.InstrumentPriceHistoryRepository;
import com.myfinance.repository.PositionOrderRepository;
import com.myfinance.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class CryptoTaxService {

    private static final BigDecimal SEUIL_305 = new BigDecimal("305");
    private static final BigDecimal PFU_RATE  = new BigDecimal("0.30");
    private static final BigDecimal PS_RATE   = new BigDecimal("0.172");
    private static final MathContext MC        = new MathContext(10, RoundingMode.HALF_UP);

    private final PositionOrderRepository           positionOrderRepository;
    private final InstrumentPriceHistoryRepository  priceHistoryRepository;
    private final ExchangeRateHistoryRepository     exchangeRateHistoryRepository;
    private final UserRepository                    userRepository;

    // ── État courant ────────────────────────────────────────────

    public CryptoTaxStateDto getState(User user) {
        List<PositionOrder> allOrders = loadCryptoOrders(user);
        List<String> warnings = new ArrayList<>();

        BigDecimal pta = runAlgorithm(allOrders, null, null, warnings).pta();
        Map<Instrument, BigDecimal> quantities = computeQuantitiesUntil(allOrders, null);
        BigDecimal portfolioValue = computeVgpAt(quantities, LocalDate.now(), warnings);

        LocalDate firstDate = allOrders.isEmpty() ? null : allOrders.get(0).getOrderDate();
        return new CryptoTaxStateDto(
                pta.setScale(2, RoundingMode.HALF_UP),
                portfolioValue.setScale(2, RoundingMode.HALF_UP),
                firstDate,
                allOrders.size(),
                user.isCryptoHistoricalDataConfirmed()
        );
    }

    // ── Synthèse annuelle ───────────────────────────────────────

    public CryptoTaxSummaryDto getSummary(User user, int year, String taxOption, Float tmi) {
        List<PositionOrder> allOrders = loadCryptoOrders(user);
        List<String> warnings = new ArrayList<>();

        LocalDate yearStart = LocalDate.of(year, 1, 1);
        LocalDate yearEnd   = LocalDate.of(year, 12, 31);

        BigDecimal ptaAtYearStart = runAlgorithm(allOrders, yearStart.minusDays(1), null, warnings).pta();

        AlgoResult result = runAlgorithm(allOrders, yearEnd, year, warnings);

        BigDecimal totalCessions   = result.totalCessions();
        BigDecimal totalPlusValue  = result.totalPlusValue();
        BigDecimal totalMoinsValue = result.totalMoinsValue();
        BigDecimal ptaAtYearEnd    = result.pta();
        int cessionsCount          = result.cessionsCount();

        BigDecimal plusValueNette = totalPlusValue.subtract(totalMoinsValue).max(BigDecimal.ZERO);

        boolean exempt             = totalCessions.compareTo(SEUIL_305) <= 0;
        boolean declarationRequired = !exempt && plusValueNette.compareTo(BigDecimal.ZERO) > 0;

        BigDecimal estimatedTax = BigDecimal.ZERO;
        if (!exempt) {
            if ("BAREME".equalsIgnoreCase(taxOption) && tmi != null) {
                BigDecimal tmiRate = BigDecimal.valueOf(tmi).divide(BigDecimal.valueOf(100), MC);
                estimatedTax = plusValueNette.multiply(tmiRate.add(PS_RATE), MC);
            } else {
                estimatedTax = plusValueNette.multiply(PFU_RATE, MC);
            }
        }

        return new CryptoTaxSummaryDto(
                year,
                ptaAtYearStart.setScale(2, RoundingMode.HALF_UP),
                ptaAtYearEnd.setScale(2, RoundingMode.HALF_UP),
                totalCessions.setScale(2, RoundingMode.HALF_UP),
                totalPlusValue.setScale(2, RoundingMode.HALF_UP),
                totalMoinsValue.setScale(2, RoundingMode.HALF_UP),
                plusValueNette.setScale(2, RoundingMode.HALF_UP),
                exempt,
                declarationRequired,
                "BAREME".equalsIgnoreCase(taxOption) ? "BAREME" : "PFU",
                tmi,
                estimatedTax.setScale(2, RoundingMode.HALF_UP),
                cessionsCount,
                warnings
        );
    }

    // ── Détail des cessions (format 2086) ──────────────────────

    public List<CryptoCessionDto> getCessions(User user, int year) {
        List<PositionOrder> allOrders = loadCryptoOrders(user);
        List<String> warnings = new ArrayList<>();
        List<CryptoCessionDto> result = new ArrayList<>();

        LocalDate yearStart = LocalDate.of(year, 1, 1);
        LocalDate yearEnd   = LocalDate.of(year, 12, 31);
        BigDecimal pta = runAlgorithm(allOrders, yearStart.minusDays(1), null, warnings).pta();
        Map<Instrument, BigDecimal> quantities = computeQuantitiesUntil(allOrders, yearStart.minusDays(1));

        for (PositionOrder order : allOrders) {
            if (order.getOrderDate().isBefore(yearStart)) continue;  // déjà dans la map
            if (order.getOrderDate().isAfter(yearEnd)) break;

            boolean isSellFiat = order.getCryptoOperationType() == CryptoOperationTypeEnum.SELL_FIAT;

            if (!isSellFiat) {
                // Ordres non-cession : mise à jour directe des quantités
                updateQuantities(quantities, order);
                continue;
            }

            // SELL_FIAT : calculer la VGP AVANT de soustraire la quantité vendue
            BigDecimal pc        = order.getAmountEur();
            BigDecimal ptaBefore = pta;
            BigDecimal vgp       = resolveVgp(order, quantities, warnings);
            boolean manualOverride = order.getPortfolioValueAtDateEur() != null;

            // Soustraction après le calcul de la VGP
            subtractQty(quantities, order);

            BigDecimal pv;
            BigDecimal ptaAfter;
            if (vgp == null || vgp.compareTo(BigDecimal.ZERO) <= 0) {
                pv       = null;
                ptaAfter = pta;
            } else {
                BigDecimal ptaShare = pta.multiply(pc, MC).divide(vgp, MC);
                pv       = pc.subtract(ptaShare);
                ptaAfter = pta.subtract(ptaShare);
                pta      = ptaAfter;
            }

            result.add(new CryptoCessionDto(
                    order.getId(),
                    order.getOrderDate(),
                    instrumentLabel(order),
                    order.getAmount(),
                    pc.setScale(2, RoundingMode.HALF_UP),
                    ptaBefore.setScale(2, RoundingMode.HALF_UP),
                    vgp != null ? vgp.setScale(2, RoundingMode.HALF_UP) : null,
                    manualOverride,
                    pv != null ? pv.setScale(2, RoundingMode.HALF_UP) : null,
                    ptaAfter.setScale(2, RoundingMode.HALF_UP),
                    order.getNotes()
            ));
        }
        return result;
    }

    // ── Export CSV ──────────────────────────────────────────────

    public String exportCsv(User user, int year) {
        List<CryptoCessionDto> cessions = getCessions(user, year);
        StringBuilder sb = new StringBuilder();
        sb.append("N°,Date de cession,Valeur portefeuille (VGP),Prix de cession (PC),Prix total acquisition (PTA),Plus-value,Notes\n");

        BigDecimal totalPc = BigDecimal.ZERO;
        BigDecimal totalPv = BigDecimal.ZERO;
        int n = 1;

        for (CryptoCessionDto c : cessions) {
            sb.append(n++).append(",")
              .append(c.cessionDate()).append(",")
              .append(c.vgpEur() != null ? c.vgpEur() : "").append(",")
              .append(c.prixDeCessionEur()).append(",")
              .append(c.ptaAvantCession()).append(",")
              .append(c.plusValueEur() != null ? c.plusValueEur() : "").append(",")
              .append(c.notes() != null ? c.notes().replace(",", ";") : "").append("\n");

            totalPc = totalPc.add(c.prixDeCessionEur());
            if (c.plusValueEur() != null) totalPv = totalPv.add(c.plusValueEur());
        }

        sb.append("TOTAL,,,")
          .append(totalPc.setScale(2, RoundingMode.HALF_UP)).append(",,")
          .append(totalPv.setScale(2, RoundingMode.HALF_UP)).append(",\n");

        return sb.toString();
    }

    // ── Confirmation historique ─────────────────────────────────

    public void confirmHistoricalData(User user, ConfirmCryptoHistoryRequest request) {
        user.setCryptoHistoricalDataConfirmed(request.confirmed());
        userRepository.save(user);
    }

    // ── Algorithme principal (record interne) ───────────────────

    private record AlgoResult(
            BigDecimal pta,
            BigDecimal totalCessions,
            BigDecimal totalPlusValue,
            BigDecimal totalMoinsValue,
            int cessionsCount
    ) {}

    /**
     * Rejoue tous les ordres jusqu'à {@code until} (inclus).
     * Si {@code filterYear} est non null, ne comptabilise les cessions que pour cette année.
     */
    private AlgoResult runAlgorithm(List<PositionOrder> orders, LocalDate until,
                                    Integer filterYear, List<String> warnings) {
        BigDecimal pta             = BigDecimal.ZERO;
        BigDecimal totalCessions   = BigDecimal.ZERO;
        BigDecimal totalPlusValue  = BigDecimal.ZERO;
        BigDecimal totalMoinsValue = BigDecimal.ZERO;
        int cessionsCount          = 0;

        Map<Instrument, BigDecimal> quantities = new LinkedHashMap<>();

        for (PositionOrder order : orders) {
            if (until != null && order.getOrderDate().isAfter(until)) break;

            switch (order.getCryptoOperationType()) {
                case BUY_FIAT -> {
                    pta = pta.add(order.getAmountEur());
                    addQty(quantities, order);
                }
                case SELL_FIAT -> {
                    // Mettre à jour les quantités AVANT de calculer la VGP
                    // (la position vendue compte encore dans le portefeuille au moment de la cession)
                    BigDecimal pc  = order.getAmountEur();
                    BigDecimal vgp = resolveVgp(order, quantities, warnings);

                    if (vgp != null && vgp.compareTo(BigDecimal.ZERO) > 0) {
                        BigDecimal ptaShare = pta.multiply(pc, MC).divide(vgp, MC);
                        BigDecimal pv = pc.subtract(ptaShare);

                        boolean inFilter = filterYear == null || order.getOrderDate().getYear() == filterYear;
                        if (inFilter) {
                            if (pv.compareTo(BigDecimal.ZERO) >= 0) totalPlusValue  = totalPlusValue.add(pv);
                            else                                     totalMoinsValue = totalMoinsValue.add(pv.abs());
                            totalCessions = totalCessions.add(pc);
                            cessionsCount++;
                        }
                        pta = pta.subtract(ptaShare);
                    } else {
                        warnings.add("VGP non calculable pour la cession du " + order.getOrderDate() +
                                     " (" + instrumentLabel(order) + ") — cession ignorée.");
                    }
                    subtractQty(quantities, order);
                }
                case SWAP_OUT, TRANSFER_OUT -> subtractQty(quantities, order);
                case SWAP_IN,  TRANSFER_IN  -> addQty(quantities, order);
            }
        }

        return new AlgoResult(pta.max(BigDecimal.ZERO), totalCessions, totalPlusValue, totalMoinsValue, cessionsCount);
    }

    // ── Calcul VGP ──────────────────────────────────────────────

    private BigDecimal resolveVgp(PositionOrder order, Map<Instrument, BigDecimal> quantities,
                                  List<String> warnings) {
        if (order.getPortfolioValueAtDateEur() != null) {
            return order.getPortfolioValueAtDateEur();
        }
        return computeVgpAt(quantities, order.getOrderDate(), warnings);
    }

    private BigDecimal computeVgpAt(Map<Instrument, BigDecimal> quantities,
                                    LocalDate date, List<String> warnings) {
        BigDecimal vgp = BigDecimal.ZERO;
        for (Map.Entry<Instrument, BigDecimal> entry : quantities.entrySet()) {
            Instrument instr = entry.getKey();
            BigDecimal qty   = entry.getValue();
            if (qty == null || qty.compareTo(BigDecimal.ZERO) <= 0) continue;
            if (instr == null) continue;

            var priceOpt = priceHistoryRepository
                    .findTopByInstrumentAndPriceDateLessThanEqualOrderByPriceDateDesc(instr, date);

            if (priceOpt.isEmpty()) {
                if (warnings != null) {
                    warnings.add("Cours indisponible pour " + instr.getName() + " au " + date + " — VGP partielle.");
                }
                continue;
            }

            BigDecimal priceEur = convertToEur(priceOpt.get().getPrice(), instr, date, warnings);
            vgp = vgp.add(qty.multiply(priceEur, MC));
        }
        return vgp;
    }

    private BigDecimal convertToEur(BigDecimal price, Instrument instrument,
                                    LocalDate date, List<String> warnings) {
        if (instrument == null || "EUR".equals(instrument.getCurrency())) return price;
        String currency = instrument.getCurrency();
        var rateOpt = exchangeRateHistoryRepository
                .findTopByCurrencyAndRateDateLessThanEqualOrderByRateDateDesc(currency, date);
        if (rateOpt.isEmpty()) {
            if (warnings != null) {
                warnings.add("Taux " + currency + "/EUR indisponible au " + date + " — prix non converti.");
            }
            return price;
        }
        BigDecimal rate = rateOpt.get().getRate();
        return rate.compareTo(BigDecimal.ZERO) > 0 ? price.divide(rate, MC) : price;
    }

    // ── Suivi des quantités ─────────────────────────────────────

    private Map<Instrument, BigDecimal> computeQuantitiesUntil(List<PositionOrder> orders, LocalDate until) {
        Map<Instrument, BigDecimal> quantities = new LinkedHashMap<>();
        for (PositionOrder order : orders) {
            if (until != null && order.getOrderDate().isAfter(until)) break;
            updateQuantities(quantities, order);
        }
        return quantities;
    }

    private void updateQuantities(Map<Instrument, BigDecimal> quantities, PositionOrder order) {
        switch (order.getCryptoOperationType()) {
            case BUY_FIAT, SWAP_IN, TRANSFER_IN   -> addQty(quantities, order);
            case SELL_FIAT, SWAP_OUT, TRANSFER_OUT -> subtractQty(quantities, order);
        }
    }

    private void addQty(Map<Instrument, BigDecimal> quantities, PositionOrder order) {
        Instrument instr = instrument(order);
        if (instr == null || order.getAmount() == null) return;
        quantities.merge(instr, order.getAmount(), BigDecimal::add);
    }

    private void subtractQty(Map<Instrument, BigDecimal> quantities, PositionOrder order) {
        Instrument instr = instrument(order);
        if (instr == null || order.getAmount() == null) return;
        quantities.merge(instr, order.getAmount().negate(), BigDecimal::add);
    }

    // ── Helpers ─────────────────────────────────────────────────

    private List<PositionOrder> loadCryptoOrders(User user) {
        return positionOrderRepository.findCryptoOperationsByUserOrderByDateAsc(user, AssetCategory.CRYPTO);
    }

    private Instrument instrument(PositionOrder order) {
        if (order.getPosition() == null) return null;
        return order.getPosition().getInstrument();
    }

    private String instrumentLabel(PositionOrder order) {
        if (order.getPosition() == null) return "Inconnu";
        if (order.getPosition().getInstrument() != null) {
            return order.getPosition().getInstrument().getName();
        }
        return order.getPosition().getLabel();
    }
}
