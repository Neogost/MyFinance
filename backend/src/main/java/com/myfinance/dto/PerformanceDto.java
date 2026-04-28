package com.myfinance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;


public record PerformanceDto(
        LocalDate from,              // date du premier ordre (base du MWR)
        LocalDate to,
        double durationYears,
        LocalDate firstSnapshotDate, // date du premier relevé utilisé pour le TWR (null si aucun)
        BigDecimal openingValueEur,  // valeur du portefeuille en début de période restreinte (null si Globale)
        Double twrAnnualized,
        Double mwrAnnualized,
        BigDecimal totalInvestedEur,
        BigDecimal currentValueEur,
        BigDecimal absoluteGainEur,
        BigDecimal dividendsAndInterestsEur,
        Double benchmarkRate,
        Double benchmarkOutperformance,
        String warning,
        List<DataPoint> timeSeries,
        List<CategoryPerformanceDto> categories
) {
    public record DataPoint(LocalDate date, double cumulativeReturn, Double benchmarkReturn) {}
}
