package com.myfinance.dto;

import com.myfinance.domain.OtherIncome;
import com.myfinance.domain.OtherIncomeTypeEnum;

import java.time.LocalDate;

public record OtherIncomeDto(
        Long id,
        OtherIncomeTypeEnum type,
        String label,
        Float amount,
        LocalDate date
) {
    public static OtherIncomeDto from(OtherIncome income) {
        return new OtherIncomeDto(
                income.getId(),
                income.getType(),
                income.getLabel(),
                income.getAmount(),
                income.getDate()
        );
    }
}
