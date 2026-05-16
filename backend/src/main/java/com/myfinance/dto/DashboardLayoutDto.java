package com.myfinance.dto;

import com.myfinance.domain.UserDashboardLayout;

import java.time.Instant;

public record DashboardLayoutDto(
        String layoutJson,
        int version,
        Instant updatedAt
) {
    public static DashboardLayoutDto from(UserDashboardLayout entity) {
        return new DashboardLayoutDto(
                entity.getLayoutJson(),
                entity.getVersion(),
                entity.getUpdatedAt()
        );
    }
}
