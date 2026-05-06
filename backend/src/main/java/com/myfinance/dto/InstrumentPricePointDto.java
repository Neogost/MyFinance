package com.myfinance.dto;

import com.myfinance.domain.InstrumentPriceHistory;

import java.math.BigDecimal;
import java.time.LocalDate;

public record InstrumentPricePointDto(
        LocalDate date,
        BigDecimal price
) {
    public static InstrumentPricePointDto from(InstrumentPriceHistory h) {
        return new InstrumentPricePointDto(h.getPriceDate(), h.getPrice());
    }
}
