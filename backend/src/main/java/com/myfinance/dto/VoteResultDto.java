package com.myfinance.dto;

import com.myfinance.domain.VoteType;

public record VoteResultDto(int score, VoteType userVote) {}
