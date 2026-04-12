package com.myfinance.dto;

import com.myfinance.domain.SalaryRevision;

import java.time.LocalDate;

public record SalaryRevisionDto(
        Long id,
        LocalDate effectiveDate,
        Float annualGrossSalary,
        String label
) {
    public static SalaryRevisionDto from(SalaryRevision revision) {
        return new SalaryRevisionDto(
                revision.getId(),
                revision.getEffectiveDate(),
                revision.getAnnualGrossSalary(),
                revision.getLabel()
        );
    }
}
