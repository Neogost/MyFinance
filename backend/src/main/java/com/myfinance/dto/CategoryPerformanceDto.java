package com.myfinance.dto;

import com.myfinance.domain.AssetCategory;
import java.math.BigDecimal;

public record CategoryPerformanceDto(
        AssetCategory category,
        Double twrAnnualized,
        Double mwrAnnualized,
        BigDecimal totalInvestedEur,
        BigDecimal currentValueEur,
        BigDecimal absoluteGainEur,
        BigDecimal dividendsAndInterestsEur
) {}
