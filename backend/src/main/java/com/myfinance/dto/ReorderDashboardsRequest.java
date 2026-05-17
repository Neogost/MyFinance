package com.myfinance.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ReorderDashboardsRequest(
        @NotNull List<Long> orderedIds
) {}
