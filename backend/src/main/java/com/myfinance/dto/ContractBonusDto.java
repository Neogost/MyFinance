package com.myfinance.dto;

import com.myfinance.domain.BonusTypeEnum;
import com.myfinance.domain.ContractBonus;

import java.time.LocalDate;

public record ContractBonusDto(
        Long id,
        String label,
        Float grossAmount,
        BonusTypeEnum type,
        LocalDate paymentDate,   // non null si type = EXCEPTIONNELLE
        Integer paymentMonth     // non null si type = ANNUELLE (1–12)
) {
    public static ContractBonusDto from(ContractBonus bonus) {
        return new ContractBonusDto(
                bonus.getId(),
                bonus.getLabel(),
                bonus.getGrossAmount(),
                bonus.getType(),
                bonus.getPaymentDate(),
                bonus.getPaymentMonth()
        );
    }
}
