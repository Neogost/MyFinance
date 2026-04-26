package com.myfinance.dto;

public record UpdateFiscalProfileRequest(
        Float fiscalParts,
        Boolean useFlatRateDeduction,
        Float customProfessionalDeduction
) {}
