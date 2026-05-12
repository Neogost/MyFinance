package com.myfinance.dto;

import com.myfinance.domain.FamilyRelationEnum;

import java.math.BigDecimal;

public record HeirShareDto(
        Long memberId,
        String firstName,
        FamilyRelationEnum relation,
        BigDecimal partEur,           // part attribuée à cet héritier
        BigDecimal abattementBaseEur, // abattement légal selon le lien
        BigDecimal abattementUsedEur, // déjà utilisé via donations < 15 ans
        BigDecimal abattementResiduelEur,
        BigDecimal taxableEur,        // partEur − abattementResiduel
        BigDecimal droitsEur,         // droits de succession à payer
        BigDecimal netReceivedEur,    // partEur − droits
        Boolean exonere,              // true pour le conjoint (depuis 2007)
        String note                   // ex. "Exonéré de droits depuis 2007"
) {}
