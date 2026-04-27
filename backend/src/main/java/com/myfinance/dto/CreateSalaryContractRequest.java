package com.myfinance.dto;

import jakarta.validation.constraints.*;

import java.time.LocalDate;

public record CreateSalaryContractRequest(
        @Size(max = 200) String companyName,
        @NotNull LocalDate startDate,
        LocalDate endDate,
        @NotNull @Positive Float annualGrossSalary,
        @NotNull @Min(1) @Max(13) Integer paidMonthsPerYear,
        @NotNull @Positive Float weeklyHours,
        @NotNull @PositiveOrZero Float mealVoucherAmount,
        @NotNull @DecimalMin("0.0") @DecimalMax("100.0") Float mealVoucherEmployeeRate,
        Boolean isCadre,
        @DecimalMin("0.0") @DecimalMax("1.0") Float employeePrevoyanceRate
) {}
