package com.myfinance.dto;

import com.myfinance.domain.FamilyRelationEnum;

import java.math.BigDecimal;
import java.util.List;

/**
 * Résultat d'une donation à plusieurs bénéficiaires.
 * Chaque bénéficiaire a son propre calcul (abattement, taxable, droits).
 * Les frais de notaire sont calculés une seule fois sur le montant total transmis.
 */
public record MultiRecipientDonationResultDto(
        BigDecimal assetValue,
        BigDecimal donorShareEur,
        BigDecimal totalAmountGivenEur,
        List<RecipientResult> recipients,
        BigDecimal totalDroitsEur,
        BigDecimal notaryFeesEur,
        BigDecimal totalCostEur,
        BigDecimal totalNetReceivedEur,
        String abattementSummary,
        List<String> warnings
) {
    public record RecipientResult(
            Long recipientId,
            String firstName,
            FamilyRelationEnum relation,
            BigDecimal share,                  // 0.5 = 50 %
            BigDecimal allocatedAmountEur,     // share × totalAmountGiven
            BigDecimal valueTransmittedEur,    // après démembrement éventuel
            BigDecimal npRatio,                // null si pleine propriété
            BigDecimal abattementBaseEur,
            BigDecimal abattementUsedEur,
            BigDecimal abattementResiduelEur,
            BigDecimal taxableEur,
            BigDecimal droitsEur,
            BigDecimal netReceivedEur
    ) {}
}
