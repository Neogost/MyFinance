package com.myfinance.dto;

import com.myfinance.domain.ExchangeRate;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ExchangeRateDto(
        Long id,
        String currency,
        BigDecimal rate,
        LocalDateTime lastUpdatedAt
) {
    public static ExchangeRateDto from(ExchangeRate er) {
        return new ExchangeRateDto(er.getId(), er.getCurrency(), er.getRate(), er.getLastUpdatedAt());
    }
}
