package com.myfinance.repository;

import com.myfinance.domain.MonthlyPaySlip;
import com.myfinance.domain.SalaryContract;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface MonthlyPaySlipRepository extends JpaRepository<MonthlyPaySlip, Long> {

    List<MonthlyPaySlip> findByContractOrderByPeriodDesc(SalaryContract contract);

    // Vérifie qu'un bulletin n'existe pas déjà pour ce contrat et cette période
    boolean existsByContractAndPeriod(SalaryContract contract, LocalDate period);
}
