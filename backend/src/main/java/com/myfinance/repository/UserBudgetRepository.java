package com.myfinance.repository;

import com.myfinance.domain.User;
import com.myfinance.domain.UserBudget;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserBudgetRepository extends JpaRepository<UserBudget, Long> {

    List<UserBudget> findByUser(User user);

    void deleteByUser(User user);
}
