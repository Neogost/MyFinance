package com.myfinance.dto;

import com.myfinance.domain.BugReport;
import com.myfinance.domain.BugSeverity;
import com.myfinance.domain.BugStatus;
import com.myfinance.domain.VoteType;

import java.time.LocalDateTime;
import java.util.List;

public record BugReportDetailDto(
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
        VoteType userVote,    // vote courant de l'utilisateur connecté (null = pas voté)
        int commentCount,
        LocalDateTime createdAt,
        String reporterFirstName,
        List<BugCommentDto> comments
) {
    public static BugReportDetailDto from(BugReport b, int score, VoteType userVote,
                                          List<BugCommentDto> comments) {
        return new BugReportDetailDto(
                b.getId(), b.getTitle(), b.getDescription(),
                b.getExpectedResult(), b.getReproductionSteps(), b.getApproximateDateTime(),
                b.getUserImpact(), b.getPriority(), b.getStatus(),
                score, userVote, comments.size(), b.getCreatedAt(),
                b.getReporter().getFirstName(), comments
        );
    }
}
