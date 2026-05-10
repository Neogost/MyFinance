package com.myfinance.dto;

import com.myfinance.domain.AchievementCode;
import com.myfinance.domain.AchievementSensitivity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** Représentation d'un haut fait pour l'UI — inclut l'état de déblocage de l'utilisateur. */
public record AchievementDto(
        AchievementCode       code,
        String                emoji,
        String                name,
        String                description,
        AchievementSensitivity sensitivity,
        boolean               secret,
        int                   confirmedLevel,  // 0 = aucun, 1..N = palier confirmé le plus élevé
        LocalDateTime         lastUnlockedAt,  // date du dernier palier confirmé
        boolean               isNew,           // confirmé après lastAchievementSeenAt
        List<LevelDto>        levels
) {
    public record LevelDto(
            int        level,
            String     palierName,
            String     palierEmoji,
            BigDecimal threshold,
            boolean    confirmed
    ) {}
}
