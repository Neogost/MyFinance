package com.myfinance.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Un cycle de donation dans la stratégie 15 ans.
 * Représente une fenêtre où les abattements sont disponibles intégralement.
 */
public record StrategyCycleDto(
        int cycleNumber,                       // 1, 2, 3...
        int year,                              // année calendaire
        int donorAge,                          // âge du donateur principal à ce moment
        BigDecimal npRatio,                    // ratio NP applicable à cet âge (si démembrement)
        BigDecimal totalAbattementsAvailable,  // somme abattements tous héritiers × nb donateurs
        List<HeirAllocation> heirs,
        BigDecimal maxTransmissibleSansDroits, // = totalAbattementsAvailable en pleine propriété
        BigDecimal maxTransmissibleAvecDemembrement // = maxTransmissible / npRatio (immobilier)
) {
    public record HeirAllocation(
            Long heirId,
            String firstName,
            String relation,
            int nbDonors,                      // 1 si solo, 2 si en couple
            BigDecimal abattementPerDonor,     // ex. 100 000 pour ENFANT
            BigDecimal totalAbattementEur      // nbDonors × abattementPerDonor
    ) {}
}
