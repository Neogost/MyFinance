package com.myfinance.dto;

import com.myfinance.domain.MonthlyPaySlip;

import java.time.LocalDate;

public record MonthlyPaySlipDto(
        Long id,
        LocalDate period,
        Float grossSalary,
        Float taxableNetSalary,
        Float netSalary,
        Float incomeTaxWithholding
) {
    public static MonthlyPaySlipDto from(MonthlyPaySlip slip) {
        return new MonthlyPaySlipDto(
                slip.getId(),
                slip.getPeriod(),
                slip.getGrossSalary(),
                slip.getTaxableNetSalary(),
                slip.getNetSalary(),
                slip.getIncomeTaxWithholding()
        );
    }
}
