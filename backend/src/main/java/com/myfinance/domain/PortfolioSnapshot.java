package com.myfinance.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Photo mensuelle du patrimoine d'un utilisateur.
 * Créée automatiquement le 1er du mois ou manuellement via l'API.
 */
@Entity
@Table(name = "portfolio_snapshots")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PortfolioSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Date du snapshot (1er du mois en général) */
    @Column(nullable = false)
    private LocalDate snapshotDate;

    @Column(precision = 19, scale = 2)
    private BigDecimal totalInvestedEur;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal totalCurrentValueEur;

    @Column(precision = 19, scale = 2)
    private BigDecimal totalCapitalGainEur;

    @OneToMany(mappedBy = "portfolioSnapshot", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PositionSnapshot> positionSnapshots = new ArrayList<>();
}
