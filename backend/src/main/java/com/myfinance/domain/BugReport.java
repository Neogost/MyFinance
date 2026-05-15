package com.myfinance.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "bug_reports")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BugReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    // Résultat attendu par l'utilisateur
    @Column(columnDefinition = "TEXT")
    private String expectedResult;

    // Étapes pour reproduire le bug
    @Column(columnDefinition = "TEXT")
    private String reproductionSteps;

    // Date/heure approximative à laquelle le problème s'est produit
    private LocalDateTime approximateDateTime;

    // Impact ressenti par l'utilisateur (LOW / MEDIUM / HIGH / CRITICAL)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BugSeverity userImpact;

    // Priorité définie par l'admin après triage (nullable jusqu'à triage)
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private BugSeverity priority;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private BugStatus status = BugStatus.OPEN;

    // ID de session analytics au moment du signalement (pour croiser avec les logs)
    @Column(length = 50)
    private String sessionId;

    // User-Agent du navigateur au moment du signalement
    @Column(columnDefinition = "TEXT")
    private String browserInfo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onPrePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void onPreUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
