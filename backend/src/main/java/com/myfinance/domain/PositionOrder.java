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

    private BigDecimal exchangeRate; // null si devise = EUR

    @Column(nullable = false)
    private LocalDate orderDate;

    private String notes;
}
