package com.myfinance.dto;

import com.myfinance.domain.OrderType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CreatePositionOrderRequest(
        @NotNull OrderType orderType,
        BigDecimal quantity,          // obligatoire pour BOURSE et CRYPTO, null pour LIVRET/IMMO_PAPIER
        BigDecimal unitPrice,         // obligatoire pour BOURSE et CRYPTO, null pour LIVRET/IMMO_PAPIER
        @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
        @NotNull LocalDate orderDate,
        String notes
) {}
