package com.myfinance.dto;

import com.myfinance.domain.BugReport;
import com.myfinance.domain.BugSeverity;
import com.myfinance.domain.BugStatus;
import com.myfinance.domain.VoteType;

import java.time.LocalDateTime;

public record BugReportSummaryDto(
        Long id,
        String title,
        BugStatus status,
        BugSeverity userImpact,
        BugSeverity priority,
        int score,
        int commentCount,
        LocalDateTime createdAt,
        String reporterFirstName,
        VoteType userVote,      // vote de l'utilisateur courant (null = pas voté)
        boolean isReporter      // true si l'utilisateur courant est le reporter
) {
    public static BugReportSummaryDto from(BugReport b, int score, int commentCount,
                                           VoteType userVote, boolean isReporter) {
        return new BugReportSummaryDto(
                b.getId(), b.getTitle(), b.getStatus(), b.getUserImpact(), b.getPriority(),
                score, commentCount, b.getCreatedAt(), b.getReporter().getFirstName(),
                userVote, isReporter
        );
    }
}
