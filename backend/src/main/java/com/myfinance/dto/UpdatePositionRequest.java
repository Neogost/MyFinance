package com.myfinance.dto;

import com.myfinance.domain.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record UpdatePositionRequest(
        String partner,
        @NotBlank String label,
        @NotNull String currency,
        FiscalEnvelope fiscalEnvelope,
        // BOURSE / CRYPTO
        Long instrumentId,
        AssetSubType assetSubType,
        // IMMO_PHYSIQUE
        OwnershipType ownershipType,
        String address,
        @DecimalMin(value = "0.0", inclusive = true) BigDecimal estimatedCurrentValue,
        LocalDate acquisitionDate,
        @DecimalMin(value = "0.0", inclusive = true) BigDecimal acquisitionPrice,
        // IMMO_PAPIER
        @DecimalMin(value = "0.0", inclusive = true) BigDecimal commissionRate,
        // LIVRET
        @DecimalMin(value = "0.0", inclusive = true) BigDecimal annualRate,
        // Options
        Boolean includeInIncomeProjection
) {}
