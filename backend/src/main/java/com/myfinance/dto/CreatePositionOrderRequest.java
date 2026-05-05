package com.myfinance.dto;

import com.myfinance.domain.CryptoOperationTypeEnum;
import com.myfinance.domain.OrderType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CreatePositionOrderRequest(
        @NotNull OrderType orderType,
        BigDecimal quantity,          // obligatoire pour BOURSE et CRYPTO, null pour LIVRET/IMMO_PAPIER
        BigDecimal unitPrice,         // obligatoire pour BOURSE et CRYPTO, null pour LIVRET/IMMO_PAPIER
        @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
        @NotNull LocalDate orderDate,
        @Size(max = 2000) String notes,
        // ── Fiscalité crypto ──────────────────────────────────────
        CryptoOperationTypeEnum cryptoOperationType,
        /** Pour SWAP_OUT uniquement : id de la position de destination pour créer l'ordre SWAP_IN jumeau. */
        Long swapCounterpartPositionId,
        /** Pour SWAP_OUT : quantité reçue sur la position de destination. */
        @Positive BigDecimal swapCounterpartQuantity,
        /** Pour SWAP_OUT : montant dans la devise de la position de destination. */
        @Positive BigDecimal swapCounterpartAmount,
        /** Override manuel de la VGP pour un SELL_FIAT (si cours historiques indisponibles). */
        @Positive BigDecimal portfolioValueAtDateEur
) {}
