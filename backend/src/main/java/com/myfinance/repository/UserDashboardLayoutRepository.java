package com.myfinance.repository;

import com.myfinance.domain.UserDashboard;
import com.myfinance.domain.UserDashboardLayout;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserDashboardLayoutRepository extends JpaRepository<UserDashboardLayout, Long> {
    Optional<UserDashboardLayout> findByDashboardId(Long dashboardId);
    void deleteByDashboard(UserDashboard dashboard);
}
