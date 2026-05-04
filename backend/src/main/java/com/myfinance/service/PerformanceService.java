package com.myfinance.service;

import com.myfinance.domain.*;
import com.myfinance.dto.MonthlyBreakdownDto;
import com.myfinance.dto.PerformanceDto;
import com.myfinance.repository.PositionOrderRepository;
import com.myfinance.repository.PositionRepository;
import com.myfinance.service.math.ModifiedDietzCalculator;
import com.myfinance.service.math.ModifiedDietzCalculator.Cashflow;
import com.myfinance.service.math.XirrSolver;
import com.myfinance.service.math.XirrSolver.CashflowPoint;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Calcul de la performance patrimoniale globale (TWR + MWR).
 *
 * Stratégie anti N+1 : tous les historiques (prix, taux, snapshots, ordres)
 * sont chargés en batch au début du calcul et transmis par référence à ValuationService.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PerformanceService {

    private static final ZoneId PARIS = ZoneId.of("Europe/Paris");

    /** Catégories incluses dans le calcul de performance. */
    private static final Set<AssetCategory> ELIGIBLE_CATEGORIES = Set.of(
            AssetCategory.BOURSE, AssetCategory.CRYPTO,
            AssetCategory.LIVRET
            // IMMO_PAPIER provisoirement exclu — calcul en cours de stabilisation (bug effectiveFrom)
    );

    private final PositionRepository              positionRepository;
    private final PositionOrderRepository         orderRepository;
    private final InstrumentPriceHistoryService   priceHistoryService;
    private final ExchangeRateHistoryService      rateHistoryService;
    private final ValuationService                valuationService;

    // ── Point d'entrée ────────────────────────────────────────────────────────

    public PerformanceDto computeGlobal(User user) {
        long t0 = System.currentTimeMillis();
        log.info("[user:{}] Calcul performance démarré", user.getId());

        LocalDate today = LocalDate.now(PARIS);
        List<String> warnings = new ArrayList<>();

        // 1 — Positions éligibles (toutes statuts — CLOSED inclus pour historique)
        List<Position> positions = positionRepository.findByUserOrderByCreatedAtDesc(user)
                .stream()
                .filter(p -> ELIGIBLE_CATEGORIES.contains(p.getCategory()))
                .toList();

        if (positions.isEmpty()) {
            warnings.add("Aucune position éligible au calcul (BOURSE, CRYPTO, LIVRET, IMMO_PAPIER requise)");
            return emptyResult(today, warnings);
        }

        // 2 — Ordres en batch (évite N+1 sur position.getOrders())
        List<PositionOrder> allOrders = orderRepository.findByPositionInOrderByOrderDateAsc(positions);

        // Injection des ordres dans les positions (évite les lazy loads ultérieurs)
        Map<Long, List<PositionOrder>> ordersByPosition = allOrders.stream()
                .collect(Collectors.groupingBy(o -> o.getPosition().getId()));
        for (Position pos : positions) {
            pos.getOrders().clear();
            pos.getOrders().addAll(ordersByPosition.getOrDefault(pos.getId(), List.of()));
        }

        // 3 — Date de début et instruments / devises
        Optional<LocalDate> firstOrderDateOpt = allOrders.stream()
                .map(PositionOrder::getOrderDate)
                .min(Comparator.naturalOrder());

        if (firstOrderDateOpt.isEmpty()) {
            warnings.add("Aucun ordre trouvé pour les positions éligibles");
            return emptyResult(today, warnings);
        }
        LocalDate firstOrderDate = firstOrderDateOpt.get();

        // Batch range : inclut le mois précédant le premier versement pour V_début
        LocalDate batchFrom = firstOrderDate.withDayOfMonth(1).minusMonths(2);
        LocalDate batchTo   = today;

        // Instruments BOURSE/CRYPTO
        List<Instrument> instruments = positions.stream()
                .filter(p -> p.getInstrument() != null)
                .map(Position::getInstrument)
                .distinct()
                .toList();

        // Devises
        List<String> currencies = positions.stream()
                .map(Position::getCurrency)
                .filter(c -> c != null && !"EUR".equalsIgnoreCase(c))
                .distinct()
                .toList();

        // 4 — Chargement batch prix et taux → NavigableMap pour floor lookup
        Map<Long, NavigableMap<LocalDate, BigDecimal>> priceMap = buildPriceMap(instruments, batchFrom, batchTo);
        Map<String, NavigableMap<LocalDate, BigDecimal>> rateMap = buildRateMap(currencies, batchFrom, batchTo);

        // Snapshots IMMO_PAPIER
        List<Position> immoPapier = positions.stream()
                .filter(p -> p.getCategory() == AssetCategory.IMMO_PAPIER)
                .toList();
        Map<Long, NavigableMap<LocalDate, BigDecimal>> snapshotMap =
                valuationService.loadSnapshotBatch(immoPapier);

        // 5 — Chaînage TWR mois par mois
        // Règle métier #8 : le mois du premier versement est exclu (V_début = 0)
        LocalDate firstChainingMonth = firstOrderDate.withDayOfMonth(1).plusMonths(1);
        if (firstChainingMonth.isAfter(today)) {
            warnings.add("Période trop courte : le premier versement date de ce mois — chaînage TWR impossible");
            return emptyResult(today, warnings);
        }

        warnings.add(String.format(
                "Mois de %s exclu du chaînage TWR : c'est le mois du premier versement (V_début = 0, formule instable).",
                firstOrderDate.withDayOfMonth(1).toString().substring(0, 7)));

        List<MonthlyBreakdownDto> breakdown = new ArrayList<>();
        List<Double> monthlyReturns = new ArrayList<>();

        // Totaux + flux XIRR calculés sur TOUS les ordres (y compris le mois exclu du TWR)
        // Le MWR doit inclure le premier versement même si ce mois est exclu du chaînage TWR.
        BigDecimal totalInvested  = BigDecimal.ZERO;
        BigDecimal totalDividends = BigDecimal.ZERO;
        Map<LocalDate, Double> xirrByDate = new TreeMap<>();
        for (PositionOrder order : allOrders) {
            double amtEur = order.getAmountEur() != null
                    ? order.getAmountEur().doubleValue()
                    : order.getAmount().doubleValue();
            switch (order.getOrderType()) {
                case BUY, DEPOSIT, ABONDEMENT  -> {
                    totalInvested = totalInvested.add(BigDecimal.valueOf(amtEur));
                    xirrByDate.merge(order.getOrderDate(), -amtEur, Double::sum); // sortie de poche = négatif
                }
                case SELL, WITHDRAWAL -> {
                    totalInvested = totalInvested.subtract(BigDecimal.valueOf(amtEur));
                    xirrByDate.merge(order.getOrderDate(),  amtEur, Double::sum); // entrée de poche = positif
                }
                case INTEREST, DIVIDEND, AIRDROP -> totalDividends = totalDividends.add(BigDecimal.valueOf(amtEur));
                default -> { /* pas de flux */ }
            }
        }
        List<CashflowPoint> xirrFlows = new ArrayList<>();
        for (Map.Entry<LocalDate, Double> e : xirrByDate.entrySet()) {
            xirrFlows.add(new CashflowPoint(e.getKey(), e.getValue()));
        }

        LocalDate monthStart = firstChainingMonth;
        while (!monthStart.isAfter(today.withDayOfMonth(1))) {
            boolean partial = monthStart.equals(today.withDayOfMonth(1));
            LocalDate monthEnd = partial ? today : monthStart.with(TemporalAdjusters.lastDayOfMonth());
            LocalDate prevMonthEnd = monthStart.minusDays(1);
            int daysInMonth = partial ? today.getDayOfMonth() : monthStart.lengthOfMonth();

            // V_début et V_fin
            BigDecimal vDebutBD = valuationService.valuePortfolioAt(
                    positions, prevMonthEnd, priceMap, rateMap, snapshotMap, warnings);
            BigDecimal vFinBD = valuationService.valuePortfolioAt(
                    positions, monthEnd, priceMap, rateMap, snapshotMap, warnings);

            double vDebut = vDebutBD != null ? vDebutBD.doubleValue() : 0;
            double vFin   = vFinBD   != null ? vFinBD.doubleValue()   : 0;

            // Flux externes du mois nettés par date (BUY/DEPOSIT/SELL/WITHDRAWAL/ABONDEMENT)
            Map<LocalDate, Double> externalByDate = new TreeMap<>();

            for (PositionOrder order : allOrders) {
                LocalDate d = order.getOrderDate();
                if (d.isBefore(monthStart) || d.isAfter(monthEnd)) continue;

                double amtEur = order.getAmountEur() != null
                        ? order.getAmountEur().doubleValue()
                        : order.getAmount().doubleValue();

                switch (order.getOrderType()) {
                    case BUY, DEPOSIT, ABONDEMENT -> externalByDate.merge(d,  amtEur, Double::sum);
                    case SELL, WITHDRAWAL         -> externalByDate.merge(d, -amtEur, Double::sum);
                    default -> { /* INTEREST/DIVIDEND/AIRDROP : gains internes, déjà comptés */ }
                }
            }

            // Liste des cashflows Modified Dietz (flux du mois uniquement)
            List<Cashflow> monthCashflows = new ArrayList<>();
            double fNet = 0;
            for (Map.Entry<LocalDate, Double> e : externalByDate.entrySet()) {
                int day = e.getKey().getDayOfMonth();
                monthCashflows.add(new Cashflow(day, e.getValue()));
                fNet += e.getValue();
            }

            // Calcul R_m
            Double rm = ModifiedDietzCalculator.subPeriodReturn(vDebut, vFin, monthCashflows, daysInMonth);
            String monthLabel = monthStart.toString().substring(0, 7);

            if (rm == null) {
                log.warn("[user:{}] Mois {} : dénominateur ≤ 0 — sous-période exclue", user.getId(), monthLabel);
                warnings.add("Mois " + monthLabel + " exclu : retrait total détecté (dénominateur ≤ 0)");
                breakdown.add(MonthlyBreakdownDto.excluded(monthLabel,
                        "Retrait total détecté (dénominateur ≤ 0)"));
            } else if (vDebut == 0 && vFin == 0 && fNet == 0) {
                // Mois sans activité ni valeur
                breakdown.add(MonthlyBreakdownDto.excluded(monthLabel,
                        "Aucune position active ni cashflow"));
            } else {
                log.debug("[user:{}] Mois {} : V_début={}, V_fin={}, F_net={}, R_m={}",
                        user.getId(), monthLabel, vDebut, vFin, fNet, rm);
                monthlyReturns.add(rm);

                double weightedFlows = 0;
                for (Cashflow c : monthCashflows) {
                    weightedFlows += (double)(daysInMonth - c.dayOfMonth()) / daysInMonth * c.amountEur();
                }

                breakdown.add(MonthlyBreakdownDto.included(monthLabel,
                        BigDecimal.valueOf(vDebut).setScale(2, RoundingMode.HALF_UP),
                        BigDecimal.valueOf(vFin).setScale(2, RoundingMode.HALF_UP),
                        BigDecimal.valueOf(fNet).setScale(2, RoundingMode.HALF_UP),
                        BigDecimal.valueOf(weightedFlows).setScale(2, RoundingMode.HALF_UP),
                        rm, partial));
            }

            monthStart = monthStart.plusMonths(1);
        }

        if (monthlyReturns.isEmpty()) {
            warnings.add("Aucun mois inclus dans le chaînage TWR — TWR non calculable");
        }

        // 6 — TWR annualisé
        Double twrAnnualized = null;
        if (!monthlyReturns.isEmpty()) {
            double twrTotal = ModifiedDietzCalculator.chainReturns(monthlyReturns);
            long totalDays  = ChronoUnit.DAYS.between(firstChainingMonth.minusDays(1), today);
            twrAnnualized   = ModifiedDietzCalculator.annualize(twrTotal, totalDays);
        }

        // 7 — MWR (XIRR) : ajouter la liquidation virtuelle
        BigDecimal currentValue = valuationService.valuePortfolioAt(
                positions, today, priceMap, rateMap, snapshotMap, warnings);
        if (currentValue == null) currentValue = BigDecimal.ZERO;
        xirrFlows.add(new CashflowPoint(today, currentValue.doubleValue()));

        Double mwrAnnualized = null;
        if (xirrFlows.size() >= 2) {
            mwrAnnualized = XirrSolver.solve(xirrFlows);
            if (mwrAnnualized == null) {
                String msg = "MWR (XIRR) non convergent — les cashflows ne permettent pas de trouver un taux";
                warnings.add(msg);
                log.warn("[user:{}] {}", user.getId(), msg);
            }
        }

        // 8 — Métriques résumé
        BigDecimal absoluteGain = currentValue.subtract(totalInvested);
        LocalDate from = firstChainingMonth;
        double durationYears = ChronoUnit.DAYS.between(from, today) / 365.25;

        // 9 — Cap warnings : 20 maximum pour éviter une UI illisible
        final int MAX_WARNINGS = 20;
        List<String> finalWarnings = warnings;
        if (warnings.size() > MAX_WARNINGS) {
            finalWarnings = new ArrayList<>(warnings.subList(0, MAX_WARNINGS));
            finalWarnings.add(String.format(
                    "… et %d autres avertissements non affichés (données manquantes — backfill recommandé).",
                    warnings.size() - MAX_WARNINGS));
        }

        long durationMs = System.currentTimeMillis() - t0;
        log.info("[user:{}] Calcul performance terminé en {} ms — TWR={}, MWR={}, période=[{} → {}], {} warning(s)",
                user.getId(), durationMs, twrAnnualized, mwrAnnualized, from, today, finalWarnings.size());

        return new PerformanceDto(
                Instant.now(),
                from, today,
                Math.max(0, durationYears),
                twrAnnualized,
                mwrAnnualized,
                totalInvested.setScale(2, RoundingMode.HALF_UP),
                currentValue.setScale(2, RoundingMode.HALF_UP),
                absoluteGain.setScale(2, RoundingMode.HALF_UP),
                totalDividends.setScale(2, RoundingMode.HALF_UP),
                finalWarnings,
                breakdown
        );
    }

    // ── Helpers batch ─────────────────────────────────────────────────────────

    private Map<Long, NavigableMap<LocalDate, BigDecimal>> buildPriceMap(
            List<Instrument> instruments, LocalDate from, LocalDate to) {
        if (instruments.isEmpty()) return Map.of();
        Map<Long, NavigableMap<LocalDate, BigDecimal>> result = new HashMap<>();
        Map<String, BigDecimal> flat = priceHistoryService.loadPriceBatch(instruments, from, to);
        for (Map.Entry<String, BigDecimal> e : flat.entrySet()) {
            // clé format : "instrumentId|YYYY-MM-DD"
            String[] parts = e.getKey().split("\\|");
            Long instrumentId = Long.parseLong(parts[0]);
            LocalDate date = LocalDate.parse(parts[1]);
            result.computeIfAbsent(instrumentId, k -> new TreeMap<>()).put(date, e.getValue());
        }
        return result;
    }

    private Map<String, NavigableMap<LocalDate, BigDecimal>> buildRateMap(
            List<String> currencies, LocalDate from, LocalDate to) {
        if (currencies.isEmpty()) return Map.of();
        Map<String, NavigableMap<LocalDate, BigDecimal>> result = new HashMap<>();
        Map<String, BigDecimal> flat = rateHistoryService.loadRateBatch(currencies, from, to);
        for (Map.Entry<String, BigDecimal> e : flat.entrySet()) {
            // clé format : "CURRENCY|YYYY-MM-DD"
            String[] parts = e.getKey().split("\\|");
            String currency = parts[0];
            LocalDate date  = LocalDate.parse(parts[1]);
            result.computeIfAbsent(currency, k -> new TreeMap<>()).put(date, e.getValue());
        }
        return result;
    }

    private PerformanceDto emptyResult(LocalDate today, List<String> warnings) {
        return new PerformanceDto(
                Instant.now(), today, today, 0,
                null, null,
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                warnings, List.of()
        );
    }
}
