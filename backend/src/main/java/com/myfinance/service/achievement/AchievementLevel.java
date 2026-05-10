package com.myfinance.service.achievement;

import java.math.BigDecimal;

/**
 * Un palier d'un haut fait.
 * @param level      Numéro du palier (1 = Bronze, 2 = Argent, 3 = Or, 4 = Platine, 5 = Diamant)
 * @param palierName Libellé du palier affiché à l'utilisateur
 * @param palierEmoji Emoji représentant le palier
 * @param threshold  Valeur à atteindre (null pour les badges uniques)
 */
public record AchievementLevel(
        int        level,
        String     palierName,
        String     palierEmoji,
        BigDecimal threshold
) {
    public static AchievementLevel of(int level, String name, String emoji, long threshold) {
        return new AchievementLevel(level, name, emoji, BigDecimal.valueOf(threshold));
    }

    public static AchievementLevel unique() {
        return new AchievementLevel(1, "Unique", "🏅", null);
    }
}
