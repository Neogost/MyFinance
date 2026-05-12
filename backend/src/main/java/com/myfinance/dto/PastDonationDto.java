package com.myfinance.dto;

import com.myfinance.domain.PastDonation;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PastDonationDto(
        Long id,
        Long recipientId,
        String recipientFirstName,
        LocalDate donationDate,
        BigDecimal amountEur,
        String label
) {
    public static PastDonationDto from(PastDonation d) {
        return new PastDonationDto(
                d.getId(),
                d.getRecipient().getId(),
                d.getRecipient().getFirstName(),
                d.getDonationDate(),
                d.getAmountEur(),
                d.getLabel()
        );
    }
}
