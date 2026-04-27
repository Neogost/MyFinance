package com.myfinance.dto;

import com.myfinance.domain.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record UpdatePositionRequest(
        @Size(max = 200) String partner,
        @NotBlank @Size(max = 200) String label,
        @NotNull @Size(min = 3, max = 3) String currency,
        FiscalEnvelope fiscalEnvelope,
        // BOURSE / CRYPTO
        Long instrumentId,
        AssetSubType assetSubType,
        // IMMO_PHYSIQUE
        OwnershipType ownershipType,
        @Size(max = 300) String address,
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
