package com.myfinance.dto;

import com.myfinance.domain.ContractTypeEnum;
import com.myfinance.domain.PublicSubTypeEnum;
import jakarta.validation.constraints.*;

import java.time.LocalDate;

public record CreateSalaryContractRequest(
        // Type de contrat — null traité comme PRIVATE pour compatibilité ascendante
        ContractTypeEnum contractType,
        // PRIVATE : requis. PUBLIC : ignoré (calculé depuis indiceMajore × valeur du point)
        @Positive Float annualGrossSalary,
        // PUBLIC uniquement
        PublicSubTypeEnum publicSubType,
        @Positive Integer indiceMajore,
        // Champs communs
        @Size(max = 200) String companyName,
        @NotNull LocalDate startDate,
        LocalDate endDate,
        @NotNull @Min(1) @Max(13) Integer paidMonthsPerYear,
        @NotNull @Positive Float weeklyHours,
        @NotNull @PositiveOrZero Float mealVoucherAmount,
        @NotNull @DecimalMin("0.0") @DecimalMax("100.0") Float mealVoucherEmployeeRate,
        Boolean isCadre,
        @DecimalMin("0.0") @DecimalMax("1.0") Float employeePrevoyanceRate
) {
    public boolean isPublic() {
        return contractType == ContractTypeEnum.PUBLIC;
    }
}
