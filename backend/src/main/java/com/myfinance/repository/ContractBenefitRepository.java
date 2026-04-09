package com.myfinance.repository;

import com.myfinance.domain.ContractBenefit;
import com.myfinance.domain.SalaryContract;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContractBenefitRepository extends JpaRepository<ContractBenefit, Long> {

    List<ContractBenefit> findByContractOrderByLabelAsc(SalaryContract contract);
}
