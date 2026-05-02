package com.myfinance.dto;

import com.myfinance.domain.BreakdownDimension;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record TargetBreakdownInput(
        @NotNull BreakdownDimension dimension,
        @NotBlank @Size(max = 100, message = "Clé limitée à 100 caractères") String key,
        @NotNull
        @DecimalMin(value = "0.0", message = "Pourcentage minimum 0")
        @DecimalMax(value = "100.0", message = "Pourcentage maximum 100")
        BigDecimal targetPercentage
) {}
