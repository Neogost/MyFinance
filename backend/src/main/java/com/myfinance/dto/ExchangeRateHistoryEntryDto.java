package com.myfinance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ExchangeRateHistoryEntryDto(
        String     currency,
        LocalDate  rateDate,
        BigDecimal rate,
        String     source
) {}
