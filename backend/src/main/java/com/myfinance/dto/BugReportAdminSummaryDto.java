package com.myfinance.dto;

import com.myfinance.domain.BugReport;
import com.myfinance.domain.BugSeverity;
import com.myfinance.domain.BugStatus;

import java.time.LocalDateTime;

public record BugReportAdminSummaryDto(
        Long id,
        String title,
        BugStatus status,
        BugSeverity userImpact,
        BugSeverity priority,
        int score,
        int commentCount,
        LocalDateTime createdAt,
        String reporterFirstName,
        String reporterLogin,
        String sessionId
) {
    public static BugReportAdminSummaryDto from(BugReport b, int score, int commentCount) {
        return new BugReportAdminSummaryDto(
                b.getId(), b.getTitle(), b.getStatus(),
                b.getUserImpact(), b.getPriority(),
                score, commentCount, b.getCreatedAt(),
                b.getReporter().getFirstName(), b.getReporter().getLogin(),
                b.getSessionId()
        );
    }
}
