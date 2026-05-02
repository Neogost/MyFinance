package com.myfinance.repository;

import com.myfinance.domain.PatrimoineTarget;
import com.myfinance.domain.PatrimoineTargetBreakdown;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PatrimoineTargetBreakdownRepository extends JpaRepository<PatrimoineTargetBreakdown, Long> {

    List<PatrimoineTargetBreakdown> findByTargetIn(List<PatrimoineTarget> targets);

    void deleteByTargetIn(List<PatrimoineTarget> targets);
}
