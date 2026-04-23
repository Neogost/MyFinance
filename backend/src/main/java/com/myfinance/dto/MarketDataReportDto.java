package com.myfinance.dto;

import java.time.LocalDateTime;
import java.util.List;

public record MarketDataReportDto(
        int instrumentsResolved,
        int instrumentsUpdated,
        int instrumentsFailed,
        int ratesUpdated,
        int snapshotsCreated,
        int snapshotsSkipped,
        int snapshotsFailed,
        List<String> errors,
        LocalDateTime executedAt
) {}
