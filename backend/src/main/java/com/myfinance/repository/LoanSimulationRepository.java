package com.myfinance.repository;

import com.myfinance.domain.LoanSimulation;
import com.myfinance.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LoanSimulationRepository extends JpaRepository<LoanSimulation, Long> {

    List<LoanSimulation> findByUserOrderBySavedAtDesc(User user);

    long countByUser(User user);
}
