package com.myfinance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TrackErrorRequest(
        @NotBlank @Size(max = 200) String errorType,
        @NotBlank @Size(max = 2000) String message,
        @Size(max = 4096) String stack,
        @Size(max = 500) String requestPath,
        @Size(max = 2000) String metadata
) {}
