package com.myfinance.dto;

import com.myfinance.domain.AssetCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateInstrumentRequest(
        @NotNull AssetCategory category,
        String isin,
        String ticker,
        @NotBlank String name,
        @NotBlank String currency,
        Boolean stablePrice,
        String boursoramaSymbol
) {}
