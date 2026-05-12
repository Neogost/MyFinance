package com.myfinance.dto;

import java.math.BigDecimal;

public record TaxLossSummaryDto(
        BasketAnalysisDto cto,
        BasketAnalysisDto crypto,
        int year,
        String taxOption,              // "PFU" ou "BAREME"
        Float tmi,                     // TMI en % (null si PFU)
        BigDecimal mvReporteesCtoEur,  // MV CTO reportées saisies par l'utilisateur
        BigDecimal mvReporteesCryptoEur
) {}
