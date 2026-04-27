package com.myfinance.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpdateSalaryRevisionRequest(
        @NotNull LocalDate effectiveDate,
        @NotNull @Positive Float annualGrossSalary,
        @Size(max = 200) String label
) {}
