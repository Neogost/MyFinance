package com.myfinance.dto;

import com.myfinance.domain.OrderType;
import com.myfinance.domain.PositionOrder;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PositionOrderDto(
        Long id,
        OrderType orderType,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal amount,
        BigDecimal amountEur,
        LocalDate orderDate,
        String notes
) {
    public static PositionOrderDto from(PositionOrder order) {
        return new PositionOrderDto(
                order.getId(),
                order.getOrderType(),
                order.getQuantity(),
                order.getUnitPrice(),
                order.getAmount(),
                order.getAmountEur(),
                order.getOrderDate(),
                order.getNotes()
        );
    }
}
