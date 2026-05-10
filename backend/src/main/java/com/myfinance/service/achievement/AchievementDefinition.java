package com.myfinance.service.achievement;

import com.myfinance.domain.AchievementCode;
import com.myfinance.domain.AchievementSensitivity;

import java.util.List;

/**
 * Définition statique d'un haut fait (catalogue).
 * @param code        Identifiant enum
 * @param emoji       Icône affichée dans l'UI
 * @param name        Libellé affiché
 * @param description Condition à remplir (visible à l'utilisateur)
 * @param sensitivity Stratégie de validation
 * @param secret      Vrai = le badge et son nom sont masqués tant qu'il n'est pas débloqué
 * @param levels      Paliers ordonnés du plus faible au plus élevé
 */
public record AchievementDefinition(
        AchievementCode       code,
        String                emoji,
        String                name,
        String                description,
        AchievementSensitivity sensitivity,
        boolean               secret,
        List<AchievementLevel> levels
) {}
