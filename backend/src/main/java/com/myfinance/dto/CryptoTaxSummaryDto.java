package com.myfinance.dto;

import java.math.BigDecimal;
import java.util.List;

public record CryptoTaxSummaryDto(
        Integer year,
        BigDecimal ptaAtYearStart,
        BigDecimal ptaAtYearEnd,
        BigDecimal totalCessionsEur,
        BigDecimal totalPlusValueEur,
        BigDecimal totalMoinsValueEur,
        BigDecimal plusValueNetteImposable,
        boolean exemptedBy305Threshold,
        boolean declarationRequired,
        String taxOption,                     // "PFU" ou "BAREME"
        Float tmi,                            // null si option PFU
        BigDecimal estimatedTaxEur,
        int cessionsCount,
        List<String> warnings
) {}
