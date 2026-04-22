package com.myfinance.dto;

import com.myfinance.domain.Debt;
import com.myfinance.domain.DebtTypeEnum;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

public record DebtDto(
        Long id,
        DebtTypeEnum type,
        String label,
        String lender,
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal initialCapital,
        BigDecimal annualRate,
        BigDecimal insuranceRate,
        BigDecimal monthlyPayment,
        BigDecimal remainingCapital,
        boolean projectionMode,          // true = automatique, false = override manuel
        BigDecimal monthlyInsuranceCost,
        BigDecimal monthlyTotalCost,
        BigDecimal repaymentProgress,    // % remboursé (0–100)
        Long positionId,
        String currency,
        LocalDateTime createdAt,
        List<AmortizationEntry> nextMonthsSchedule
) {

    public record AmortizationEntry(
            String month,
            BigDecimal payment,
            BigDecimal interest,
            BigDecimal capital,
            BigDecimal remainingCapital
    ) {}

    public static DebtDto from(Debt debt) {
        boolean isProjection = debt.getRemainingCapitalOverride() == null;
        BigDecimal remaining = isProjection
                ? computeProjectedBalance(debt.getInitialCapital(), debt.getAnnualRate(),
                                          debt.getMonthlyPayment(), debt.getStartDate())
                : debt.getRemainingCapitalOverride();

        // Fallback si la projection n'est pas calculable
        if (remaining == null) {
            remaining = debt.getInitialCapital();
            isProjection = false;
        }

        BigDecimal insurance = computeMonthlyInsurance(debt.getInitialCapital(), debt.getInsuranceRate());
        BigDecimal totalCost = debt.getMonthlyPayment() != null
                ? debt.getMonthlyPayment().add(insurance).setScale(2, RoundingMode.HALF_UP)
                : insurance;

        BigDecimal progress = debt.getInitialCapital().compareTo(BigDecimal.ZERO) > 0
                ? debt.getInitialCapital().subtract(remaining)
                        .divide(debt.getInitialCapital(), 4, RoundingMode.HALF_UP)
                        .multiply(new BigDecimal("100")).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        List<AmortizationEntry> schedule = computeSchedule(remaining, debt.getAnnualRate(), debt.getMonthlyPayment());

        return new DebtDto(
                debt.getId(),
                debt.getType(),
                debt.getLabel(),
                debt.getLender(),
                debt.getStartDate(),
                debt.getEndDate(),
                debt.getInitialCapital(),
                debt.getAnnualRate(),
                debt.getInsuranceRate(),
                debt.getMonthlyPayment(),
                remaining,
                isProjection,
                insurance,
                totalCost,
                progress,
                debt.getPositionId(),
                debt.getCurrency(),
                debt.getCreatedAt(),
                schedule
        );
    }

    // ── Calculs ────────────────────────────────────────────────

    // Formule d'amortissement à taux fixe : B(n) = P*(1+r)^n - M*((1+r)^n - 1)/r
    static BigDecimal computeProjectedBalance(BigDecimal initialCapital,
                                              BigDecimal annualRate,
                                              BigDecimal monthlyPayment,
                                              LocalDate startDate) {
        if (initialCapital == null || annualRate == null || monthlyPayment == null || startDate == null) {
            return null;
        }
        long n = ChronoUnit.MONTHS.between(startDate, LocalDate.now());
        if (n <= 0) return initialCapital.setScale(2, RoundingMode.HALF_UP);

        if (annualRate.compareTo(BigDecimal.ZERO) == 0) {
            BigDecimal remaining = initialCapital.subtract(monthlyPayment.multiply(new BigDecimal(n)));
            return remaining.max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal r = annualRate.divide(new BigDecimal("12"), 10, RoundingMode.HALF_UP);
        BigDecimal pow = BigDecimal.ONE.add(r).pow((int) Math.min(n, 600), MathContext.DECIMAL128);
        BigDecimal term1 = initialCapital.multiply(pow);
        BigDecimal term2 = monthlyPayment.multiply(pow.subtract(BigDecimal.ONE))
                .divide(r, 10, RoundingMode.HALF_UP);
        return term1.subtract(term2).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
    }

    static BigDecimal computeMonthlyInsurance(BigDecimal initialCapital, BigDecimal insuranceRate) {
        if (initialCapital == null || insuranceRate == null) return BigDecimal.ZERO;
        return initialCapital.multiply(insuranceRate)
                .divide(new BigDecimal("12"), 2, RoundingMode.HALF_UP);
    }

    static List<AmortizationEntry> computeSchedule(BigDecimal currentBalance,
                                                    BigDecimal annualRate,
                                                    BigDecimal monthlyPayment) {
        if (currentBalance == null || annualRate == null || monthlyPayment == null
                || currentBalance.compareTo(BigDecimal.ZERO) <= 0) {
            return List.of();
        }
        BigDecimal r = annualRate.divide(new BigDecimal("12"), 10, RoundingMode.HALF_UP);
        List<AmortizationEntry> entries = new ArrayList<>();
        BigDecimal balance = currentBalance;
        YearMonth month = YearMonth.now().plusMonths(1);

        for (int i = 0; i < 12 && balance.compareTo(BigDecimal.ZERO) > 0; i++) {
            BigDecimal interest = annualRate.compareTo(BigDecimal.ZERO) == 0
                    ? BigDecimal.ZERO
                    : balance.multiply(r).setScale(2, RoundingMode.HALF_UP);
            BigDecimal actualPayment = monthlyPayment.min(balance.add(interest));
            BigDecimal capitalPortion = actualPayment.subtract(interest).setScale(2, RoundingMode.HALF_UP);
            balance = balance.subtract(capitalPortion).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
            entries.add(new AmortizationEntry(month.toString(), actualPayment, interest, capitalPortion, balance));
            month = month.plusMonths(1);
        }
        return entries;
    }
}
