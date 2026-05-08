package com.myfinance.dto;

public record ExchangeRateUsageDto(
        String currency,
        long   instrumentCount,
        long   positionCount
) {
    public boolean hasUsage() {
        return instrumentCount > 0 || positionCount > 0;
    }
}
