package com.myfinance.dto;

import com.myfinance.domain.OtherIncomeTypeEnum;
import jakarta.validation.constraints.*;

import java.time.LocalDate;

public record CreateOtherIncomeRequest(
        @NotNull OtherIncomeTypeEnum type,
        @NotBlank @Size(max = 200) String label,
        @NotNull @Positive Float amount,
        LocalDate date,             // obligatoire sauf si periodStart est fourni (service valide)
        Boolean isTaxable,          // null → true par défaut dans le service
        Float specificTaxRate,      // null → barème IRPP normal
        Long positionId,            // bien IMMO_PHYSIQUE associé (LOCATIF uniquement, nullable)
        LocalDate periodStart,      // début du contrat (LOCATIF uniquement)
        LocalDate periodEnd,        // fin du contrat — null si en cours (LOCATIF uniquement)
        @Min(1) @Max(28) Integer dayOfMonth  // jour du mois de perception (1–28, LOCATIF contrat)
) {}
