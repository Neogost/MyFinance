package com.myfinance.service;

import com.myfinance.domain.Instrument;
import com.myfinance.dto.BenchmarkDto;
import com.myfinance.dto.BenchmarkDto.BenchmarkMonthDto;
import com.myfinance.service.math.ModifiedDietzCalculator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

/**
 * Calcule le TWR pur d'un instrument benchmark (sans cashflows utilisateur).
 *
 * Convention : même algorithme Modified Dietz mensuel que le portefeuille,
 * mais les flux sont nuls — R_m = price_end / price_start − 1 pour chaque mois.
 * C'est la bonne comparaison face au TWR portefeuille (CFA standard).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BenchmarkService {

    private static final ZoneId PARIS = ZoneId.of("Europe/Paris");

    private final InstrumentPriceHistoryService priceHistoryService;

    public BenchmarkDto compute(Instrument instrument, LocalDate requestedFrom, LocalDate requestedTo) {
        LocalDate today       = LocalDate.now(PARIS);
        LocalDate effectiveTo = (requestedTo != null && requestedTo.isBefore(today)) ? requestedTo : today;
        LocalDate from        = (requestedFrom != null) ? requestedFrom.withDayOfMonth(1) : null;

        if (from == null || from.isAfter(effectiveTo)) {
            return empty(instrument, effectiveTo);
        }

        // Chargement du batch de prix (avec marge pour le floor lookup)
        LocalDate batchFrom = from.minusMonths(2);
        Map<String, BigDecimal> flat = priceHistoryService.loadPriceBatch(
                List.of(instrument), batchFrom, effectiveTo);

        // Reconstruction NavigableMap<date, prix>
        NavigableMap<LocalDate, BigDecimal> prices = new TreeMap<>();
        for (Map.Entry<String, BigDecimal> e : flat.entrySet()) {
            String[] parts = e.getKey().split("\\|");
            if (Long.parseLong(parts[0]) == instrument.getId()) {
                prices.put(LocalDate.parse(parts[1]), e.getValue());
            }
        }

        if (prices.isEmpty()) {
            log.warn("[benchmark] Aucun prix disponible pour instrument #{} sur [{} → {}]",
                    instrument.getId(), from, effectiveTo);
            return empty(instrument, effectiveTo);
        }

        // Point d'ouverture (mois précédant from)
        LocalDate openingDate = from.minusDays(1); // dernier jour du mois précédent
        String openingLabel   = openingDate.toString().substring(0, 7);

        List<BenchmarkMonthDto> series = new ArrayList<>();
        series.add(new BenchmarkMonthDto(openingLabel, 100.0));

        List<Double> monthlyReturns = new ArrayList<>();
        double index = 100.0;
        LocalDate monthStart = from;

        while (!monthStart.isAfter(effectiveTo.withDayOfMonth(1))) {
            boolean partial    = monthStart.equals(effectiveTo.withDayOfMonth(1));
            LocalDate monthEnd = partial ? effectiveTo : monthStart.with(TemporalAdjusters.lastDayOfMonth());
            LocalDate prevEnd  = monthStart.minusDays(1);

            Map.Entry<LocalDate, BigDecimal> pStart = prices.floorEntry(prevEnd);
            Map.Entry<LocalDate, BigDecimal> pEnd   = prices.floorEntry(monthEnd);
            String monthLabel = monthStart.toString().substring(0, 7);

            if (pStart == null || pEnd == null
                    || pStart.getValue().compareTo(BigDecimal.ZERO) == 0) {
                // Pas de prix pour ce mois → segment plat
                series.add(new BenchmarkMonthDto(monthLabel, round3(index)));
            } else {
                double rm = pEnd.getValue().doubleValue() / pStart.getValue().doubleValue() - 1;
                index *= (1 + rm);
                monthlyReturns.add(rm);
                series.add(new BenchmarkMonthDto(monthLabel, round3(index)));
            }

            monthStart = monthStart.plusMonths(1);
        }

        Double twrAnnualized = null;
        if (!monthlyReturns.isEmpty()) {
            double twrTotal = ModifiedDietzCalculator.chainReturns(monthlyReturns);
            long totalDays  = ChronoUnit.DAYS.between(openingDate, effectiveTo);
            twrAnnualized   = ModifiedDietzCalculator.annualize(twrTotal, totalDays);
        }

        String label = instrument.getName() != null
                ? instrument.getName() + (instrument.getTicker() != null ? " (" + instrument.getTicker() + ")" : "")
                : instrument.getTicker();

        log.info("[benchmark] {} → TWR={}, période=[{} → {}]",
                label, twrAnnualized, from, effectiveTo);

        return new BenchmarkDto(instrument.getId(), label, instrument.getCurrency(),
                from, effectiveTo, twrAnnualized, series);
    }

    private static double round3(double v) { return Math.round(v * 1000.0) / 1000.0; }

    private BenchmarkDto empty(Instrument instrument, LocalDate to) {
        String label = instrument.getName() != null ? instrument.getName() : instrument.getTicker();
        return new BenchmarkDto(instrument.getId(), label, instrument.getCurrency(),
                to, to, null, List.of());
    }
}
