package com.myfinance.dto;

import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.PositionStatus;
import java.math.BigDecimal;

public record PositionPerformanceDto(
        Long positionId,
        String label,
        AssetCategory category,
        PositionStatus status,
        Double twrAnnualized,
        Double mwrAnnualized,
        BigDecimal investedEur,
        BigDecimal currentValueEur,
        BigDecimal gainEur
) {}
