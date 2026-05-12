package com.myfinance.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CreatePastDonationRequest(
        @NotNull Long recipientId,
        @NotNull @PastOrPresent LocalDate donationDate,
        @NotNull @Positive BigDecimal amountEur,
        String label
) {}
