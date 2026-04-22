package com.myfinance.repository;

import com.myfinance.domain.Debt;
import com.myfinance.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DebtRepository extends JpaRepository<Debt, Long> {

    List<Debt> findByUserOrderByTypeAscLabelAsc(User user);
}
