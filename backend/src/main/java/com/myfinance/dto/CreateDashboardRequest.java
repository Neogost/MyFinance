package com.myfinance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateDashboardRequest(
        @NotBlank @Size(max = 50) String name
) {}
