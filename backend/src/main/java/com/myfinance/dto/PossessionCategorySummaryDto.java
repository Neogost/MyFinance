package com.myfinance.dto;

import com.myfinance.domain.PossessionCategoryEnum;

import java.math.BigDecimal;

public record PossessionCategorySummaryDto(
        PossessionCategoryEnum category,
        int count,
        BigDecimal totalPurchasePrice,
        BigDecimal totalEffectiveValue,
        BigDecimal totalDepreciation
) {}
