package com.myfinance.dto;

import com.myfinance.domain.AnalyticsEvent;
import com.myfinance.domain.EventType;

import java.time.LocalDateTime;

public record AnalyticsEventDto(
        Long id,
        Long userId,
        String sessionId,
        EventType eventType,
        String eventName,
        String page,
        String metadata,
        LocalDateTime createdAt
) {
    public static AnalyticsEventDto from(AnalyticsEvent e) {
        return new AnalyticsEventDto(
                e.getId(),
                e.getUser() != null ? e.getUser().getId() : null,
                e.getSessionId(),
                e.getEventType(),
                e.getEventName(),
                e.getPage(),
                e.getMetadata(),
                e.getCreatedAt()
        );
    }
}
