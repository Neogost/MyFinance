package com.myfinance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record SuccessionSimulationResultDto(
        LocalDate simulationDate,

        // ── Composition du patrimoine ─────────────────────────────
        BigDecimal positionsValueEur,        // bourse + crypto + livret + liquidité
        BigDecimal possessionsValueEur,      // grandes possessions
        BigDecimal debtsRemainingEur,        // dettes en cours
        BigDecimal patrimoineNetEur,         // positions + possessions − dettes
        BigDecimal donationsRapporteesEur,   // donations < 15 ans rapportées

        // ── Régime matrimonial ────────────────────────────────────
        BigDecimal partRegimeMatrimonialEur, // part du conjoint au titre du régime (avant succession)

        BigDecimal masseSuccessoraleEur,     // patrimoine net − part régime + donations rapportées

        // ── Composition familiale ─────────────────────────────────
        boolean hasConjoint,
        String conjointName,
        String unionType,                    // MARIAGE / PACS / CONCUBINAGE
        String matrimonialRegime,            // COMMUNAUTE / SEPARATION (null sauf MARIAGE)
        int nbEnfants,

        // ── Répartition légale ────────────────────────────────────
        BigDecimal reserveRatio,             // 1/2, 2/3 ou 3/4
        BigDecimal reserveHereditaireEur,    // part réservée aux enfants
        BigDecimal quotiteDisponibleEur,     // part libre

        // ── Héritiers et droits ───────────────────────────────────
        List<HeirShareDto> heirs,
        BigDecimal totalDroitsEur,
        BigDecimal totalNetReceivedEur,

        List<String> warnings
) {}
