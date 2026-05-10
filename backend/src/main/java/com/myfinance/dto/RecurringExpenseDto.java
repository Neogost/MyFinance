package com.myfinance.dto;

import com.myfinance.domain.ExpenseCategoryEnum;
import com.myfinance.domain.FrequencyEnum;
import com.myfinance.domain.RecurringExpense;

import java.time.LocalDate;

public record RecurringExpenseDto(
        Long id,
        ExpenseCategoryEnum category,
        String label,
        Float amount,
        FrequencyEnum frequency,
        Float sharePercentage,
        Float monthlyAmount,
        Float annualAmount,
        LocalDate startDate,
        LocalDate endDate,
        String notes,
        Integer paymentDay
) {
    public static RecurringExpenseDto from(RecurringExpense e) {
        float effective = e.getAmount() * (e.getSharePercentage() / 100f);
        float monthly   = e.getFrequency() == FrequencyEnum.MONTHLY ? effective : effective / 12f;
        float annual    = e.getFrequency() == FrequencyEnum.ANNUAL  ? effective : effective * 12f;

        return new RecurringExpenseDto(
                e.getId(),
                e.getCategory(),
                e.getLabel(),
                e.getAmount(),
                e.getFrequency(),
                e.getSharePercentage(),
                monthly,
                annual,
                e.getStartDate(),
                e.getEndDate(),
                e.getNotes(),
                e.getPaymentDay()
        );
    }
}
