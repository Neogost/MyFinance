package com.myfinance.dto;

import com.myfinance.domain.MonthlyPaySlip;

import java.time.LocalDate;

public record SalaryEvolutionPointDto(
        LocalDate period,
        String companyName,
        Float grossSalary,
        Float taxableNetSalary,
        Float netSalary,
        Float incomeTaxWithholding
) {
    public static SalaryEvolutionPointDto from(MonthlyPaySlip slip) {
        return new SalaryEvolutionPointDto(
                slip.getPeriod(),
                slip.getContract().getCompanyName(),
                slip.getGrossSalary(),
                slip.getTaxableNetSalary(),
                slip.getNetSalary(),
                slip.getIncomeTaxWithholding()
        );
    }
}
