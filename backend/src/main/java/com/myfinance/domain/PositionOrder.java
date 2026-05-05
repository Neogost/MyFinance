package com.myfinance.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "position_orders")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PositionOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "position_id", nullable = false)
    private Position position;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderType orderType;

    /** Quantité de titres / tokens — null pour LIVRET, IMMO_PAPIER */
    private BigDecimal quantity;

    /** Prix unitaire dans la devise de la position — null pour LIVRET, IMMO_PAPIER */
    private BigDecimal unitPrice;

    @Column(nullable = false)
    private BigDecimal amount; // montant dans la devise de la position

    @Column(nullable = false)
    private BigDecimal amountEur; // montant converti en EUR au moment de l'ordre

    @Column(nullable = false)
    private LocalDate orderDate;

    private String notes;

    // ── Fiscalité crypto (article 150 VH bis CGI) ──────────────

    /** Type d'opération crypto. null sur les ordres non-CRYPTO. */
    @Enumerated(EnumType.STRING)
    @Column(name = "crypto_operation_type")
    private CryptoOperationTypeEnum cryptoOperationType;

    /** Pour un SWAP_OUT : id de l'ordre SWAP_IN jumeau créé sur la position de destination. */
    @Column(name = "swap_counterpart_order_id")
    private Long swapCounterpartOrderId;

    /** Override manuel de la VGP (valeur globale du portefeuille) au moment d'un SELL_FIAT.
     *  null = calcul auto depuis instrument_price_history. */
    @Column(name = "portfolio_value_at_date_eur")
    private BigDecimal portfolioValueAtDateEur;
}
