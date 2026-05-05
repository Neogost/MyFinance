package com.myfinance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CryptoCessionDto(
        Long orderId,
        LocalDate cessionDate,
        String instrumentLabel,
        BigDecimal amountSold,
        BigDecimal prixDeCessionEur,
        BigDecimal ptaAvantCession,
        BigDecimal vgpEur,
        boolean vgpFromManualOverride,
        BigDecimal plusValueEur,
        BigDecimal ptaApresCession,
        String notes
) {}
