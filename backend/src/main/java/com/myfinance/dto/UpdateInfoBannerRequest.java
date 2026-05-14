package com.myfinance.dto;

import com.myfinance.domain.InfoBannerAudience;
import com.myfinance.domain.InfoBannerType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record UpdateInfoBannerRequest(
        @Size(max = 120) String title,
        @NotBlank @Size(max = 2000) String message,
        @NotNull InfoBannerType type,
        @NotNull InfoBannerAudience audience,
        @NotNull LocalDateTime startAt,
        LocalDateTime endAt
) {}
