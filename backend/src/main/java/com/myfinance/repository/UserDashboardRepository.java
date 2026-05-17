package com.myfinance.repository;

import com.myfinance.domain.User;
import com.myfinance.domain.UserDashboard;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserDashboardRepository extends JpaRepository<UserDashboard, Long> {
    List<UserDashboard> findByUserOrderBySortOrderAsc(User user);
    Optional<UserDashboard> findByUserAndIsDefaultTrue(User user);
    int countByUser(User user);
    void deleteByUser(User user);
}
