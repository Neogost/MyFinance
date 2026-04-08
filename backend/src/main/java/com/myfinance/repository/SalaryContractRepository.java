package com.myfinance.repository;

import com.myfinance.domain.SalaryContract;
import com.myfinance.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SalaryContractRepository extends JpaRepository<SalaryContract, Long> {

    List<SalaryContract> findByUserOrderByStartDateDesc(User user);

    // Vérifie qu'un utilisateur n'a pas déjà un contrat actif (endDate = null)
    boolean existsByUserAndEndDateIsNull(User user);
}
