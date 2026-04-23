package com.myfinance.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record CreateContractOnCallRequest(
        @NotNull @Positive Float weeklyFlatRate,
        @NotNull @Min(1) @Max(52) Integer estimatedWeeksPerYear
) {}
