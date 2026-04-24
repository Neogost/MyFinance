package com.myfinance.dto;

import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.Instrument;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record InstrumentDto(
        Long id,
        AssetCategory category,
        String isin,
        String ticker,
        String name,
        String currency,
        BigDecimal lastPrice,
        LocalDateTime lastPriceUpdatedAt,
        boolean stablePrice,
        String marketSymbol,
        String coinGeckoId,
        String boursoramaSymbol,
        List<InstrumentAllocationDto> countryAllocation,
        List<InstrumentSectorAllocationDto> sectorAllocation
) {
    public static InstrumentDto from(Instrument instrument) {
        return from(instrument, List.of(), List.of());
    }

    public static InstrumentDto from(Instrument instrument,
                                     List<InstrumentAllocationDto> countryAllocation,
                                     List<InstrumentSectorAllocationDto> sectorAllocation) {
        return new InstrumentDto(
                instrument.getId(),
                instrument.getCategory(),
                instrument.getIsin(),
                instrument.getTicker(),
                instrument.getName(),
                instrument.getCurrency(),
                instrument.getLastPrice(),
                instrument.getLastPriceUpdatedAt(),
                instrument.isStablePrice(),
                instrument.getMarketSymbol(),
                instrument.getCoinGeckoId(),
                instrument.getBoursoramaSymbol(),
                countryAllocation,
                sectorAllocation
        );
    }
}
