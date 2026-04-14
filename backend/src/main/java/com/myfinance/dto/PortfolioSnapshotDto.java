package com.myfinance.dto;

import com.myfinance.domain.PortfolioSnapshot;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record PortfolioSnapshotDto(
        Long id,
        LocalDate snapshotDate,
        BigDecimal totalInvestedEur,
        BigDecimal totalCurrentValueEur,
        BigDecimal totalCapitalGainEur,
        String exchangeRatesJson,
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
                null,
                null
        );
    }

    /** Version complète avec tous les PositionSnapshot */
    public static PortfolioSnapshotDto from(PortfolioSnapshot snapshot) {
        List<PositionSnapshotDto> posSnapDtos = snapshot.getPositionSnapshots().stream()
                .map(PositionSnapshotDto::from)
                .toList();

        return new PortfolioSnapshotDto(
                snapshot.getId(),
                snapshot.getSnapshotDate(),
                snapshot.getTotalInvestedEur(),
                snapshot.getTotalCurrentValueEur(),
                snapshot.getTotalCapitalGainEur(),
                snapshot.getExchangeRatesJson(),
                posSnapDtos
        );
    }
}
