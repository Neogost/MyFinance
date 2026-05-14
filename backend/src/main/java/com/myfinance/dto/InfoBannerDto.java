package com.myfinance.dto;

import com.myfinance.domain.InfoBanner;
import com.myfinance.domain.InfoBannerType;

public record InfoBannerDto(
        Long id,
        String title,
        String message,
        InfoBannerType type
) {
    public static InfoBannerDto from(InfoBanner b) {
        return new InfoBannerDto(b.getId(), b.getTitle(), b.getMessage(), b.getType());
    }
}
