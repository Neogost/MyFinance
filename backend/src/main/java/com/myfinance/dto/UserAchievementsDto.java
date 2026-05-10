package com.myfinance.dto;

import java.util.List;

/** Réponse complète de GET /api/achievements/me. */
public record UserAchievementsDto(
        int                  totalUnlockedLevels,
        int                  totalCatalogLevels,
        long                 unseenCount,
        List<AchievementDto> achievements
) {}
