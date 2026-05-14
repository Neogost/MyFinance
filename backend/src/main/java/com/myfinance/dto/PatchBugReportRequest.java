package com.myfinance.dto;

import com.myfinance.domain.BugSeverity;
import com.myfinance.domain.BugStatus;

// Champs optionnels — au moins un doit être non-null (validé dans le service)
public record PatchBugReportRequest(
        BugStatus status,
        BugSeverity priority
) {}
