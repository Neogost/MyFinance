package com.myfinance.dto;

import com.myfinance.domain.RoleEnum;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record CreateUserRequest(
        @NotBlank String firstName,
        @NotBlank String lastName,
        LocalDate birthDate,
        @NotBlank String login,
        @NotBlank String password,
        @NotNull RoleEnum role,
        Float fiscalParts,               // null → 1.0 par défaut dans le service
        Boolean useFlatRateDeduction,    // null → true par défaut dans le service
        Float customProfessionalDeduction // obligatoire si useFlatRateDeduction = false
) {}
