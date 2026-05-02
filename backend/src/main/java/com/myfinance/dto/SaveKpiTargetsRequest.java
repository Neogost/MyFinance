package com.myfinance.dto;

import com.myfinance.domain.KpiType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record SaveKpiTargetsRequest(
        @NotNull
        Map<KpiType, @DecimalMin("0.0") @DecimalMax("100.0") Double> targets
) {}
