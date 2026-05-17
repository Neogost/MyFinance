package com.myfinance.dto;

import com.myfinance.domain.UserDashboard;

import java.time.LocalDateTime;

public record UserDashboardDto(
        Long id,
        String name,
        int sortOrder,
        boolean isDefault,
        LocalDateTime updatedAt
) {
    public static UserDashboardDto from(UserDashboard d) {
        return new UserDashboardDto(
                d.getId(),
                d.getName(),
                d.getSortOrder(),
                Boolean.TRUE.equals(d.getIsDefault()),
                d.getUpdatedAt()
        );
    }
}
