package com.myfinance.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public record ManualSnapshotRequest(
        @NotNull Long userId,
        @NotNull LocalDate snapshotDate,
        @NotNull @Valid List<ManualPositionSnapshotRequest> positions
) {}
