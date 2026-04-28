package com.myfinance.repository;

import com.myfinance.domain.PortfolioSnapshot;
import com.myfinance.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PortfolioSnapshotRepository extends JpaRepository<PortfolioSnapshot, Long> {

    List<PortfolioSnapshot> findByUserOrderBySnapshotDateDesc(User user);

    /** Vérifie si un snapshot existe déjà pour le même mois (même année + même mois) */
    Optional<PortfolioSnapshot> findByUserAndSnapshotDateBetween(
            User user, LocalDate start, LocalDate end);

    /** Charge les snapshots avec leurs position-snapshots (et la position associée) en une seule requête. */
    @Query("SELECT ps FROM PortfolioSnapshot ps " +
           "LEFT JOIN FETCH ps.positionSnapshots pss " +
           "LEFT JOIN FETCH pss.position " +
           "WHERE ps.user = :user " +
           "ORDER BY ps.snapshotDate ASC")
    List<PortfolioSnapshot> findByUserWithPositionsOrderBySnapshotDateAsc(@Param("user") User user);
}
