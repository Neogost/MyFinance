package com.myfinance.dto;

import com.myfinance.domain.VoteType;
import jakarta.validation.constraints.NotNull;

public record VoteRequest(@NotNull VoteType voteType) {}
