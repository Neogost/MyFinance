package com.myfinance.repository;

import com.myfinance.domain.ContractBonus;
import com.myfinance.domain.SalaryContract;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContractBonusRepository extends JpaRepository<ContractBonus, Long> {

    // Annuelles d'abord (triées par mois), puis exceptionnelles (triées par date desc)
    List<ContractBonus> findByContractOrderByTypeAscPaymentMonthAscPaymentDateDesc(SalaryContract contract);
}
