package com.myfinance.repository;

import com.myfinance.domain.PortfolioSnapshot;
import com.myfinance.domain.Position;
import com.myfinance.domain.PositionSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PositionSnapshotRepository extends JpaRepository<PositionSnapshot, Long> {

    List<PositionSnapshot> findByPortfolioSnapshot(PortfolioSnapshot portfolioSnapshot);

    void deleteByPosition(Position position);

    void deleteByPositionIn(List<Position> positions);

    /**
     * Charge en batch les snapshots de valorisation pour une liste de positions IMMO_PAPIER.
     * Triés par date de snapshot croissante — utilisé dans le calcul de performance (interpolation).
     */
    @Query("SELECT ps FROM PositionSnapshot ps " +
           "JOIN FETCH ps.portfolioSnapshot pp " +
           "WHERE ps.position IN :positions " +
           "ORDER BY pp.snapshotDate ASC")
    List<PositionSnapshot> findByPositionInOrderBySnapshotDateAsc(@Param("positions") List<Position> positions);
}
