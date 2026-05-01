package com.myfinance.dto;

import com.myfinance.domain.ErrorLevel;
import com.myfinance.domain.ErrorSource;

import java.time.LocalDateTime;

public record ErrorGroupDto(
        String fingerprint,
        String errorType,
        ErrorSource source,
        ErrorLevel level,
        String message,
        LocalDateTime firstSeen,
        LocalDateTime lastSeen,
        long count
) {}
