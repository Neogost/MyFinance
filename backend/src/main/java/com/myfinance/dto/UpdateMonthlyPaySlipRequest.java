package com.myfinance.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

import java.time.LocalDate;

public record UpdateMonthlyPaySlipRequest(
        @NotNull LocalDate period,
        @NotNull @Positive Float grossSalary,
        @NotNull @Positive Float taxableNetSalary,
        @NotNull @Positive Float netSalary,
        @NotNull @PositiveOrZero Float incomeTaxWithholding
) {}
