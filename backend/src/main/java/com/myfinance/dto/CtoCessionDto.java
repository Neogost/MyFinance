package com.myfinance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CtoCessionDto(
        Long positionId,
        String positionLabel,
        String partner,
        LocalDate cessionDate,
        BigDecimal quantity,
        BigDecimal sellAmountEur,     // produit de cession
        BigDecimal costBasisEur,      // coût d'acquisition (CMP × quantité)
        BigDecimal capitalGainEur,    // sellAmount - costBasis (positif = gain, négatif = perte)
        BigDecimal runningTotalEur    // cumul des PV/MV jusqu'à cette ligne
) {}
