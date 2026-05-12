package com.myfinance.dto;

import com.myfinance.domain.FamilyRelationEnum;

import java.math.BigDecimal;
import java.util.List;

/**
 * Résultat d'une donation conjointe à plusieurs bénéficiaires.
 * Chaque pair (donateur, bénéficiaire) a son propre calcul ; le total est consolidé par bénéficiaire.
 */
public record JointMultiRecipientDonationResultDto(
        String donor1Name,
        String donor2Name,
        BigDecimal assetValue,
        BigDecimal totalAmountGivenEur,         // sum of all amounts given to all recipients
        List<JointRecipientResult> recipients,
        BigDecimal totalDroitsEur,
        BigDecimal notaryFeesEur,
        BigDecimal totalCostEur,
        BigDecimal totalNetReceivedEur,
        String abattementSummary,
        List<String> warnings
) {
    public record JointRecipientResult(
            Long recipientId,
            String firstName,
            FamilyRelationEnum relation,
            BigDecimal share,
            BigDecimal totalAllocatedEur,        // sum of contributions from both donors
            BigDecimal totalValueTransmittedEur, // après démembrement éventuel
            BigDecimal totalAbattementBaseEur,   // sum of abattements from both donors (par ex. 200k pour un enfant)
            BigDecimal totalAbattementUsedEur,
            BigDecimal totalAbattementResiduelEur,
            BigDecimal totalTaxableEur,
            BigDecimal totalDroitsEur,
            BigDecimal netReceivedEur,
            BigDecimal donor1ContributionEur,
            BigDecimal donor1DroitsEur,
            BigDecimal donor2ContributionEur,
            BigDecimal donor2DroitsEur
    ) {}
}
