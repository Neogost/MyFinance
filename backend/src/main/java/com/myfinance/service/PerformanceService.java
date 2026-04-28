package com.myfinance.service;

import com.myfinance.domain.*;
import com.myfinance.dto.*;
import com.myfinance.repository.*;
import com.myfinance.service.math.TwrChainer;
import com.myfinance.service.math.XirrSolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PerformanceService {

    private final PositionRepository            positionRepository;
    private final PositionOrderRepository       positionOrderRepository;
    private final PortfolioSnapshotRepository   portfolioSnapshotRepository;
    private final PositionService               positionService;

    /** Catégories incluses dans les calculs de performance */
    private static final Set<AssetCategory> INCLUDED = EnumSet.of(
            AssetCategory.BOURSE, AssetCategory.CRYPTO,
            AssetCategory.IMMO_PAPIER, AssetCategory.LIVRET);

    /** Flux entrants dans la position (argent investi) */
    private static final Set<OrderType> INFLOWS = EnumSet.of(
            OrderType.BUY, OrderType.DEPOSIT, OrderType.ABONDEMENT);

    /** Flux sortants de la position (argent retiré) */
    private static final Set<OrderType> OUTFLOWS = EnumSet.of(
            OrderType.SELL, OrderType.WITHDRAWAL);

    /** Gains internes (ne rompent pas les sous-périodes TWR) */
    private static final Set<OrderType> INTERNAL_GAINS = EnumSet.of(
            OrderType.INTEREST, OrderType.DIVIDEND, OrderType.AIRDROP);

    // ─────────────────────────────────────────────────────────────────
    // API publique
    // ─────────────────────────────────────────────────────────────────

    public PerformanceDto computeGlobal(User user, LocalDate from, LocalDate to, Double benchmarkRate) {
        List<Position> positions = loadIncludedPositions(user);
        if (positions.isEmpty()) return emptyPerformance(from, to, benchmarkRate, "Aucune position éligible");

        List<PositionOrder> allOrders = positionOrderRepository.findByPositionInOrderByOrderDateAsc(positions);
        if (allOrders.isEmpty()) return emptyPerformance(from, to, benchmarkRate, "Aucun ordre enregistré");

        LocalDate effectiveFrom = from != null ? from : allOrders.get(0).getOrderDate();
        LocalDate effectiveTo   = to   != null ? to   : LocalDate.now();

        List<PositionOrder> filteredOrders = filterOrders(allOrders, effectiveFrom, effectiveTo);

        // Valeur actuelle agrégée sur les catégories incluses
        List<PositionDto> positionDtos = positionService.findAllByUser(user, null, PositionStatus.ACTIVE);
        BigDecimal currentValue = positionDtos.stream()
                .filter(p -> INCLUDED.contains(p.category()) && p.computed() != null
                        && p.computed().currentValueEur() != null)
                .map(p -> p.computed().currentValueEur())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Calculs agrégés
        BigDecimal invested = sumInflows(filteredOrders);
        BigDecimal dividends = sumInternalGains(filteredOrders);

        // Snapshots (chargés avant le MWR pour pouvoir calculer la valeur d'ouverture)
        List<PortfolioSnapshot> snapshots = portfolioSnapshotRepository
                .findByUserWithPositionsOrderBySnapshotDateAsc(user);

        // Valeur d'ouverture pour le MWR en période restreinte :
        // le portefeuille avait déjà une valeur en début de période → flux initial du XIRR
        BigDecimal openingValue = (from != null)
                ? findAggregateOpeningValue(snapshots, effectiveFrom)
                : null;
        Double mwr = computeMwr(filteredOrders, currentValue, effectiveTo, openingValue, effectiveFrom);

        List<TwrChainer.SnapshotPoint>    snapshotPoints = buildAggregateSnapshotSeries(snapshots, effectiveFrom, effectiveTo);
        List<TwrChainer.ExternalCashflow> cashflows      = buildExternalCashflows(filteredOrders);

        TwrChainer.TwrResult twrResult = TwrChainer.compute(
                snapshotPoints, cashflows, effectiveTo, currentValue.doubleValue());

        Double twr = twrResult != null ? twrResult.twrAnnualized() : null;

        // Série temporelle avec benchmark
        List<PerformanceDto.DataPoint> series = buildTimeSeries(twrResult, benchmarkRate, effectiveFrom);

        // Calcul par catégorie
        List<CategoryPerformanceDto> categories = computeCategories(
                user, positions, allOrders, snapshots, positionDtos, effectiveFrom, effectiveTo);

        String warning = buildWarning(snapshotPoints, twrResult);

        // En période restreinte : gain = currentValue − openingValue − versements_nets_période
        // En période Globale   : gain = currentValue − versements_nets_total
        BigDecimal gain = (openingValue != null && openingValue.compareTo(BigDecimal.ZERO) > 0)
                ? currentValue.subtract(openingValue).subtract(invested)
                : currentValue.subtract(invested);

        LocalDate firstSnapshotDate = snapshotPoints.isEmpty() ? null : snapshotPoints.get(0).date();

        return new PerformanceDto(
                effectiveFrom, effectiveTo,
                durationYears(effectiveFrom, effectiveTo),
                firstSnapshotDate,
                openingValue,
                twr, mwr,
                invested, currentValue, gain, dividends,
                benchmarkRate,
                (twr != null && benchmarkRate != null) ? twr - benchmarkRate / 100.0 : null,
                warning, series, categories);
    }

    public List<PositionPerformanceDto> computePositions(User user, LocalDate from, LocalDate to) {
        List<Position> positions = loadIncludedPositions(user);
        if (positions.isEmpty()) return List.of();

        List<PositionDto> dtos = positionService.findAllByUser(user, null, null);
        Map<Long, BigDecimal> currentValueById = dtos.stream()
                .filter(p -> p.computed() != null && p.computed().currentValueEur() != null)
                .collect(Collectors.toMap(PositionDto::id, p -> p.computed().currentValueEur()));

        List<PortfolioSnapshot> snapshots = portfolioSnapshotRepository
                .findByUserWithPositionsOrderBySnapshotDateAsc(user);

        List<PositionPerformanceDto> result = new ArrayList<>();

        for (Position pos : positions) {
            List<PositionOrder> orders = positionOrderRepository
                    .findByPositionOrderByOrderDateDesc(pos).stream()
                    .sorted(Comparator.comparing(PositionOrder::getOrderDate))
                    .toList();
            if (orders.isEmpty()) continue;

            LocalDate effectiveFrom = from != null ? from : orders.get(0).getOrderDate();
            LocalDate effectiveTo   = to   != null ? to   : LocalDate.now();
            List<PositionOrder> filtered = filterOrders(orders, effectiveFrom, effectiveTo);
            if (filtered.isEmpty()) continue;

            BigDecimal currentValue = currentValueById.getOrDefault(pos.getId(), BigDecimal.ZERO);
            BigDecimal invested     = sumInflows(filtered);
            BigDecimal posOpening   = (from != null)
                    ? findPositionOpeningValue(snapshots, pos, from)
                    : null;
            BigDecimal gain = (posOpening != null && posOpening.compareTo(BigDecimal.ZERO) > 0)
                    ? currentValue.subtract(posOpening).subtract(invested)
                    : currentValue.subtract(invested);
            Double mwr = computeMwr(filtered, currentValue, effectiveTo, posOpening, effectiveFrom);

            List<TwrChainer.SnapshotPoint>    snapshotPts = buildPositionSnapshotSeries(snapshots, pos, effectiveFrom, effectiveTo);
            List<TwrChainer.ExternalCashflow> cashflows   = buildExternalCashflows(filtered);
            TwrChainer.TwrResult twrResult = TwrChainer.compute(
                    snapshotPts, cashflows, effectiveTo, currentValue.doubleValue());
            Double twr = twrResult != null ? twrResult.twrAnnualized() : null;

            result.add(new PositionPerformanceDto(
                    pos.getId(), pos.getLabel(), pos.getCategory(), pos.getStatus(),
                    twr, mwr, invested, currentValue, gain));
        }

        result.sort(Comparator.comparing(p -> p.twrAnnualized() == null ? -Double.MAX_VALUE : -p.twrAnnualized()));
        return result;
    }

    public PositionPerformanceDto computePosition(Long positionId, User user, LocalDate from, LocalDate to) {
        Position pos = positionRepository.findById(positionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Position introuvable"));

        if (!pos.getUser().getId().equals(user.getId()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès non autorisé");

        if (!INCLUDED.contains(pos.getCategory()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Catégorie non éligible au calcul de performance : " + pos.getCategory());

        List<PositionOrder> orders = positionOrderRepository
                .findByPositionOrderByOrderDateDesc(pos).stream()
                .sorted(Comparator.comparing(PositionOrder::getOrderDate))
                .toList();

        LocalDate effectiveFrom = from != null ? from : (orders.isEmpty() ? LocalDate.now() : orders.get(0).getOrderDate());
        LocalDate effectiveTo   = to   != null ? to   : LocalDate.now();
        List<PositionOrder> filtered = filterOrders(orders, effectiveFrom, effectiveTo);

        List<PositionDto> dtos = positionService.findAllByUser(user, null, PositionStatus.ACTIVE);
        BigDecimal currentValue = dtos.stream()
                .filter(p -> p.id().equals(positionId) && p.computed() != null && p.computed().currentValueEur() != null)
                .map(p -> p.computed().currentValueEur())
                .findFirst().orElse(BigDecimal.ZERO);

        BigDecimal invested = sumInflows(filtered);

        List<PortfolioSnapshot> snapshots = portfolioSnapshotRepository
                .findByUserWithPositionsOrderBySnapshotDateAsc(user);

        BigDecimal posOpening = (from != null)
                ? findPositionOpeningValue(snapshots, pos, effectiveFrom)
                : null;
        BigDecimal gain = (posOpening != null && posOpening.compareTo(BigDecimal.ZERO) > 0)
                ? currentValue.subtract(posOpening).subtract(invested)
                : currentValue.subtract(invested);
        Double mwr = computeMwr(filtered, currentValue, effectiveTo, posOpening, effectiveFrom);

        List<TwrChainer.SnapshotPoint>    snapshotPts = buildPositionSnapshotSeries(snapshots, pos, effectiveFrom, effectiveTo);
        List<TwrChainer.ExternalCashflow> cashflows   = buildExternalCashflows(filtered);
        TwrChainer.TwrResult twrResult = TwrChainer.compute(
                snapshotPts, cashflows, effectiveTo, currentValue.doubleValue());
        Double twr = twrResult != null ? twrResult.twrAnnualized() : null;

        return new PositionPerformanceDto(
                pos.getId(), pos.getLabel(), pos.getCategory(), pos.getStatus(),
                twr, mwr, invested, currentValue, gain);
    }

    // ─────────────────────────────────────────────────────────────────
    // Calculs par catégorie
    // ─────────────────────────────────────────────────────────────────

    private List<CategoryPerformanceDto> computeCategories(
            User user,
            List<Position> positions,
            List<PositionOrder> allOrders,
            List<PortfolioSnapshot> snapshots,
            List<PositionDto> positionDtos,
            LocalDate from, LocalDate to) {

        Map<AssetCategory, List<Position>> byCategory = positions.stream()
                .collect(Collectors.groupingBy(Position::getCategory));

        return byCategory.entrySet().stream()
                .map(entry -> {
                    AssetCategory cat = entry.getKey();
                    List<Position> catPositions = entry.getValue();
                    Set<Long> catIds = catPositions.stream().map(Position::getId).collect(Collectors.toSet());

                    List<PositionOrder> catOrders = allOrders.stream()
                            .filter(o -> catIds.contains(o.getPosition().getId()))
                            .toList();
                    List<PositionOrder> filtered = filterOrders(catOrders, from, to);

                    BigDecimal currentValue = positionDtos.stream()
                            .filter(p -> p.category() == cat && INCLUDED.contains(p.category())
                                    && p.computed() != null && p.computed().currentValueEur() != null)
                            .map(p -> p.computed().currentValueEur())
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    BigDecimal invested  = sumInflows(filtered);
                    BigDecimal dividends = sumInternalGains(filtered);
                    BigDecimal catOpening = (from != null)
                            ? findCategoryOpeningValue(snapshots, cat, from)
                            : null;
                    BigDecimal gain = (catOpening != null && catOpening.compareTo(BigDecimal.ZERO) > 0)
                            ? currentValue.subtract(catOpening).subtract(invested)
                            : currentValue.subtract(invested);
                    Double mwr = computeMwr(filtered, currentValue, to, catOpening, from);

                    List<TwrChainer.SnapshotPoint> snapshotPts =
                            buildCategorySnapshotSeries(snapshots, cat, from, to);
                    List<TwrChainer.ExternalCashflow> cashflows = buildExternalCashflows(filtered);
                    TwrChainer.TwrResult twrResult = TwrChainer.compute(
                            snapshotPts, cashflows, to, currentValue.doubleValue());
                    Double twr = twrResult != null ? twrResult.twrAnnualized() : null;

                    return new CategoryPerformanceDto(cat, twr, mwr, invested, currentValue, gain, dividends);
                })
                .sorted(Comparator.comparing(c -> c.category().name()))
                .toList();
    }

    // ─────────────────────────────────────────────────────────────────
    // Helpers — chargement
    // ─────────────────────────────────────────────────────────────────

    private List<Position> loadIncludedPositions(User user) {
        return positionRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .filter(p -> INCLUDED.contains(p.getCategory()))
                .toList();
    }

    private List<PositionOrder> filterOrders(List<PositionOrder> orders, LocalDate from, LocalDate to) {
        return orders.stream()
                .filter(o -> !o.getOrderDate().isBefore(from) && !o.getOrderDate().isAfter(to))
                .toList();
    }

    // ─────────────────────────────────────────────────────────────────
    // Helpers — cashflows XIRR
    // ─────────────────────────────────────────────────────────────────

    /**
     * MWR sans valeur d'ouverture — utilisé pour la période Globale (portfolio vide au départ).
     */
    private Double computeMwr(List<PositionOrder> orders, BigDecimal currentValue, LocalDate endDate) {
        return computeMwr(orders, currentValue, endDate, null, null);
    }

    /**
     * MWR avec valeur d'ouverture — utilisé pour les périodes restreintes (YTD, 1 an, 3 ans…).
     * Le portefeuille avait déjà une valeur en début de période : elle est injectée comme flux
     * initial négatif dans le XIRR pour ne pas biaiser le taux.
     */
    private Double computeMwr(List<PositionOrder> orders, BigDecimal currentValue,
                               LocalDate endDate, BigDecimal openingValue, LocalDate openingDate) {
        List<XirrSolver.Cashflow> cashflows = new ArrayList<>();

        // Valeur d'ouverture = "argent mis dans le portefeuille" au début de la période
        if (openingValue != null && openingValue.compareTo(BigDecimal.ZERO) > 0 && openingDate != null) {
            cashflows.add(new XirrSolver.Cashflow(openingDate, -openingValue.doubleValue()));
        }

        for (PositionOrder o : orders) {
            if (o.getAmountEur() == null) continue;
            double amount = o.getAmountEur().doubleValue();
            if (INFLOWS.contains(o.getOrderType()))       cashflows.add(new XirrSolver.Cashflow(o.getOrderDate(), -amount));
            else if (OUTFLOWS.contains(o.getOrderType())) cashflows.add(new XirrSolver.Cashflow(o.getOrderDate(), +amount));
        }
        if (cashflows.isEmpty()) return null;
        cashflows.add(new XirrSolver.Cashflow(endDate, currentValue.doubleValue()));
        cashflows.sort(Comparator.comparing(XirrSolver.Cashflow::date));
        return XirrSolver.solve(cashflows);
    }

    // ── Valeurs d'ouverture depuis les snapshots ───────────────────────

    /** Valeur agrégée (toutes catégories incluses) du portefeuille au snapshot le plus proche avant `date`. */
    private BigDecimal findAggregateOpeningValue(List<PortfolioSnapshot> snapshots, LocalDate date) {
        return snapshots.stream()
                .filter(s -> !s.getSnapshotDate().isAfter(date))
                .max(Comparator.comparing(PortfolioSnapshot::getSnapshotDate))
                .map(s -> s.getPositionSnapshots().stream()
                        .filter(ps -> ps.getPosition() != null && INCLUDED.contains(ps.getPosition().getCategory())
                                && ps.getCurrentValueEur() != null)
                        .map(ps -> ps.getCurrentValueEur())
                        .reduce(BigDecimal.ZERO, BigDecimal::add))
                .orElse(null);
    }

    /** Valeur d'une catégorie au snapshot le plus proche avant `date`. */
    private BigDecimal findCategoryOpeningValue(List<PortfolioSnapshot> snapshots,
                                                 AssetCategory category, LocalDate date) {
        return snapshots.stream()
                .filter(s -> !s.getSnapshotDate().isAfter(date))
                .max(Comparator.comparing(PortfolioSnapshot::getSnapshotDate))
                .map(s -> s.getPositionSnapshots().stream()
                        .filter(ps -> ps.getPosition() != null
                                && ps.getPosition().getCategory() == category
                                && ps.getCurrentValueEur() != null)
                        .map(ps -> ps.getCurrentValueEur())
                        .reduce(BigDecimal.ZERO, BigDecimal::add))
                .orElse(null);
    }

    /** Valeur d'une position spécifique au snapshot le plus proche avant `date`. */
    private BigDecimal findPositionOpeningValue(List<PortfolioSnapshot> snapshots,
                                                 Position pos, LocalDate date) {
        return snapshots.stream()
                .filter(s -> !s.getSnapshotDate().isAfter(date))
                .max(Comparator.comparing(PortfolioSnapshot::getSnapshotDate))
                .flatMap(s -> s.getPositionSnapshots().stream()
                        .filter(ps -> ps.getPosition() != null
                                && ps.getPosition().getId().equals(pos.getId())
                                && ps.getCurrentValueEur() != null)
                        .map(ps -> ps.getCurrentValueEur())
                        .findFirst())
                .orElse(null);
    }

    private List<TwrChainer.ExternalCashflow> buildExternalCashflows(List<PositionOrder> orders) {
        return orders.stream()
                .filter(o -> o.getAmountEur() != null)
                .filter(o -> INFLOWS.contains(o.getOrderType()) || OUTFLOWS.contains(o.getOrderType()))
                .map(o -> {
                    double sign = INFLOWS.contains(o.getOrderType()) ? 1.0 : -1.0;
                    return new TwrChainer.ExternalCashflow(o.getOrderDate(), sign * o.getAmountEur().doubleValue());
                })
                .toList();
    }

    // ─────────────────────────────────────────────────────────────────
    // Helpers — snapshots TWR
    // ─────────────────────────────────────────────────────────────────

    private List<TwrChainer.SnapshotPoint> buildAggregateSnapshotSeries(
            List<PortfolioSnapshot> snapshots, LocalDate from, LocalDate to) {

        return snapshots.stream()
                .filter(s -> !s.getSnapshotDate().isBefore(from) && !s.getSnapshotDate().isAfter(to))
                .map(s -> {
                    double total = s.getPositionSnapshots().stream()
                            .filter(ps -> ps.getPosition() != null && INCLUDED.contains(ps.getPosition().getCategory()))
                            .mapToDouble(ps -> ps.getCurrentValueEur() != null
                                    ? ps.getCurrentValueEur().doubleValue() : 0.0)
                            .sum();
                    return new TwrChainer.SnapshotPoint(s.getSnapshotDate(), total);
                })
                .filter(sp -> sp.valueEur() > 0)
                .sorted(Comparator.comparing(TwrChainer.SnapshotPoint::date))
                .toList();
    }

    private List<TwrChainer.SnapshotPoint> buildCategorySnapshotSeries(
            List<PortfolioSnapshot> snapshots, AssetCategory category, LocalDate from, LocalDate to) {

        return snapshots.stream()
                .filter(s -> !s.getSnapshotDate().isBefore(from) && !s.getSnapshotDate().isAfter(to))
                .map(s -> {
                    double total = s.getPositionSnapshots().stream()
                            .filter(ps -> ps.getPosition() != null
                                    && ps.getPosition().getCategory() == category)
                            .mapToDouble(ps -> ps.getCurrentValueEur() != null
                                    ? ps.getCurrentValueEur().doubleValue() : 0.0)
                            .sum();
                    return new TwrChainer.SnapshotPoint(s.getSnapshotDate(), total);
                })
                .filter(sp -> sp.valueEur() > 0)
                .sorted(Comparator.comparing(TwrChainer.SnapshotPoint::date))
                .toList();
    }

    private List<TwrChainer.SnapshotPoint> buildPositionSnapshotSeries(
            List<PortfolioSnapshot> snapshots, Position pos, LocalDate from, LocalDate to) {

        return snapshots.stream()
                .filter(s -> !s.getSnapshotDate().isBefore(from) && !s.getSnapshotDate().isAfter(to))
                .flatMap(s -> s.getPositionSnapshots().stream()
                        .filter(ps -> ps.getPosition() != null && ps.getPosition().getId().equals(pos.getId()))
                        .map(ps -> new TwrChainer.SnapshotPoint(
                                s.getSnapshotDate(),
                                ps.getCurrentValueEur() != null ? ps.getCurrentValueEur().doubleValue() : 0.0)))
                .filter(sp -> sp.valueEur() > 0)
                .sorted(Comparator.comparing(TwrChainer.SnapshotPoint::date))
                .toList();
    }

    // ─────────────────────────────────────────────────────────────────
    // Helpers — agrégations
    // ─────────────────────────────────────────────────────────────────

    private BigDecimal sumInflows(List<PositionOrder> orders) {
        return orders.stream()
                .filter(o -> INFLOWS.contains(o.getOrderType()) && o.getAmountEur() != null)
                .map(PositionOrder::getAmountEur)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .subtract(
                        orders.stream()
                                .filter(o -> OUTFLOWS.contains(o.getOrderType()) && o.getAmountEur() != null)
                                .map(PositionOrder::getAmountEur)
                                .reduce(BigDecimal.ZERO, BigDecimal::add));
    }

    private BigDecimal sumInternalGains(List<PositionOrder> orders) {
        return orders.stream()
                .filter(o -> INTERNAL_GAINS.contains(o.getOrderType()) && o.getAmountEur() != null)
                .map(PositionOrder::getAmountEur)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // ─────────────────────────────────────────────────────────────────
    // Helpers — série temporelle et warning
    // ─────────────────────────────────────────────────────────────────

    private List<PerformanceDto.DataPoint> buildTimeSeries(
            TwrChainer.TwrResult twrResult, Double benchmarkRate, LocalDate from) {

        if (twrResult == null) return List.of();
        return twrResult.timeSeries().stream()
                .map(dp -> {
                    Double bench = null;
                    if (benchmarkRate != null) {
                        long days = ChronoUnit.DAYS.between(from, dp.date());
                        bench = Math.pow(1 + benchmarkRate / 100.0, days / 365.0) - 1.0;
                    }
                    return new PerformanceDto.DataPoint(dp.date(), dp.cumulativeReturn(), bench);
                })
                .toList();
    }

    private String buildWarning(List<TwrChainer.SnapshotPoint> snapshots, TwrChainer.TwrResult twr) {
        if (twr == null && snapshots.isEmpty())
            return "Aucun relevé de patrimoine disponible — seul le MWR peut être calculé";
        if (snapshots.size() < 3)
            return "Performance estimée — moins de 3 relevés disponibles sur la période";
        return null;
    }

    private PerformanceDto emptyPerformance(LocalDate from, LocalDate to, Double benchmarkRate, String warning) {
        LocalDate f = from != null ? from : LocalDate.now();
        LocalDate t = to   != null ? to   : LocalDate.now();
        return new PerformanceDto(f, t, 0, null, null, null, null,
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                benchmarkRate, null, warning, List.of(), List.of());
    }

    private double durationYears(LocalDate from, LocalDate to) {
        return BigDecimal.valueOf(ChronoUnit.DAYS.between(from, to))
                .divide(BigDecimal.valueOf(365), 2, RoundingMode.HALF_UP)
                .doubleValue();
    }
}
