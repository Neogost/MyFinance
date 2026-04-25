package com.myfinance.dto;

import com.myfinance.domain.PortfolioSnapshot;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

public record PortfolioSnapshotDto(
        Long id,
        LocalDate snapshotDate,
        BigDecimal totalInvestedEur,
        BigDecimal totalCurrentValueEur,
        BigDecimal totalCapitalGainEur,
        List<PositionSnapshotDto> positionSnapshots
) {
    /** Version sans détail des positionSnapshots — pour la liste */
    public static PortfolioSnapshotDto fromSummary(PortfolioSnapshot snapshot) {
        return new PortfolioSnapshotDto(
                snapshot.getId(),
                snapshot.getSnapshotDate(),
                snapshot.getTotalInvestedEur(),
                snapshot.getTotalCurrentValueEur(),
                snapshot.getTotalCapitalGainEur(),
                null
        );
    }

    /** Version complète avec tous les PositionSnapshot */
    public static PortfolioSnapshotDto from(PortfolioSnapshot snapshot) {
        List<PositionSnapshotDto> posSnapDtos = snapshot.getPositionSnapshots().stream()
                .map(PositionSnapshotDto::from)
                .filter(Objects::nonNull)
                .toList();

        return new PortfolioSnapshotDto(
                snapshot.getId(),
                snapshot.getSnapshotDate(),
                snapshot.getTotalInvestedEur(),
                snapshot.getTotalCurrentValueEur(),
                snapshot.getTotalCapitalGainEur(),
                posSnapDtos
        );
    }
}
