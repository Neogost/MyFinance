package com.myfinance.dto;

import com.myfinance.domain.BugSeverity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record UpdateBugReportAdminRequest(
        @NotBlank @Size(max = 200) String title,
        @NotBlank @Size(max = 3000) String description,
        @Size(max = 2000) String expectedResult,
        @Size(max = 3000) String reproductionSteps,
        LocalDateTime approximateDateTime,
        @NotNull BugSeverity userImpact
) {}
