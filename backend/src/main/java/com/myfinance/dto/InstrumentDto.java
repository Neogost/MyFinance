package com.myfinance.dto;

import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.CryptoNetwork;
import com.myfinance.domain.CryptoType;
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
        List<InstrumentSectorAllocationDto> sectorAllocation,
        long orderCount,
        CryptoType cryptoType,
        CryptoNetwork cryptoNetwork
) {
    public static InstrumentDto from(Instrument instrument) {
        return from(instrument, List.of(), List.of(), 0L);
    }

    public static InstrumentDto from(Instrument instrument,
                                     List<InstrumentAllocationDto> countryAllocation,
                                     List<InstrumentSectorAllocationDto> sectorAllocation) {
        return from(instrument, countryAllocation, sectorAllocation, 0L);
    }

    public static InstrumentDto from(Instrument instrument,
                                     List<InstrumentAllocationDto> countryAllocation,
                                     List<InstrumentSectorAllocationDto> sectorAllocation,
                                     long orderCount) {
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
                sectorAllocation,
                orderCount,
                instrument.getCryptoType(),
                instrument.getCryptoNetwork()
        );
    }
}
