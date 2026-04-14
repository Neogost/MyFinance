package com.myfinance.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Valeur d'une position au moment d'un snapshot mensuel.
 */
@Entity
@Table(name = "position_snapshots")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PositionSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "portfolio_snapshot_id", nullable = false)
    private PortfolioSnapshot portfolioSnapshot;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "position_id", nullable = false)
    private Position position;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal investedAmountEur;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal currentValueEur;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal capitalGainEur;

    /** Nombre de parts / tokens — null pour LIVRET, IMMO, LIQUIDITE */
    private BigDecimal units;

    /** Prix unitaire en EUR au moment du snapshot — null sauf BOURSE/CRYPTO */
    private BigDecimal unitPriceEur;
}
