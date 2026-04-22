package com.myfinance.dto;

import com.myfinance.domain.DebtTypeEnum;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateDebtRequest(
        @NotNull DebtTypeEnum type,
        @NotBlank String label,
        String lender,
        LocalDate startDate,
        LocalDate endDate,
        @NotNull @Positive BigDecimal initialCapital,
        @NotNull BigDecimal annualRate,
        BigDecimal insuranceRate,
        BigDecimal monthlyPayment,
        BigDecimal remainingCapitalOverride,
        String currency,
        Long positionId
) {}
