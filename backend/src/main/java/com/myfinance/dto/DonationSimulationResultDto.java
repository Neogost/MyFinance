package com.myfinance.dto;

import java.math.BigDecimal;

public record DonationSimulationResultDto(
        BigDecimal assetValue,
        BigDecimal ownershipShare,
        BigDecimal donorShareEur,
        BigDecimal amountGivenEur,
        BigDecimal valueTransmitted,
        BigDecimal npRatio,
        BigDecimal abattementBase,
        BigDecimal abattementUsed,
        BigDecimal abattementResiduel,
        BigDecimal taxable,
        BigDecimal droits,

        // ── Détail des frais de notaire ────────────────────────────
        BigDecimal emolumentsTtcEur,           // émoluments du notaire (HT × 1.20)
        BigDecimal taxePubliciteFonciereEur,   // 0 si mobilier
        BigDecimal contributionSecuriteImmoEur,// 0 si mobilier
        BigDecimal fraisFormalitesEur,         // forfait débours / formalités
        BigDecimal notaryFeesEur,              // total = somme des 4 ci-dessus

        BigDecimal totalCostEur,               // droits + frais notaire
        BigDecimal netReceived,                // amountGivenEur − droits
        String warning
) {}
