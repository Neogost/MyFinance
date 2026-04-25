package com.myfinance.repository;

import com.myfinance.domain.OtherIncome;
import com.myfinance.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface OtherIncomeRepository extends JpaRepository<OtherIncome, Long> {

    List<OtherIncome> findByUserOrderByDateDesc(User user);

    // Revenus d'un utilisateur pour une plage de dates (utilisé par le simulateur)
    List<OtherIncome> findByUserAndDateBetween(User user, LocalDate start, LocalDate end);

    void deleteByUser(User user);
}
