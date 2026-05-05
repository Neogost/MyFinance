package com.myfinance.service;

import com.myfinance.domain.*;
import com.myfinance.dto.CategoryPerformanceDto;
import com.myfinance.dto.MonthlyBreakdownDto;
import com.myfinance.dto.PerformanceDto;
import com.myfinance.dto.PositionPerformanceDto;
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
 * Calcul de la performance patrimoniale globale et par catégorie (TWR + MWR).
 *
 * Stratégie anti N+1 : les historiques (prix, taux, snapshots, ordres) sont chargés
 * en batch une seule fois, puis réutilisés pour le calcul global ET par catégorie.
 *
 * Deux modes :
 *  - Global (requestedFrom=null) : depuis le premier ordre, règle "skip mois 1" (V_début=0).
 *  - Période restreinte (requestedFrom postérieur au premier ordre) : snapshot d'ouverture
 *    synthétique à openingDate (= dernier jour du mois précédant la période).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PerformanceService {

    private static final ZoneId PARIS = ZoneId.of("Europe/Paris");

    private static final List<AssetCategory> ELIGIBLE_CATEGORIES = List.of(
            AssetCategory.BOURSE, AssetCategory.CRYPTO, AssetCategory.LIVRET
            // IMMO_PAPIER provisoirement exclu
    );

    private final PositionRepository              positionRepository;
    private final PositionOrderRepository         orderRepository;
    private final InstrumentPriceHistoryService   priceHistoryService;
    private final ExchangeRateHistoryService      rateHistoryService;
    private final ValuationService                valuationService;

    // ── Résultat intermédiaire d'un calcul de tranche (global ou catégorie) ───

    /** Taux sans risque utilisé pour le ratio de Sharpe (Livret A 3 %). */
    private static final double RISK_FREE_RATE = 0.03;

    private record SliceResult(
            LocalDate firstChainingMonth,
            Double twrAnnualized,
            Double mwrAnnualized,
            Double volatilityAnnualized,
            Double sharpeRatio,
            BigDecimal currentValue,
            BigDecimal totalInvested,
            BigDecimal totalDividends,
            List<MonthlyBreakdownDto> breakdown
    ) {}

    // ── Point d'entrée ────────────────────────────────────────────────────────

    /**
     * @param requestedFrom date de début (null = Global depuis le premier ordre)
     * @param requestedTo   date de fin   (null = aujourd'hui)
     */
    public PerformanceDto computeGlobal(User user, LocalDate requestedFrom, LocalDate requestedTo) {
        long t0 = System.currentTimeMillis();
        log.info("[user:{}] Calcul performance démarré", user.getId());

        LocalDate today       = LocalDate.now(PARIS);
        LocalDate effectiveTo = (requestedTo != null && requestedTo.isBefore(today)) ? requestedTo : today;
        List<String> warnings = new ArrayList<>();

        // 1 — Positions éligibles (toutes statuts — CLOSED inclus pour historique)
        List<Position> positions = positionRepository.findByUserOrderByCreatedAtDesc(user)
                .stream()
                .filter(p -> ELIGIBLE_CATEGORIES.contains(p.getCategory()))
                .toList();

        if (positions.isEmpty()) {
            warnings.add("Aucune position éligible au calcul (BOURSE, CRYPTO, LIVRET, IMMO_PAPIER requise)");
            return emptyResult(effectiveTo, warnings);
        }

        // 2 — Ordres en batch
        List<PositionOrder> allOrders = orderRepository.findByPositionInOrderByOrderDateAsc(positions);

        Map<Long, List<PositionOrder>> ordersByPosition = allOrders.stream()
                .collect(Collectors.groupingBy(o -> o.getPosition().getId()));
        for (Position pos : positions) {
            pos.getOrders().clear();
            pos.getOrders().addAll(ordersByPosition.getOrDefault(pos.getId(), List.of()));
        }

        if (allOrders.isEmpty()) {
            warnings.add("Aucun ordre trouvé pour les positions éligibles");
            return emptyResult(effectiveTo, warnings);
        }

        // 3 — Chargement batch prix / taux (depuis le début de l'historique, une seule fois)
        LocalDate firstOrderDateGlobal = allOrders.stream()
                .map(PositionOrder::getOrderDate).min(Comparator.naturalOrder()).orElse(effectiveTo);
        LocalDate batchFrom = firstOrderDateGlobal.withDayOfMonth(1).minusMonths(2);

        List<Instrument> instruments = positions.stream()
                .filter(p -> p.getInstrument() != null).map(Position::getInstrument)
                .distinct().toList();
        List<String> currencies = positions.stream()
                .map(Position::getCurrency)
                .filter(c -> c != null && !"EUR".equalsIgnoreCase(c))
                .distinct().toList();

        Map<Long, NavigableMap<LocalDate, BigDecimal>> priceMap    = buildPriceMap(instruments, batchFrom, effectiveTo);
        Map<String, NavigableMap<LocalDate, BigDecimal>> rateMap   = buildRateMap(currencies, batchFrom, effectiveTo);
        Map<Long, NavigableMap<LocalDate, BigDecimal>> snapshotMap =
                valuationService.loadSnapshotBatch(
                        positions.stream().filter(p -> p.getCategory() == AssetCategory.IMMO_PAPIER).toList());

        // 4 — Calcul global (toutes positions)
        SliceResult global = computeSlice(positions, allOrders, requestedFrom, effectiveTo,
                priceMap, rateMap, snapshotMap, warnings);

        if (global.firstChainingMonth() == null) {
            // La tranche globale a retourné un résultat vide (période trop courte, etc.)
            return emptyResult(effectiveTo, warnings);
        }

        // 5 — Calcul par catégorie (réutilise les mêmes batch maps)
        List<CategoryPerformanceDto> byCategory = new ArrayList<>();
        for (AssetCategory catEnum : ELIGIBLE_CATEGORIES) {
            Set<Long> catIds = positions.stream()
                    .filter(p -> p.getCategory() == catEnum)
                    .map(Position::getId)
                    .collect(Collectors.toSet());
            if (catIds.isEmpty()) continue;

            List<Position> catPositions = positions.stream()
                    .filter(p -> catIds.contains(p.getId())).toList();
            List<PositionOrder> catOrders = allOrders.stream()
                    .filter(o -> catIds.contains(o.getPosition().getId())).toList();

            List<String> catWarnings = new ArrayList<>(); // warnings locaux, non remontés globalement
            SliceResult catResult = computeSlice(catPositions, catOrders, requestedFrom, effectiveTo,
                    priceMap, rateMap, snapshotMap, catWarnings);

            if (catResult.firstChainingMonth() == null) continue; // pas de données exploitables

            BigDecimal absGain = catResult.currentValue().subtract(catResult.totalInvested())
                    .setScale(2, RoundingMode.HALF_UP);
            byCategory.add(new CategoryPerformanceDto(
                    catEnum.name(),
                    catResult.twrAnnualized(),
                    catResult.mwrAnnualized(),
                    catResult.volatilityAnnualized(),
                    catResult.sharpeRatio(),
                    catResult.currentValue().setScale(2, RoundingMode.HALF_UP),
                    catResult.totalInvested().setScale(2, RoundingMode.HALF_UP),
                    absGain,
                    catResult.totalDividends().setScale(2, RoundingMode.HALF_UP)
            ));
        }

        // 6 — Calcul par position, trié par partenaire puis par label
        List<PositionPerformanceDto> byPosition = new ArrayList<>();
        for (Position pos : positions) {
            List<PositionOrder> posOrders = pos.getOrders(); // déjà injectés en mémoire
            if (posOrders.isEmpty()) continue;

            List<String> posWarnings = new ArrayList<>();    // warnings locaux, non remontés
            SliceResult posResult = computeSlice(List.of(pos), posOrders, requestedFrom, effectiveTo,
                    priceMap, rateMap, snapshotMap, posWarnings);

            if (posResult.firstChainingMonth() == null) continue;

            BigDecimal posGain = posResult.currentValue().subtract(posResult.totalInvested())
                    .setScale(2, RoundingMode.HALF_UP);
            byPosition.add(new PositionPerformanceDto(
                    pos.getId(),
                    pos.getLabel(),
                    pos.getCategory().name(),
                    pos.getPartner(),
                    pos.getCurrency(),
                    posResult.twrAnnualized(),
                    posResult.mwrAnnualized(),
                    posResult.currentValue().setScale(2, RoundingMode.HALF_UP),
                    posResult.totalInvested().setScale(2, RoundingMode.HALF_UP),
                    posGain,
                    posResult.totalDividends().setScale(2, RoundingMode.HALF_UP)
            ));
        }
        // Tri : partenaire alphabétique (null en dernier), puis label
        byPosition.sort(Comparator
                .comparing((PositionPerformanceDto p) -> p.partner() != null ? p.partner() : "￿",
                        String.CASE_INSENSITIVE_ORDER)
                .thenComparing(PositionPerformanceDto::label, String.CASE_INSENSITIVE_ORDER));

        // 7 — Cap warnings à 20
        final int MAX_WARNINGS = 20;
        List<String> finalWarnings = warnings;
        if (warnings.size() > MAX_WARNINGS) {
            finalWarnings = new ArrayList<>(warnings.subList(0, MAX_WARNINGS));
            finalWarnings.add(String.format(
                    "… et %d autres avertissements non affichés (données manquantes — backfill recommandé).",
                    warnings.size() - MAX_WARNINGS));
        }

        BigDecimal absoluteGain = global.currentValue().subtract(global.totalInvested());
        double durationYears = ChronoUnit.DAYS.between(global.firstChainingMonth(), effectiveTo) / 365.25;

        long durationMs = System.currentTimeMillis() - t0;
        log.info("[user:{}] Calcul performance terminé en {} ms — TWR={}, MWR={}, période=[{} → {}], {} warning(s), {} catégorie(s), {} position(s)",
                user.getId(), durationMs, global.twrAnnualized(), global.mwrAnnualized(),
                global.firstChainingMonth(), effectiveTo, finalWarnings.size(), byCategory.size(), byPosition.size());

        return new PerformanceDto(
                Instant.now(),
                global.firstChainingMonth(), effectiveTo,
                Math.max(0, durationYears),
                global.twrAnnualized(),
                global.mwrAnnualized(),
                global.volatilityAnnualized(),
                global.sharpeRatio(),
                global.totalInvested().setScale(2, RoundingMode.HALF_UP),
                global.currentValue().setScale(2, RoundingMode.HALF_UP),
                absoluteGain.setScale(2, RoundingMode.HALF_UP),
                global.totalDividends().setScale(2, RoundingMode.HALF_UP),
                finalWarnings,
                global.breakdown(),
                byCategory,
                byPosition
        );
    }

    // ── Calcul d'une tranche (global ou catégorie) ────────────────────────────

    /**
     * Calcule TWR + MWR pour un sous-ensemble de positions, en réutilisant les batch maps déjà chargés.
     * Retourne un SliceResult avec firstChainingMonth=null si la période est inexploitable.
     */
    private SliceResult computeSlice(
            List<Position> positions,
            List<PositionOrder> orders,   // triés par date, filtrés sur ces positions
            LocalDate requestedFrom,
            LocalDate effectiveTo,
            Map<Long, NavigableMap<LocalDate, BigDecimal>> priceMap,
            Map<String, NavigableMap<LocalDate, BigDecimal>> rateMap,
            Map<Long, NavigableMap<LocalDate, BigDecimal>> snapshotMap,
            List<String> warnings) {

        if (positions.isEmpty() || orders.isEmpty()) return emptySlice();

        // Date du premier ordre pour cette tranche
        LocalDate firstOrderDate = orders.stream()
                .map(PositionOrder::getOrderDate).min(Comparator.naturalOrder()).orElse(effectiveTo);

        // Mode et bornes
        boolean isGlobal = requestedFrom == null || !requestedFrom.isAfter(firstOrderDate);
        LocalDate firstChainingMonth;
        LocalDate openingDate;

        if (isGlobal) {
            firstChainingMonth = firstOrderDate.withDayOfMonth(1).plusMonths(1);
            openingDate = firstChainingMonth.minusDays(1);
            if (firstChainingMonth.isAfter(effectiveTo)) return emptySlice();
            warnings.add(String.format(
                    "Mois de %s exclu du chaînage TWR : c'est le mois du premier versement (V_début = 0, formule instable).",
                    firstOrderDate.withDayOfMonth(1).toString().substring(0, 7)));
        } else {
            firstChainingMonth = requestedFrom.withDayOfMonth(1);
            openingDate = firstChainingMonth.minusDays(1);
            if (firstChainingMonth.isAfter(effectiveTo)) return emptySlice();
        }

        // Snapshot d'ouverture (mode restreint)
        BigDecimal openingValue = BigDecimal.ZERO;
        if (!isGlobal) {
            BigDecimal ov = valuationService.valuePortfolioAt(
                    positions, openingDate, priceMap, rateMap, snapshotMap, warnings);
            openingValue = ov != null ? ov : BigDecimal.ZERO;
        }

        // Totaux + flux XIRR
        BigDecimal totalInvested  = isGlobal ? BigDecimal.ZERO : openingValue;
        BigDecimal totalDividends = BigDecimal.ZERO;
        Map<LocalDate, Double> xirrByDate = new TreeMap<>();

        if (isGlobal) {
            for (PositionOrder order : orders) {
                if (order.getOrderDate().isAfter(effectiveTo)) continue;
                double amt = amtEur(order);
                switch (order.getOrderType()) {
                    case BUY, DEPOSIT, ABONDEMENT -> {
                        totalInvested = totalInvested.add(BigDecimal.valueOf(amt));
                        xirrByDate.merge(order.getOrderDate(), -amt, Double::sum);
                    }
                    case SELL, WITHDRAWAL -> {
                        totalInvested = totalInvested.subtract(BigDecimal.valueOf(amt));
                        xirrByDate.merge(order.getOrderDate(), amt, Double::sum);
                    }
                    case INTEREST, DIVIDEND, AIRDROP ->
                        totalDividends = totalDividends.add(BigDecimal.valueOf(amt));
                    default -> { /* pas de flux */ }
                }
            }
        } else {
            if (openingValue.compareTo(BigDecimal.ZERO) != 0) {
                xirrByDate.put(openingDate, -openingValue.doubleValue());
            }
            for (PositionOrder order : orders) {
                LocalDate d = order.getOrderDate();
                if (d.isBefore(firstChainingMonth) || d.isAfter(effectiveTo)) continue;
                double amt = amtEur(order);
                switch (order.getOrderType()) {
                    case BUY, DEPOSIT, ABONDEMENT -> {
                        totalInvested = totalInvested.add(BigDecimal.valueOf(amt));
                        xirrByDate.merge(d, -amt, Double::sum);
                    }
                    case SELL, WITHDRAWAL -> {
                        totalInvested = totalInvested.subtract(BigDecimal.valueOf(amt));
                        xirrByDate.merge(d, amt, Double::sum);
                    }
                    case INTEREST, DIVIDEND, AIRDROP ->
                        totalDividends = totalDividends.add(BigDecimal.valueOf(amt));
                    default -> { /* pas de flux */ }
                }
            }
        }

        List<CashflowPoint> xirrFlows = new ArrayList<>();
        for (Map.Entry<LocalDate, Double> e : xirrByDate.entrySet()) {
            xirrFlows.add(new CashflowPoint(e.getKey(), e.getValue()));
        }

        // Chaînage TWR mois par mois
        List<MonthlyBreakdownDto> breakdown = new ArrayList<>();
        List<Double> monthlyReturns = new ArrayList<>();
        LocalDate monthStart = firstChainingMonth;

        while (!monthStart.isAfter(effectiveTo.withDayOfMonth(1))) {
            boolean partial   = monthStart.equals(effectiveTo.withDayOfMonth(1));
            LocalDate monthEnd    = partial ? effectiveTo : monthStart.with(TemporalAdjusters.lastDayOfMonth());
            LocalDate prevMonthEnd = monthStart.minusDays(1);
            int daysInMonth   = partial ? effectiveTo.getDayOfMonth() : monthStart.lengthOfMonth();

            BigDecimal vDebutBD = (!isGlobal && monthStart.equals(firstChainingMonth))
                    ? openingValue
                    : valuationService.valuePortfolioAt(positions, prevMonthEnd, priceMap, rateMap, snapshotMap, warnings);
            BigDecimal vFinBD = valuationService.valuePortfolioAt(
                    positions, monthEnd, priceMap, rateMap, snapshotMap, warnings);

            double vDebut = vDebutBD != null ? vDebutBD.doubleValue() : 0;
            double vFin   = vFinBD   != null ? vFinBD.doubleValue()   : 0;

            Map<LocalDate, Double> externalByDate = new TreeMap<>();
            for (PositionOrder order : orders) {
                LocalDate d = order.getOrderDate();
                if (d.isBefore(monthStart) || d.isAfter(monthEnd)) continue;
                double amt = amtEur(order);
                switch (order.getOrderType()) {
                    case BUY, DEPOSIT, ABONDEMENT -> externalByDate.merge(d,  amt, Double::sum);
                    case SELL, WITHDRAWAL         -> externalByDate.merge(d, -amt, Double::sum);
                    default -> { /* gains internes */ }
                }
            }

            List<Cashflow> monthCashflows = new ArrayList<>();
            double fNet = 0;
            for (Map.Entry<LocalDate, Double> e : externalByDate.entrySet()) {
                monthCashflows.add(new Cashflow(e.getKey().getDayOfMonth(), e.getValue()));
                fNet += e.getValue();
            }

            Double rm = ModifiedDietzCalculator.subPeriodReturn(vDebut, vFin, monthCashflows, daysInMonth);
            String monthLabel = monthStart.toString().substring(0, 7);

            if (rm == null) {
                warnings.add("Mois " + monthLabel + " exclu : retrait total détecté (dénominateur ≤ 0)");
                breakdown.add(MonthlyBreakdownDto.excluded(monthLabel, "Retrait total détecté (dénominateur ≤ 0)"));
            } else if (vDebut == 0 && vFin == 0 && fNet == 0) {
                breakdown.add(MonthlyBreakdownDto.excluded(monthLabel, "Aucune position active ni cashflow"));
            } else {
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

        // TWR annualisé
        Double twrAnnualized = null;
        if (!monthlyReturns.isEmpty()) {
            double twrTotal = ModifiedDietzCalculator.chainReturns(monthlyReturns);
            long totalDays  = ChronoUnit.DAYS.between(openingDate, effectiveTo);
            twrAnnualized   = ModifiedDietzCalculator.annualize(twrTotal, totalDays);
        }

        // MWR (XIRR) + liquidation virtuelle
        BigDecimal currentValue = valuationService.valuePortfolioAt(
                positions, effectiveTo, priceMap, rateMap, snapshotMap, warnings);
        if (currentValue == null) currentValue = BigDecimal.ZERO;
        xirrFlows.add(new CashflowPoint(effectiveTo, currentValue.doubleValue()));

        Double mwrAnnualized = null;
        if (xirrFlows.size() >= 2) {
            mwrAnnualized = XirrSolver.solve(xirrFlows);
            if (mwrAnnualized == null) {
                warnings.add("MWR (XIRR) non convergent — les cashflows ne permettent pas de trouver un taux");
            }
        }

        // Volatilité annualisée + ratio de Sharpe
        Double volatility = computeVolatility(monthlyReturns);
        Double sharpe     = computeSharpe(twrAnnualized, volatility);

        return new SliceResult(firstChainingMonth, twrAnnualized, mwrAnnualized,
                volatility, sharpe, currentValue, totalInvested, totalDividends, breakdown);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Écart-type des rendements mensuels (Bessel n−1) × √12 pour annualiser.
     * Retourne null si moins de 2 mois inclus.
     */
    private static Double computeVolatility(List<Double> monthlyReturns) {
        if (monthlyReturns.size() < 2) return null;
        double mean = monthlyReturns.stream().mapToDouble(Double::doubleValue).average().orElse(0);
        double variance = monthlyReturns.stream()
                .mapToDouble(r -> (r - mean) * (r - mean))
                .sum() / (monthlyReturns.size() - 1);
        return Math.sqrt(variance) * Math.sqrt(12);
    }

    /**
     * Ratio de Sharpe = (TWR annualisé − taux sans risque) / volatilité annualisée.
     * Taux sans risque : {@link #RISK_FREE_RATE} (Livret A 3 %).
     */
    private static Double computeSharpe(Double twrAnnualized, Double volatility) {
        if (twrAnnualized == null || volatility == null || volatility == 0) return null;
        return (twrAnnualized - RISK_FREE_RATE) / volatility;
    }

    private SliceResult emptySlice() {
        return new SliceResult(null, null, null, null, null,
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, List.of());
    }

    private static double amtEur(PositionOrder order) {
        return order.getAmountEur() != null
                ? order.getAmountEur().doubleValue()
                : order.getAmount().doubleValue();
    }

    private Map<Long, NavigableMap<LocalDate, BigDecimal>> buildPriceMap(
            List<Instrument> instruments, LocalDate from, LocalDate to) {
        if (instruments.isEmpty()) return Map.of();
        Map<Long, NavigableMap<LocalDate, BigDecimal>> result = new HashMap<>();
        Map<String, BigDecimal> flat = priceHistoryService.loadPriceBatch(instruments, from, to);
        for (Map.Entry<String, BigDecimal> e : flat.entrySet()) {
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
            String[] parts = e.getKey().split("\\|");
            String currency = parts[0];
            LocalDate date  = LocalDate.parse(parts[1]);
            result.computeIfAbsent(currency, k -> new TreeMap<>()).put(date, e.getValue());
        }
        return result;
    }

    private PerformanceDto emptyResult(LocalDate to, List<String> warnings) {
        return new PerformanceDto(
                Instant.now(), to, to, 0,
                null, null, null, null,
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                warnings, List.of(), List.of(), List.of()
        );
    }
}
