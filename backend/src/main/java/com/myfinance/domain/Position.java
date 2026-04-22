package com.myfinance.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "positions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Position {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AssetCategory category;

    // ── Champs communs ─────────────────────────────────────────

    private String partner;

    @Column(nullable = false)
    private String label;

    @Column(nullable = false)
    private String currency; // ex : "EUR", "USD"

    @Enumerated(EnumType.STRING)
    private FiscalEnvelope fiscalEnvelope; // BOURSE, LIVRET, IMMO_PAPIER

    // ── BOURSE / CRYPTO ────────────────────────────────────────

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "instrument_id")
    private Instrument instrument;

    @Enumerated(EnumType.STRING)
    private AssetSubType assetSubType; // BOURSE uniquement

    // ── IMMO_PHYSIQUE ──────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    private OwnershipType ownershipType;

    private String address;

    private BigDecimal estimatedCurrentValue; // saisie manuelle

    private LocalDate acquisitionDate;  // date d'acquisition du bien

    private BigDecimal acquisitionPrice; // prix d'acquisition du bien

    // ── IMMO_PAPIER ────────────────────────────────────────────

    private BigDecimal commissionRate; // taux de commission plateforme en %

    // ── LIVRET ─────────────────────────────────────────────────

    private BigDecimal annualRate; // taux annuel en %

    // ── LIQUIDITE ──────────────────────────────────────────────

    private BigDecimal currentBalance; // solde mis à jour manuellement

    // ── Options ────────────────────────────────────────────────

    @Column(nullable = false)
    private Boolean includeInIncomeProjection;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PositionStatus status;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    // ── Relations ──────────────────────────────────────────────

    @OneToMany(mappedBy = "position", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PositionOrder> orders = new ArrayList<>();
}
