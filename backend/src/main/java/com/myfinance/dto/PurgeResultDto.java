package com.myfinance.dto;

public record PurgeResultDto(int deletedEvents, int deletedErrors, int olderThanDays) {}
