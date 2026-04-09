package com.myfinance.dto;

import com.myfinance.domain.ContractBenefit;

public record ContractBenefitDto(
        Long id,
        String label,
        Float monthlyAmount
) {
    public static ContractBenefitDto from(ContractBenefit benefit) {
        return new ContractBenefitDto(
                benefit.getId(),
                benefit.getLabel(),
                benefit.getMonthlyAmount()
        );
    }
}
