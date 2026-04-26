package com.myfinance.dto;

public record UpdateFiscalProfileRequest(
        Float fiscalParts,
        Boolean useFlatRateDeduction,
        Integer realExpensesTransportKm,
        Integer realExpensesTransportCv,
        Boolean realExpensesTransportElectric,
        Float realExpensesPublicTransport,
        Float realExpensesMeals,
        Float realExpensesClothing,
        Float realExpensesTraining,
        Float realExpensesEquipment,
        Float realExpensesPhone,
        Float realExpensesDoubleResidence,
        Float realExpensesOther,
        Integer realExpensesTeleworkDays,
        Float realExpensesTeleworkEmployerDaily
) {}
