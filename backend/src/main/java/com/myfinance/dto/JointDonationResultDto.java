package com.myfinance.dto;

import java.math.BigDecimal;

/**
 * Résultat d'une donation conjointe de deux donateurs.
 * Les droits sont calculés séparément pour chaque donateur (abattements indépendants).
 * Les frais de notaire sont calculés une seule fois sur le montant total (un seul acte).
 */
public record JointDonationResultDto(
        String donor1Name,                      // "Vous"
        DonationSimulationResultDto donor1,

        String donor2Name,
        DonationSimulationResultDto donor2,

        BigDecimal totalAmountGivenEur,         // part 1 + part 2
        BigDecimal totalDroitsEur,              // droits1 + droits2
        BigDecimal notaryFeesEur,               // frais notaire sur total (1 seul acte)
        BigDecimal totalCostEur,                // droits + notaire
        BigDecimal netReceived,                 // totalAmount − totalDroits
        String abattementSummary                // "200 000 € d'abattements cumulés"
) {}
