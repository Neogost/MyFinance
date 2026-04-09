package com.myfinance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record UpdateContractBenefitRequest(
        @NotBlank String label,
        @NotNull @Positive Float monthlyAmount
) {}
