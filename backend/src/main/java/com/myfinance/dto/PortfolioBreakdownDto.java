package com.myfinance.dto;

import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.BreakdownDimension;

import java.math.BigDecimal;
import java.util.List;

public record PortfolioBreakdownDto(
        AssetCategory category,
        BreakdownDimension dimension,
        BigDecimal totalEur,
        BigDecimal coverageRatio,
        BigDecimal unclassifiedEur,
        List<BreakdownItem> breakdown
) {
    public record BreakdownItem(
            String key,
            BigDecimal valueEur,
            BigDecimal actualPercentage
    ) {}
}
