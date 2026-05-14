package com.myfinance.dto;

import com.myfinance.domain.*;

import java.time.LocalDateTime;

public record InfoBannerAdminDto(
        Long id,
        String title,
        String message,
        InfoBannerType type,
        InfoBannerAudience audience,
        LocalDateTime startAt,
        LocalDateTime endAt,
        InfoBannerStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        String createdByLogin
) {
    public static InfoBannerAdminDto from(InfoBanner b, LocalDateTime now) {
        InfoBannerStatus status;
        if (now.isBefore(b.getStartAt())) {
            status = InfoBannerStatus.SCHEDULED;
        } else if (b.getEndAt() == null || !now.isAfter(b.getEndAt())) {
            status = InfoBannerStatus.ACTIVE;
        } else {
            status = InfoBannerStatus.EXPIRED;
        }
        return new InfoBannerAdminDto(
                b.getId(),
                b.getTitle(),
                b.getMessage(),
                b.getType(),
                b.getAudience(),
                b.getStartAt(),
                b.getEndAt(),
                status,
                b.getCreatedAt(),
                b.getUpdatedAt(),
                b.getCreatedBy() != null ? b.getCreatedBy().getLogin() : null
        );
    }
}
