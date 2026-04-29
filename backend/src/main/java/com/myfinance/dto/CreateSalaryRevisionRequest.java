package com.myfinance.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CreateSalaryRevisionRequest(
        @NotNull LocalDate effectiveDate,
        // PRIVATE : requis. PUBLIC : null (calculé depuis indiceMajore)
        @Positive Float annualGrossSalary,
        // PUBLIC uniquement
        @Positive Integer indiceMajore,
        @Size(max = 200) String label
) {}
