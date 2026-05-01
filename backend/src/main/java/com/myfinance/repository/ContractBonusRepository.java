package com.myfinance.repository;

import com.myfinance.domain.ContractBonus;
import com.myfinance.domain.SalaryContract;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContractBonusRepository extends JpaRepository<ContractBonus, Long> {

    // Annuelles (par mois), puis exceptionnelles (par date desc), puis mensuelles (par startDate)
    List<ContractBonus> findByContractOrderByTypeAscPaymentMonthAscPaymentDateDescStartDateAsc(SalaryContract contract);
}
