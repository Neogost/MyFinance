package com.myfinance.dto;

import com.myfinance.domain.SafetyNetMode;

public record UpdateSafetyNetRequest(
        SafetyNetMode safetyNetMode,   // null = supprimer la configuration
        Double safetyNetMonths,
        Double safetyNetAmount
) {}
