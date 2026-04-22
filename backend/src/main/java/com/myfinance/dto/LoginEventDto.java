package com.myfinance.dto;

import com.myfinance.domain.LoginEvent;
import com.myfinance.domain.LoginEventType;

import java.time.LocalDateTime;

public record LoginEventDto(
        Long id,
        String login,
        LoginEventType eventType,
        String ipAddress,
        String userAgent,
        Integer failureCount,
        LocalDateTime timestamp
) {
    public static LoginEventDto from(LoginEvent e) {
        return new LoginEventDto(
                e.getId(),
                e.getLogin(),
                e.getEventType(),
                e.getIpAddress(),
                e.getUserAgent(),
                e.getFailureCount(),
                e.getTimestamp()
        );
    }
}
