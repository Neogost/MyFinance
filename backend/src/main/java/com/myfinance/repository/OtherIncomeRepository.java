package com.myfinance.repository;

import com.myfinance.domain.OtherIncome;
import com.myfinance.domain.Position;
import com.myfinance.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface OtherIncomeRepository extends JpaRepository<OtherIncome, Long> {

    List<OtherIncome> findByUserOrderByDateDesc(User user);

    // Revenus ponctuels (sans contrat) dans une plage de dates — utilisé par le simulateur
    List<OtherIncome> findByUserAndPeriodStartIsNullAndDateBetween(User user, LocalDate start, LocalDate end);

    // Contrats de location chevauchant une plage de dates — utilisé par le simulateur
    @Query("SELECT o FROM OtherIncome o WHERE o.user = :user AND o.periodStart IS NOT NULL " +
           "AND o.periodStart <= :endDate AND (o.periodEnd IS NULL OR o.periodEnd >= :startDate)")
    List<OtherIncome> findContractsByUserOverlappingPeriod(
            @Param("user") User user,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    void deleteByUser(User user);

    List<OtherIncome> findByPosition(Position position);
}
