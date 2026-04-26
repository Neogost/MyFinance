package com.myfinance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateLoanSimulationRequest(
        @NotBlank String name,
        @NotNull Object parameters
) {}
