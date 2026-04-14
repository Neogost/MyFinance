package com.myfinance.repository;

import com.myfinance.domain.PortfolioSnapshot;
import com.myfinance.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PortfolioSnapshotRepository extends JpaRepository<PortfolioSnapshot, Long> {

    List<PortfolioSnapshot> findByUserOrderBySnapshotDateDesc(User user);

    /** Vérifie si un snapshot existe déjà pour le même mois (même année + même mois) */
    Optional<PortfolioSnapshot> findByUserAndSnapshotDateBetween(
            User user, LocalDate start, LocalDate end);
}
