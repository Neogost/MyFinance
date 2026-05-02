package com.myfinance.repository;

import com.myfinance.domain.PatrimoineKpiTarget;
import com.myfinance.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PatrimoineKpiTargetRepository extends JpaRepository<PatrimoineKpiTarget, Long> {

    List<PatrimoineKpiTarget> findByUser(User user);

    void deleteByUser(User user);
}
