package com.myfinance.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Taux de change quotidien d'une devise étrangère par rapport à l'EUR.
 * Convention identique à ExchangeRate : rate = nb d'unités de la devise pour 1 EUR.
 * Exemple : currency="USD", rate=1.08 → amountEur = amountUsd / 1.08.
 * Alimenté par le scheduler (ECB/Frankfurter forward daily) et backfill admin.
 */
@Entity
@Table(name = "exchange_rate_history",
        uniqueConstraints = @UniqueConstraint(columnNames = {"currency", "rate_date"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExchangeRateHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Code devise ISO 4217 (ex : "USD", "GBP", "CHF") */
    @Column(nullable = false, length = 3)
    private String currency;

    @Column(name = "rate_date", nullable = false)
    private LocalDate rateDate;

    /** Nombre d'unités de la devise pour 1 EUR */
    @Column(nullable = false, precision = 18, scale = 8)
    private BigDecimal rate;

    /** Source de la donnée */
    @Column(nullable = false, length = 20)
    private String source;
}
