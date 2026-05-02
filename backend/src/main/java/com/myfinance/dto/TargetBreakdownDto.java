package com.myfinance.dto;

import com.myfinance.domain.BreakdownDimension;
import com.myfinance.domain.PatrimoineTargetBreakdown;

import java.math.BigDecimal;

public record TargetBreakdownDto(
        BreakdownDimension dimension,
        String key,
        BigDecimal targetPercentage
) {
    public static TargetBreakdownDto from(PatrimoineTargetBreakdown b) {
        return new TargetBreakdownDto(b.getDimension(), b.getBreakdownKey(), b.getTargetPercentage());
    }
}
