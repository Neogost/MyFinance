package com.myfinance.dto;

import java.util.List;

public record AnalyticsHealthDto(
        long totalEvents7d,
        long totalErrors7d,
        long backendErrors7d,
        long frontendErrors7d,
        double errorRatePercent,
        List<ErrorGroupDto> top3Errors,
        List<TimelinePointDto> errorTimeline
) {
    public record TimelinePointDto(String day, String source, long count) {}
}
