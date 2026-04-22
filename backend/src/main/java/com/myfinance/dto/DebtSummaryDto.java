package com.myfinance.dto;

import java.math.BigDecimal;
import java.util.List;

public record DebtSummaryDto(
        int totalCount,
        BigDecimal totalRemainingCapital,
        BigDecimal totalMonthlyPayment,
        BigDecimal totalMonthlyInsurance,
        BigDecimal totalMonthlyCost,
        List<DebtTypeSummaryDto> byType
) {}
