package com.myfinance.dto;

import com.myfinance.domain.BonusTypeEnum;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpdateContractBonusRequest(
        @NotBlank @Size(max = 200) String label,
        @NotNull @Positive Float grossAmount,
        @NotNull BonusTypeEnum type,
        LocalDate paymentDate,                  // requis si type = EXCEPTIONNELLE
        @Min(1) @Max(12) Integer paymentMonth,  // requis si type = ANNUELLE
        LocalDate startDate,                    // requis si type = MENSUELLE
        LocalDate endDate                       // optionnel si type = MENSUELLE (null = indéfinie)
) {}
