package com.myfinance.dto;

import com.myfinance.domain.OtherIncome;
import com.myfinance.domain.OtherIncomeTypeEnum;

import java.time.LocalDate;

public record OtherIncomeDto(
        Long id,
        OtherIncomeTypeEnum type,
        String label,
        Float amount,
        LocalDate date,
        Boolean isTaxable,
        Float specificTaxRate,
        Long positionId,           // bien IMMO_PHYSIQUE associé (LOCATIF uniquement, nullable)
        String positionLabel       // libellé du bien pour l'affichage
) {
    public static OtherIncomeDto from(OtherIncome income) {
        Boolean taxable = income.getIsTaxable() != null ? income.getIsTaxable() : Boolean.TRUE;

        // Garde défensive : le bien peut être supprimé sans que le FK soit nettoyé (SQLite sans foreign_keys)
        Long positionId = null;
        String positionLabel = null;
        try {
            if (income.getPosition() != null) {
                positionId    = income.getPosition().getId();
                positionLabel = income.getPosition().getLabel();
            }
        } catch (Exception ignored) {
            // proxy Hibernate vers un bien supprimé — on renvoie null proprement
        }

        return new OtherIncomeDto(
                income.getId(),
                income.getType(),
                income.getLabel(),
                income.getAmount(),
                income.getDate(),
                taxable,
                income.getSpecificTaxRate(),
                positionId,
                positionLabel
        );
    }
}
