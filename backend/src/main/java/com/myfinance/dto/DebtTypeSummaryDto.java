package com.myfinance.dto;

import com.myfinance.domain.DebtTypeEnum;

import java.math.BigDecimal;

public record DebtTypeSummaryDto(
        DebtTypeEnum type,
        int count,
        BigDecimal totalRemainingCapital,
        BigDecimal totalMonthlyPayment,
        BigDecimal totalMonthlyInsurance
) {}
