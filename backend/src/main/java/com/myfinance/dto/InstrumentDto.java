package com.myfinance.dto;

import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.Instrument;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record InstrumentDto(
        Long id,
        AssetCategory category,
        String isin,
        String ticker,
        String name,
        String currency,
        BigDecimal lastPrice,
        LocalDateTime lastPriceUpdatedAt
) {
    public static InstrumentDto from(Instrument instrument) {
        return new InstrumentDto(
                instrument.getId(),
                instrument.getCategory(),
                instrument.getIsin(),
                instrument.getTicker(),
                instrument.getName(),
                instrument.getCurrency(),
                instrument.getLastPrice(),
                instrument.getLastPriceUpdatedAt()
        );
    }
}
