package com.myfinance.dto;

import com.myfinance.domain.AssetCategory;

public record PositionAdminRefDto(
        Long id,
        String label,
        String partner,
        AssetCategory category
) {}
