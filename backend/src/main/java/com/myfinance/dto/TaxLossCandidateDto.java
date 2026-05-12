package com.myfinance.dto;

import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.FiscalEnvelope;

import java.math.BigDecimal;

public record TaxLossCandidateDto(
        Long positionId,
        String label,
        String partner,
        AssetCategory category,
        FiscalEnvelope envelope,
        BigDecimal currentQuantity,
        BigDecimal unrealizedLossEur,           // négatif
        BigDecimal recommendedSellQuantity,     // parts à vendre pour optimiser
        BigDecimal recommendedRealizedLossEur,  // MV qui sera réalisée (négatif)
        BigDecimal estimatedTaxSavingEur        // économie sur cette position
) {}
