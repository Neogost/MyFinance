package com.myfinance.controller;

import com.myfinance.domain.AchievementCode;
import com.myfinance.domain.User;
import com.myfinance.domain.UserAchievement;
import com.myfinance.dto.AchievementDto;
import com.myfinance.dto.UserAchievementsDto;
import com.myfinance.service.achievement.AchievementCatalog;
import com.myfinance.service.achievement.AchievementDefinition;
import com.myfinance.service.achievement.AchievementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/achievements")
@RequiredArgsConstructor
public class AchievementController {

    private final AchievementService achievementService;
    private final AchievementCatalog catalog;

    /**
     * Retourne tous les hauts faits avec l'état de déblocage de l'utilisateur.
     * Les badges secrets non débloqués sont masqués (nom et description cachés).
     */
    @GetMapping("/me")
    public ResponseEntity<UserAchievementsDto> getMyAchievements(@AuthenticationPrincipal User user) {
        // evaluateAndGetAll évalue + lit dans UNE SEULE transaction pour éviter SQLITE_BUSY_SNAPSHOT.
        List<UserAchievement> confirmed = achievementService.evaluateAndGetAll(user);
        long unseen = achievementService.countUnseen(user);

        // Indexation : code → max niveau confirmé + date
        Map<AchievementCode, Integer> maxLevel = confirmed.stream()
                .collect(Collectors.toMap(UserAchievement::getAchievementCode,
                        UserAchievement::getLevel, Math::max));
        Map<AchievementCode, LocalDateTime> lastUnlocked = confirmed.stream()
                .collect(Collectors.toMap(UserAchievement::getAchievementCode,
                        UserAchievement::getConfirmedAt,
                        (a, b) -> a.isAfter(b) ? a : b));

        LocalDateTime seenAt = user.getLastAchievementSeenAt();
        List<AchievementDto> dtos = new ArrayList<>();
        int totalUnlocked = 0;

        for (AchievementDefinition def : catalog.all()) {
            int earnedLevel = maxLevel.getOrDefault(def.code(), 0);
            LocalDateTime unlockedAt = lastUnlocked.get(def.code());
            boolean isNew = unlockedAt != null && (seenAt == null || unlockedAt.isAfter(seenAt));
            totalUnlocked += earnedLevel;

            // Masquer les secrets non encore débloqués
            boolean masked = def.secret() && earnedLevel == 0;

            List<AchievementDto.LevelDto> levels = def.levels().stream()
                    .map(lvl -> new AchievementDto.LevelDto(
                            lvl.level(), lvl.palierName(), lvl.palierEmoji(),
                            masked ? null : lvl.threshold(),
                            earnedLevel >= lvl.level()))
                    .toList();

            dtos.add(new AchievementDto(
                    def.code(),
                    masked ? "❓" : def.emoji(),
                    masked ? "???" : def.name(),
                    masked ? "Badge secret — à découvrir !" : def.description(),
                    def.sensitivity(),
                    def.secret(),
                    earnedLevel,
                    unlockedAt,
                    isNew,
                    levels
            ));
        }

        return ResponseEntity.ok(new UserAchievementsDto(
                totalUnlocked, catalog.totalBadges(), unseen, dtos));
    }

    /** Marque tous les hauts faits comme "vus" — efface le compteur de nouveautés. */
    @PutMapping("/me/seen")
    public ResponseEntity<Void> markSeen(@AuthenticationPrincipal User user) {
        achievementService.markAllSeen(user);
        return ResponseEntity.noContent().build();
    }
}
