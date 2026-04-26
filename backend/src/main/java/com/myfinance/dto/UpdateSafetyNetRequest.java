package com.myfinance.dto;

import com.myfinance.domain.SafetyNetMode;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.PositiveOrZero;

public record UpdateSafetyNetRequest(
        SafetyNetMode safetyNetMode,   // null = supprimer la configuration

        @PositiveOrZero
        @DecimalMax(value = "120", message = "safetyNetMonths ne peut excéder 120 mois")
        Double safetyNetMonths,

        @PositiveOrZero
        @DecimalMax(value = "100000000", message = "safetyNetAmount ne peut excéder 100 000 000 €")
        Double safetyNetAmount
) {}
