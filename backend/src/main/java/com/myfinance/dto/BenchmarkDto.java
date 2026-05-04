package com.myfinance.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * Résultat du calcul TWR d'un instrument utilisé comme benchmark.
 * Endpoint : GET /api/patrimoine/performance/benchmark?instrumentId=&from=&to=
 *
 * Le TWR est purement basé sur les prix de l'instrument (convention CFA) —
 * sans cashflows hypothétiques. C'est la bonne comparaison face au TWR du
 * portefeuille, qui élimine lui aussi l'effet du timing des versements.
 */
public record BenchmarkDto(
        Long   instrumentId,
        String label,        // Instrument.name + ticker
        String currency,
        LocalDate from,      // premier mois du chaînage
        LocalDate to,
        Double twrAnnualized, // null si pas d'historique suffisant
        List<BenchmarkMonthDto> series  // courbe base 100
) {
    public record BenchmarkMonthDto(String month, double value) {}
}
