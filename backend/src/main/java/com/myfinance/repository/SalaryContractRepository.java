package com.myfinance.repository;

import com.myfinance.domain.SalaryContract;
import com.myfinance.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SalaryContractRepository extends JpaRepository<SalaryContract, Long> {

    List<SalaryContract> findByUserOrderByStartDateDesc(User user);

    // Vérifie qu'un utilisateur n'a pas déjà un contrat actif (endDate = null)
    boolean existsByUserAndEndDateIsNull(User user);

    // Récupère le contrat actif d'un utilisateur (utilisé par le simulateur — année courante)
    Optional<SalaryContract> findByUserAndEndDateIsNull(User user);

    // Récupère le contrat actif à une date donnée (pour simulation d'une année passée)
    @Query("SELECT c FROM SalaryContract c WHERE c.user = :user AND c.startDate <= :referenceDate AND (c.endDate IS NULL OR c.endDate >= :referenceDate) ORDER BY c.startDate DESC")
    List<SalaryContract> findContractsActiveAtDate(@Param("user") User user, @Param("referenceDate") LocalDate referenceDate);
}
