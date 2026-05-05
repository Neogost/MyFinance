package com.myfinance.dto;

import jakarta.validation.constraints.NotNull;

public record ConfirmCryptoHistoryRequest(
        @NotNull Boolean confirmed
) {}
