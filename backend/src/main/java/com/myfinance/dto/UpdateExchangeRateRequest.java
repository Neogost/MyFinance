package com.myfinance.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Requête de mise à jour d'un taux de change.
 * Effectue un upsert : création si la devise n'existe pas encore, mise à jour sinon.
 */
public record UpdateExchangeRateRequest(
        @NotBlank String currency,
        @NotNull @DecimalMin(value = "0.0", inclusive = false) BigDecimal rate
) {}
