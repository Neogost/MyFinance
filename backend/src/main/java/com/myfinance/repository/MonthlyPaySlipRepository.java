package com.myfinance.repository;

import com.myfinance.domain.MonthlyPaySlip;
import com.myfinance.domain.SalaryContract;
import com.myfinance.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface MonthlyPaySlipRepository extends JpaRepository<MonthlyPaySlip, Long> {

    List<MonthlyPaySlip> findByContractOrderByPeriodDesc(SalaryContract contract);

    // Vérifie qu'un bulletin n'existe pas déjà pour ce contrat et cette période
    boolean existsByContractAndPeriod(SalaryContract contract, LocalDate period);

    // Bulletins de tous les contrats d'un utilisateur pour une plage de dates (utilisé par le simulateur)
    List<MonthlyPaySlip> findByContractUserAndPeriodBetween(User user, LocalDate start, LocalDate end);

    // Tous les bulletins d'un utilisateur triés chronologiquement (utilisé par le tableau de bord)
    List<MonthlyPaySlip> findByContractUserOrderByPeriodAsc(User user);
}
