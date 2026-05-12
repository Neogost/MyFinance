package com.myfinance.dto;

import java.math.BigDecimal;
import java.util.List;

public record BasketAnalysisDto(
        String basketLabel,
        BigDecimal realizedGainsBrutesEur,  // PV brutes avant déduction des MV reportées
        BigDecimal mvReporteesEur,           // MV reportées des années antérieures appliquées
        BigDecimal realizedGainsYearEur,    // PV nettes après MV reportées (= ce qui reste à compenser)
        BigDecimal totalUnrealizedLossEur,  // somme des MV latentes (négatif ou 0)
        BigDecimal compensableAmountEur,    // min(pvRealisees, abs(totalUnrealized))
        BigDecimal estimatedTaxSavingEur,   // compensable × taux effectif
        List<TaxLossCandidateDto> candidates
) {}
