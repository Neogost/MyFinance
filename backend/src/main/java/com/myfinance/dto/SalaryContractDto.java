package com.myfinance.dto;

import com.myfinance.domain.SalaryContract;

import java.time.LocalDate;

/**
 * DTO retourné par l'API — inclut les projections calculées à la volée (non persistées).
 */
public record SalaryContractDto(
        Long id,
        LocalDate startDate,
        LocalDate endDate,
        Float annualGrossSalary,
        Integer paidMonthsPerYear,
        Float weeklyHours,
        Float mealVoucherAmount,
        Float mealVoucherEmployeeRate,
        // ── Projections calculées ──────────────────────────────
        Float annualNetSalary,
        Float monthlyGrossSalary,
        Float monthlyNetSalary,
        Float annualWorkingHours,
        Float hourlyGrossSalary,
        Float hourlyNetSalary,
        Float dailyGrossSalary,
        Float dailyNetSalary,
        Float employeeMonthlyMealVoucherCost,
        Float employerMonthlyMealVoucherCost
) {
    public static SalaryContractDto from(SalaryContract c) {
        float annualNet      = c.getAnnualGrossSalary() * 0.75f;
        float workingHours   = c.getWeeklyHours() * (228f / 5f);
        float employeeRate   = c.getMealVoucherEmployeeRate() / 100f;

        return new SalaryContractDto(
                c.getId(),
                c.getStartDate(),
                c.getEndDate(),
                c.getAnnualGrossSalary(),
                c.getPaidMonthsPerYear(),
                c.getWeeklyHours(),
                c.getMealVoucherAmount(),
                c.getMealVoucherEmployeeRate(),
                // projections
                annualNet,
                c.getAnnualGrossSalary() / c.getPaidMonthsPerYear(),
                annualNet / c.getPaidMonthsPerYear(),
                workingHours,
                c.getAnnualGrossSalary() / workingHours,
                annualNet / workingHours,
                c.getAnnualGrossSalary() / 228f,
                annualNet / 228f,
                c.getMealVoucherAmount() * employeeRate * 19f,
                c.getMealVoucherAmount() * (1f - employeeRate) * 19f
        );
    }
}
