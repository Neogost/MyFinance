package com.myfinance.repository;

import com.myfinance.domain.ContractBonus;
import com.myfinance.domain.SalaryContract;
import com.myfinance.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContractBonusRepository extends JpaRepository<ContractBonus, Long> {

    // Annuelles (par mois), puis exceptionnelles (par date desc), puis mensuelles (par startDate)
    List<ContractBonus> findByContractOrderByTypeAscPaymentMonthAscPaymentDateDescStartDateAsc(SalaryContract contract);

    // Toutes les primes d'un utilisateur (pour le graphique d'évolution salariale)
    List<ContractBonus> findByContractUser(User user);
}
