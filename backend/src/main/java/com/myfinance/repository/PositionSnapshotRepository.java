package com.myfinance.repository;

import com.myfinance.domain.PortfolioSnapshot;
import com.myfinance.domain.PositionSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PositionSnapshotRepository extends JpaRepository<PositionSnapshot, Long> {

    List<PositionSnapshot> findByPortfolioSnapshot(PortfolioSnapshot portfolioSnapshot);
}
