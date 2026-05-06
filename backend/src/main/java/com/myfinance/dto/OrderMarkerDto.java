package com.myfinance.dto;

import com.myfinance.domain.OrderType;
import com.myfinance.domain.PositionOrder;

import java.math.BigDecimal;
import java.time.LocalDate;

public record OrderMarkerDto(
        LocalDate date,
        OrderType orderType,
        BigDecimal amountEur,
        BigDecimal quantity,
        String positionLabel
) {
    public static OrderMarkerDto from(PositionOrder o) {
        return new OrderMarkerDto(
                o.getOrderDate(),
                o.getOrderType(),
                o.getAmountEur(),
                o.getQuantity(),
                o.getPosition().getLabel()
        );
    }
}
