package com.myfinance.dto;

public record EngagementSummaryDto(
        long totalEvents,
        long uniqueSessions,
        double avgEventsPerSession
) {}
