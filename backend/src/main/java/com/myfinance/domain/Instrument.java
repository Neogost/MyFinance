package com.myfinance.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Référentiel des instruments financiers (actions, ETF, crypto).
 * Partagé entre tous les utilisateurs — non lié à un user.
 */
@Entity
@Table(name = "instruments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Instrument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** BOURSE ou CRYPTO */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AssetCategory category;

    /** Code ISIN — renseigné pour BOURSE, unique parmi les instruments BOURSE */
    @Column(unique = true)
    private String isin;

    /** Symbole / trigramme — renseigné pour CRYPTO, unique parmi les instruments CRYPTO */
    @Column(unique = true)
    private String ticker;

    @Column(nullable = false)
    private String name;

    /** Devise native (EUR, USD, …) */
    @Column(nullable = false)
    private String currency;

    /** Dernier prix connu — mis à jour par le scheduler */
    private BigDecimal lastPrice;

    /** Date de la dernière mise à jour du prix */
    private LocalDateTime lastPriceUpdatedAt;

    /** Vrai si le prix est fixe — pas d'indicateur d'obsolescence (fonds euros, stablecoins) */
    @Builder.Default
    @Column(nullable = false)
    private boolean stablePrice = false;
}
