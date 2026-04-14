package com.myfinance.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record CreateSnapshotRequest(
        @NotNull LocalDate snapshotDate
) {}
