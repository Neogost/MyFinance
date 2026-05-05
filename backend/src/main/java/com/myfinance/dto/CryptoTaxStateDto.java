package com.myfinance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CryptoTaxStateDto(
        BigDecimal currentPta,
        BigDecimal currentPortfolioValueEur,
        LocalDate firstOperationDate,
        int totalOperationsCount,
        boolean historicalDataConfirmed
) {}
