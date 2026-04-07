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
        @NotNull RoleEnum role
) {}
