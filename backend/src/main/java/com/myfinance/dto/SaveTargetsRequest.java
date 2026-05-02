package com.myfinance.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;

public record SaveTargetsRequest(
        @Size(max = 20, message = "Au maximum 20 catégories d'objectifs autorisées")
        Map<
                @Size(max = 50, message = "Nom de catégorie limité à 50 caractères") String,
                @PositiveOrZero @DecimalMax(value = "1000000000", message = "Montant limité à 1 milliard €") Double
        > targets,

        @Size(max = 20)
        Map<
                @Size(max = 50) String,
                @PositiveOrZero @DecimalMax(value = "1000000000") Double
        > maxTargets,

        @Size(max = 20, message = "Au maximum 20 catégories de répartitions autorisées")
        Map<
                @Size(max = 50) String,
                @Size(max = 50, message = "Au maximum 50 sous-objectifs par catégorie") List<@Valid TargetBreakdownInput>
        > breakdowns
) {}
