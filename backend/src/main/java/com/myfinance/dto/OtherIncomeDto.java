package com.myfinance.dto;

import com.myfinance.domain.OtherIncome;
import com.myfinance.domain.OtherIncomeTypeEnum;

import java.time.LocalDate;

public record OtherIncomeDto(
        Long id,
        OtherIncomeTypeEnum type,
        String label,
        Float amount,
        LocalDate date,
        Boolean isTaxable,
        Float specificTaxRate
) {
    public static OtherIncomeDto from(OtherIncome income) {
        // isTaxable null en base (revenus antérieurs) → traité comme imposable par défaut
        Boolean taxable = income.getIsTaxable() != null ? income.getIsTaxable() : Boolean.TRUE;
        return new OtherIncomeDto(
                income.getId(),
                income.getType(),
                income.getLabel(),
                income.getAmount(),
                income.getDate(),
                taxable,
                income.getSpecificTaxRate()
        );
    }
}
