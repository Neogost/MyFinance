package com.myfinance.dto;

import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.PortfolioSnapshot;
import com.myfinance.domain.PositionSnapshot;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record AdminSnapshotDetailDto(
        Long id,
        LocalDate snapshotDate,
        BigDecimal totalInvestedEur,
        BigDecimal totalCurrentValueEur,
        BigDecimal totalCapitalGainEur,
        Long userId,
        String userFullName,
        List<PositionEntry> positions
) {
    public record PositionEntry(
            Long id,
            Long positionId,
            String positionLabel,
            String positionPartner,
            AssetCategory positionCategory,
            BigDecimal investedAmountEur,
            BigDecimal currentValueEur,
            BigDecimal capitalGainEur,
            BigDecimal units,
            BigDecimal unitPriceEur
    ) {
        public static PositionEntry from(PositionSnapshot snap) {
            return new PositionEntry(
                    snap.getId(),
                    snap.getPosition().getId(),
                    snap.getPosition().getLabel(),
                    snap.getPosition().getPartner(),
                    snap.getPosition().getCategory(),
                    snap.getInvestedAmountEur(),
                    snap.getCurrentValueEur(),
                    snap.getCapitalGainEur(),
                    snap.getUnits(),
                    snap.getUnitPriceEur()
            );
        }
    }

    public static AdminSnapshotDetailDto from(PortfolioSnapshot snapshot) {
        List<PositionEntry> entries = snapshot.getPositionSnapshots().stream()
                .map(PositionEntry::from)
                .toList();

        return new AdminSnapshotDetailDto(
                snapshot.getId(),
                snapshot.getSnapshotDate(),
                snapshot.getTotalInvestedEur(),
                snapshot.getTotalCurrentValueEur(),
                snapshot.getTotalCapitalGainEur(),
                snapshot.getUser().getId(),
                snapshot.getUser().getFirstName() + " " + snapshot.getUser().getLastName(),
                entries
        );
    }

    /** Version résumée sans le détail des positions — pour la liste */
    public static AdminSnapshotDetailDto fromSummary(PortfolioSnapshot snapshot) {
        return new AdminSnapshotDetailDto(
                snapshot.getId(),
                snapshot.getSnapshotDate(),
                snapshot.getTotalInvestedEur(),
                snapshot.getTotalCurrentValueEur(),
                snapshot.getTotalCapitalGainEur(),
                snapshot.getUser().getId(),
                snapshot.getUser().getFirstName() + " " + snapshot.getUser().getLastName(),
                null
        );
    }
}
