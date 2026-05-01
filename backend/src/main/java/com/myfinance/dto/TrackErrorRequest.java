package com.myfinance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TrackErrorRequest(
        @NotBlank @Size(max = 200) String errorType,
        @NotBlank String message,
        String stack,
        @Size(max = 500) String requestPath,
        String metadata
) {}
