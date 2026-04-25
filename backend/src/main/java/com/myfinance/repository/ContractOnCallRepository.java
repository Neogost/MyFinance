package com.myfinance.repository;

import com.myfinance.domain.ContractOnCall;
import com.myfinance.domain.SalaryContract;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContractOnCallRepository extends JpaRepository<ContractOnCall, Long> {

    List<ContractOnCall> findByContractOrderByIdAsc(SalaryContract contract);

    void deleteByContract(SalaryContract contract);
}
