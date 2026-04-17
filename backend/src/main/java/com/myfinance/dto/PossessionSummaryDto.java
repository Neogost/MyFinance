package com.myfinance.dto;

import java.math.BigDecimal;
import java.util.List;

public record PossessionSummaryDto(
        BigDecimal totalPurchasePrice,
        BigDecimal totalEffectiveValue,
        BigDecimal totalDepreciation,
        BigDecimal globalDepreciationRate,
        List<PossessionCategorySummaryDto> byCategory
) {}
