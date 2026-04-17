package com.myfinance.repository;

import com.myfinance.domain.RecurringExpense;
import com.myfinance.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecurringExpenseRepository extends JpaRepository<RecurringExpense, Long> {

    List<RecurringExpense> findByUserOrderByCategoryAscLabelAsc(User user);
}
