package com.myfinance.dto;

import com.myfinance.domain.ErrorLevel;
import com.myfinance.domain.ErrorLog;
import com.myfinance.domain.ErrorSource;

import java.time.LocalDateTime;

public record ErrorLogDto(
        Long id,
        Long userId,
        String sessionId,
        ErrorSource source,
        ErrorLevel level,
        String errorType,
        String message,
        String stackTrace,
        String requestMethod,
        String requestPath,
        Integer httpStatus,
        String metadata,
        String fingerprint,
        LocalDateTime createdAt
) {
    public static ErrorLogDto from(ErrorLog e) {
        return new ErrorLogDto(
                e.getId(),
                e.getUser() != null ? e.getUser().getId() : null,
                e.getSessionId(),
                e.getSource(),
                e.getLevel(),
                e.getErrorType(),
                e.getMessage(),
                e.getStackTrace(),
                e.getRequestMethod(),
                e.getRequestPath(),
                e.getHttpStatus(),
                e.getMetadata(),
                e.getFingerprint(),
                e.getCreatedAt()
        );
    }
}
