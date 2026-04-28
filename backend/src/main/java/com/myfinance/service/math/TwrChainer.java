package com.myfinance.service.math;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Calcul du TWR (Time-Weighted Return) par chaînage de sous-périodes.
 *
 * Méthode Modified-Dietz par intervalle entre snapshots :
 *   HPR_i = (V_end - V_begin - CF_net) / (V_begin + 0.5 * CF_net)
 *
 * CF_net = inflows nets dans la position (BUY/DEPOSIT positif, SELL/WITHDRAWAL négatif)
 *
 * Si V_begin + 0.5 * CF_net <= 0, la sous-période est ignorée (position vide en début de période).
 */
public final class TwrChainer {

    public record SnapshotPoint(LocalDate date, double valueEur) {}

    /** Flux externe : positif = argent entrant dans la position (BUY/DEPOSIT), négatif = sortant */
    public record ExternalCashflow(LocalDate date, double amountEur) {}

    public record TwrResult(double twr, double twrAnnualized, List<DataPoint> timeSeries) {
        public record DataPoint(LocalDate date, double cumulativeReturn) {}
    }

    private TwrChainer() {}

    /**
     * @param snapshots    valorisations mensuelles triées par date croissante
     * @param cashflows    flux externes dans la période (BUY/DEPOSIT positifs, SELL/WITHDRAWAL négatifs)
     * @param currentDate  date de fin (aujourd'hui)
     * @param currentValue valeur actuelle totale
     * @return résultat TWR avec série temporelle, ou null si moins de 2 points de valorisation
     */
    public static TwrResult compute(
            List<SnapshotPoint> snapshots,
            List<ExternalCashflow> cashflows,
            LocalDate currentDate,
            double currentValue) {

        // Construire la liste complète des points de valorisation (snapshots + point final)
        List<SnapshotPoint> allPoints = new ArrayList<>(snapshots);
        if (allPoints.isEmpty() || !allPoints.get(allPoints.size() - 1).date().equals(currentDate)) {
            allPoints.add(new SnapshotPoint(currentDate, currentValue));
        }

        if (allPoints.size() < 2) return null;

        // Trier les cashflows par date
        List<ExternalCashflow> sortedCf = cashflows.stream()
                .sorted(Comparator.comparing(ExternalCashflow::date))
                .toList();

        double cumulativeHpr = 1.0;
        List<TwrResult.DataPoint> series = new ArrayList<>();
        LocalDate startDate = allPoints.get(0).date();

        for (int i = 1; i < allPoints.size(); i++) {
            SnapshotPoint prev = allPoints.get(i - 1);
            SnapshotPoint curr = allPoints.get(i);

            // Somme des flux nets dans [prev.date, curr.date[
            double cfNet = sortedCf.stream()
                    .filter(cf -> !cf.date().isBefore(prev.date()) && cf.date().isBefore(curr.date()))
                    .mapToDouble(ExternalCashflow::amountEur)
                    .sum();

            double denominator = prev.valueEur() + 0.5 * cfNet;
            if (denominator <= 0) {
                // Position vide en début de période — ignorer cette sous-période
                series.add(new TwrResult.DataPoint(curr.date(), cumulativeHpr - 1.0));
                continue;
            }

            double hpr = (curr.valueEur() - prev.valueEur() - cfNet) / denominator;
            cumulativeHpr *= (1 + hpr);
            series.add(new TwrResult.DataPoint(curr.date(), cumulativeHpr - 1.0));
        }

        double twr = cumulativeHpr - 1.0;
        long totalDays = ChronoUnit.DAYS.between(startDate, currentDate);
        double twrAnnualized = totalDays > 0
                ? Math.pow(1 + twr, 365.0 / totalDays) - 1
                : 0.0;

        return new TwrResult(twr, twrAnnualized, series);
    }
}
