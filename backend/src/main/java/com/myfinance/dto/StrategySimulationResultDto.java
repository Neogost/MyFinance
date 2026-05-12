package com.myfinance.dto;

import java.math.BigDecimal;
import java.util.List;

public record StrategySimulationResultDto(
        int userAge,
        int nbDonors,                              // 1 ou 2 selon présence conjoint marié/pacs
        int nbHeirs,                               // typiquement enfants
        BigDecimal patrimoineNetEur,
        List<StrategyCycleDto> cycles,

        // ── Scénarios comparatifs ─────────────────────────────────
        BigDecimal totalSansAnticipation,          // patrimoine net (tout passera en succession)
        BigDecimal droitsSansAnticipationEur,      // droits si rien fait → succession au décès
        BigDecimal totalAvecDonationsPP,           // cumul cycles en pleine propriété
        BigDecimal totalAvecDonationsNP,           // cumul cycles avec démembrement (transmission PP réelle)

        BigDecimal economieMaxEur,                 // économie max vs ne rien faire
        List<String> recommendations
) {}
