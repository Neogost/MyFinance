package com.myfinance.dto;

import com.myfinance.domain.DebtBalanceEntry;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record DebtBalanceEntryDto(
        Long id,
        LocalDate entryDate,
        BigDecimal balance,
        String note,
        LocalDateTime createdAt
) {
    public static DebtBalanceEntryDto from(DebtBalanceEntry entry) {
        return new DebtBalanceEntryDto(
                entry.getId(),
                entry.getEntryDate(),
                entry.getBalance(),
                entry.getNote(),
                entry.getCreatedAt()
        );
    }
}
