package com.myfinance.dto;

import com.myfinance.domain.DebtTypeEnum;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateDebtRequest(
        @NotNull DebtTypeEnum type,
        @NotBlank @Size(max = 200) String label,
        @Size(max = 200) String lender,
        LocalDate startDate,
        LocalDate endDate,
        @NotNull @Positive BigDecimal initialCapital,
        @NotNull BigDecimal annualRate,
        BigDecimal insuranceRate,
        BigDecimal monthlyPayment,
        BigDecimal remainingCapitalOverride,
        @Size(min = 3, max = 3) String currency,
        Long positionId
) {}
