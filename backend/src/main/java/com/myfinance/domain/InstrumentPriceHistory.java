package com.myfinance.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Cours de clôture quotidien d'un instrument en devise native.
 * Alimenté par le scheduler MarketDataService (forward daily) et par import CSV manuel (backfill BOURSE).
 * Convention : price est en devise native de l'instrument (Instrument.currency).
 */
@Entity
@Table(name = "instrument_price_history",
        uniqueConstraints = @UniqueConstraint(columnNames = {"instrument_id", "price_date"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InstrumentPriceHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "instrument_id", nullable = false)
    private Instrument instrument;

    @Column(name = "price_date", nullable = false)
    private LocalDate priceDate;

    /** Cours de clôture en devise native de l'instrument */
    @Column(nullable = false, precision = 18, scale = 6)
    private BigDecimal price;

    /** Source de la donnée */
    @Column(nullable = false, length = 20)
    private String source;
}
