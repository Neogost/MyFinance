package com.myfinance.dto;

import com.myfinance.domain.OtherIncomeTypeEnum;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CreateOtherIncomeRequest(
        @NotNull OtherIncomeTypeEnum type,
        @NotBlank @Size(max = 200) String label,
        @NotNull @Positive Float amount,
        @NotNull LocalDate date,
        Boolean isTaxable,      // null → true par défaut dans le service
        Float specificTaxRate,  // null → barème IRPP normal
        Long positionId         // bien IMMO_PHYSIQUE associé (LOCATIF uniquement, nullable)
) {}
