package com.myfinance.dto;

import com.myfinance.domain.BugReport;
import com.myfinance.domain.BugSeverity;
import com.myfinance.domain.BugStatus;

import java.time.LocalDateTime;
import java.util.List;

public record BugReportAdminDetailDto(
        Long id,
        String title,
        String description,
        String expectedResult,
        String reproductionSteps,
        LocalDateTime approximateDateTime,
        BugSeverity userImpact,
        BugSeverity priority,
        BugStatus status,
        int score,
        int commentCount,
        LocalDateTime createdAt,
        String reporterFirstName,
        String reporterLogin,
        String sessionId,
        String browserInfo,
        List<BugCommentDto> comments   // authorDisplay = login [ROLE]
) {
    public static BugReportAdminDetailDto from(BugReport b, int score, List<BugCommentDto> comments) {
        return new BugReportAdminDetailDto(
                b.getId(), b.getTitle(), b.getDescription(),
                b.getExpectedResult(), b.getReproductionSteps(), b.getApproximateDateTime(),
                b.getUserImpact(), b.getPriority(), b.getStatus(),
                score, comments.size(), b.getCreatedAt(),
                b.getReporter().getFirstName(), b.getReporter().getLogin(),
                b.getSessionId(), b.getBrowserInfo(), comments
        );
    }
}
