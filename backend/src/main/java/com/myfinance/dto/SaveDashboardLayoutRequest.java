package com.myfinance.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SaveDashboardLayoutRequest(
        @NotBlank @Size(max = 32768) String layoutJson,
        @NotNull @Min(1) Integer version
) {}
