package com.myfinance.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Taux de change d'une devise étrangère par rapport à l'EUR.
 * Convention : rate = nombre d'unités de la devise étrangère pour 1 EUR.
 * Exemple : currency="USD", rate=1.08 signifie 1 EUR = 1.08 USD.
 * La conversion s'applique via : amountEur = amountNatif / rate.
 */
@Entity
@Table(name = "exchange_rates")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExchangeRate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Code devise ISO 4217 (ex : "USD", "GBP", "CHF") — unique */
    @Column(nullable = false, unique = true)
    private String currency;

    /** Nombre d'unités de la devise pour 1 EUR */
    @Column(nullable = false)
    private BigDecimal rate;

    /** Date de la dernière mise à jour du taux */
    private LocalDateTime lastUpdatedAt;
}
