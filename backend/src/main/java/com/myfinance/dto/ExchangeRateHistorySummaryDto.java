package com.myfinance.dto;

import java.time.LocalDate;

public record ExchangeRateHistorySummaryDto(
        String    currency,
        long      dayCount,
        LocalDate fromDate,
        LocalDate toDate
) {}
