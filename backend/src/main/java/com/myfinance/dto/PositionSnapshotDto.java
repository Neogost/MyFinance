package com.myfinance.dto;

import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.PositionSnapshot;

import java.math.BigDecimal;

public record PositionSnapshotDto(
        Long id,
        PositionRefDto position,
        BigDecimal investedAmountEur,
        BigDecimal currentValueEur,
        BigDecimal capitalGainEur,
        BigDecimal units,
        BigDecimal unitPriceEur
) {
    public static PositionSnapshotDto from(PositionSnapshot snap) {
        return new PositionSnapshotDto(
                snap.getId(),
                new PositionRefDto(
                        snap.getPosition().getId(),
                        snap.getPosition().getLabel(),
                        snap.getPosition().getCategory()
                ),
                snap.getInvestedAmountEur(),
                snap.getCurrentValueEur(),
                snap.getCapitalGainEur(),
                snap.getUnits(),
                snap.getUnitPriceEur()
        );
    }

    public record PositionRefDto(Long id, String label, AssetCategory category) {}
}
