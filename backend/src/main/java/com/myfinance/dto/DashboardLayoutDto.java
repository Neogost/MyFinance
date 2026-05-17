package com.myfinance.dto;

import com.myfinance.domain.UserDashboardLayout;

import java.time.LocalDateTime;

public record DashboardLayoutDto(
        String layoutJson,
        int version,
        LocalDateTime updatedAt
) {
    public static DashboardLayoutDto from(UserDashboardLayout entity) {
        return new DashboardLayoutDto(
                entity.getLayoutJson(),
                entity.getVersion(),
                entity.getUpdatedAt()
        );
    }
}
