package com.myfinance.repository;

import com.myfinance.domain.Possession;
import com.myfinance.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PossessionRepository extends JpaRepository<Possession, Long> {

    List<Possession> findByUserOrderByCategoryAscLabelAsc(User user);

    void deleteByUser(User user);
}
