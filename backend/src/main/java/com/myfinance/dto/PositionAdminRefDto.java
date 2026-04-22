package com.myfinance.dto;

import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.PositionStatus;

public record PositionAdminRefDto(
        Long id,
        String label,
        String partner,
        AssetCategory category,
        PositionStatus status
) {}
