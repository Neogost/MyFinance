package com.myfinance.dto;

import com.myfinance.domain.OrderType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record UpdatePositionOrderRequest(
        @NotNull OrderType orderType,
        BigDecimal quantity,          // obligatoire pour BOURSE et CRYPTO
        BigDecimal unitPrice,         // obligatoire pour BOURSE et CRYPTO
        @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
        @NotNull LocalDate orderDate,
        @Size(max = 2000) String notes
) {}
