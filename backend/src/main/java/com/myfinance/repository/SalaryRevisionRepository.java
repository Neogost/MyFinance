package com.myfinance.repository;

import com.myfinance.domain.SalaryContract;
import com.myfinance.domain.SalaryRevision;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SalaryRevisionRepository extends JpaRepository<SalaryRevision, Long> {

    // Liste des révisions d'un contrat, triées de la plus récente à la plus ancienne
    List<SalaryRevision> findByContractOrderByEffectiveDateDesc(SalaryContract contract);

    // Révision active : la plus récente dont la date d'effet est <= aujourd'hui
    Optional<SalaryRevision> findFirstByContractAndEffectiveDateLessThanEqualOrderByEffectiveDateDesc(
            SalaryContract contract, LocalDate today);

    // Vérification unicité (contract, effectiveDate)
    boolean existsByContractAndEffectiveDate(SalaryContract contract, LocalDate effectiveDate);

    void deleteByContract(SalaryContract contract);
}
