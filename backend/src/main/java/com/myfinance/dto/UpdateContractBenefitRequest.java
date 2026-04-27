package com.myfinance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record UpdateContractBenefitRequest(
        @NotBlank @Size(max = 200) String label,
        @NotNull @Positive Float monthlyAmount
) {}
