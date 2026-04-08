package com.myfinance.repository;

import com.myfinance.domain.OtherIncome;
import com.myfinance.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OtherIncomeRepository extends JpaRepository<OtherIncome, Long> {

    List<OtherIncome> findByUserOrderByDateDesc(User user);
}
