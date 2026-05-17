package com.myfinance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateDashboardRequest(
        @NotBlank @Size(max = 50) String name,
        @NotNull Integer sortOrder,
        @NotNull Boolean isDefault
) {}
