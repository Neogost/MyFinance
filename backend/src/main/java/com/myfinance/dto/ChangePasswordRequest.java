package com.myfinance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank String currentPassword,
        @NotBlank
        @Size(min = 8, max = 128, message = "Le mot de passe doit contenir entre 8 et 128 caractères")
        @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$",
                message = "Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre"
        )
        String newPassword
) {}
