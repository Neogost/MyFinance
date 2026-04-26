package com.myfinance.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

public record UpdateFiscalProfileRequest(
        @Positive @DecimalMax(value = "20", message = "fiscalParts ne peut excéder 20 parts")
        Float fiscalParts,

        Boolean useFlatRateDeduction,

        @PositiveOrZero @Max(value = 1_000_000, message = "realExpensesTransportKm ne peut excéder 1 000 000 km/an")
        Integer realExpensesTransportKm,

        @Min(1) @Max(100)
        Integer realExpensesTransportCv,

        Boolean realExpensesTransportElectric,

        @PositiveOrZero @DecimalMax("10000000")
        Float realExpensesPublicTransport,

        @PositiveOrZero @DecimalMax("10000000")
        Float realExpensesMeals,

        @PositiveOrZero @DecimalMax("10000000")
        Float realExpensesClothing,

        @PositiveOrZero @DecimalMax("10000000")
        Float realExpensesTraining,

        @PositiveOrZero @DecimalMax("10000000")
        Float realExpensesEquipment,

        @PositiveOrZero @DecimalMax("10000000")
        Float realExpensesPhone,

        @PositiveOrZero @DecimalMax("10000000")
        Float realExpensesDoubleResidence,

        @PositiveOrZero @DecimalMax("10000000")
        Float realExpensesOther,

        @PositiveOrZero @Max(366)
        Integer realExpensesTeleworkDays,

        @PositiveOrZero @DecimalMax("1000")
        Float realExpensesTeleworkEmployerDaily
) {}
