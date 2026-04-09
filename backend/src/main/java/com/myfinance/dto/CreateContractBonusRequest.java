package com.myfinance.dto;

import com.myfinance.domain.BonusTypeEnum;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.LocalDate;

public record CreateContractBonusRequest(
        @NotBlank String label,
        @NotNull @Positive Float grossAmount,
        @NotNull BonusTypeEnum type,
        LocalDate paymentDate,   // requis si type = EXCEPTIONNELLE
        @Min(1) @Max(12) Integer paymentMonth  // requis si type = ANNUELLE
) {}
