package com.myfinance.dto;

public record BulkSnapshotResultDto(
        int created,
        int skipped,
        int failed
) {}
