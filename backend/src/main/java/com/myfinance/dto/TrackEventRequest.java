package com.myfinance.dto;

import com.myfinance.domain.EventType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record TrackEventRequest(
        @NotNull EventType type,
        @NotBlank @Size(max = 100)
        @Pattern(regexp = "^[a-z][a-z0-9_]*\\.[a-z][a-z0-9_]*\\.[a-z][a-z0-9_]*$",
                 message = "doit respecter le format module.feature.action")
        String name,
        @Size(max = 100) String page,
        @Size(max = 2000) String metadata
) {}
