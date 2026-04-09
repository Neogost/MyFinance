package com.myfinance.dto;

import com.myfinance.domain.OtherIncomeTypeEnum;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.LocalDate;

public record CreateOtherIncomeRequest(
        @NotNull OtherIncomeTypeEnum type,
        @NotBlank String label,
        @NotNull @Positive Float amount,
        @NotNull LocalDate date,
        Boolean isTaxable,      // null → true par défaut dans le service
        Float specificTaxRate   // null → barème IRPP normal
) {}
