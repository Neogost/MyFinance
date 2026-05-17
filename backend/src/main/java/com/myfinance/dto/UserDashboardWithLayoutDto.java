package com.myfinance.dto;

import com.myfinance.domain.UserDashboard;
import com.myfinance.domain.UserDashboardLayout;

import java.time.LocalDateTime;

public record UserDashboardWithLayoutDto(
        Long id,
        String name,
        int sortOrder,
        boolean isDefault,
        String layoutJson,
        int version,
        LocalDateTime updatedAt
) {
    public static UserDashboardWithLayoutDto from(UserDashboard d, UserDashboardLayout layout) {
        return new UserDashboardWithLayoutDto(
                d.getId(),
                d.getName(),
                d.getSortOrder(),
                Boolean.TRUE.equals(d.getIsDefault()),
                layout != null ? layout.getLayoutJson() : null,
                layout != null ? layout.getVersion()    : 1,
                d.getUpdatedAt()
        );
    }
}
