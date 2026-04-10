package com.myfinance.dto;

import com.myfinance.config.TaxParameters;
import com.myfinance.domain.SalaryContract;
import com.myfinance.service.NetImposableCalculator;

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
        Boolean isCadre,
        Float employeePrevoyanceRate,
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
    public static SalaryContractDto from(SalaryContract c, TaxParameters taxParams) {
        boolean isCadre    = Boolean.TRUE.equals(c.getIsCadre());
        float annualNet    = NetImposableCalculator.calculer(
                c.getAnnualGrossSalary(), isCadre, c.getEmployeePrevoyanceRate(), taxParams);
        float workingHours = c.getWeeklyHours() * (228f / 5f);
        float employeeRate = c.getMealVoucherEmployeeRate() / 100f;

        return new SalaryContractDto(
                c.getId(),
                c.getStartDate(),
                c.getEndDate(),
                c.getAnnualGrossSalary(),
                c.getPaidMonthsPerYear(),
                c.getWeeklyHours(),
                c.getMealVoucherAmount(),
                c.getMealVoucherEmployeeRate(),
                c.getIsCadre(),
                c.getEmployeePrevoyanceRate(),
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
