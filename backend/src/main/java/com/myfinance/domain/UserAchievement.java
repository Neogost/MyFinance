package com.myfinance.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_achievement",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "achievement_code", "level"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAchievement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "achievement_code", nullable = false, length = 40)
    private AchievementCode achievementCode;

    @Column(nullable = false)
    private int level;

    /** Non null = badge confirmé. Null = en attente de validation (badges 🟥). */
    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "confirmation_snapshot_id")
    private Long confirmationSnapshotId;

    /** Nombre de snapshots consécutifs validés depuis first_eligible_at (pour les 🟥). */
    @Column(name = "consecutive_validations")
    @Builder.Default
    private int consecutiveValidations = 0;

    @Column(name = "first_eligible_at")
    private LocalDateTime firstEligibleAt;

    @Column(name = "last_check_at")
    private LocalDateTime lastCheckAt;
}
