package com.myfinance.dto;

import com.myfinance.domain.RoleEnum;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CreateUserRequest(
        @NotBlank @Size(max = 100) String firstName,
        @NotBlank @Size(max = 100) String lastName,
        LocalDate birthDate,
        @NotBlank @Size(max = 100) String login,
        @NotBlank
        @Size(min = 12, max = 128, message = "Le mot de passe doit contenir entre 12 et 128 caractères")
        @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).*$",
                message = "Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial"
        )
        String password,
        @NotNull RoleEnum role,
        Float fiscalParts,               // null → 1.0 par défaut dans le service
        Boolean useFlatRateDeduction,    // null → true par défaut dans le service
        Float customProfessionalDeduction // obligatoire si useFlatRateDeduction = false
) {}
