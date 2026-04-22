package com.myfinance.repository;

import com.myfinance.domain.PatrimoineTarget;
import com.myfinance.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PatrimoineTargetRepository extends JpaRepository<PatrimoineTarget, Long> {

    List<PatrimoineTarget> findByUser(User user);

    void deleteByUser(User user);
}
