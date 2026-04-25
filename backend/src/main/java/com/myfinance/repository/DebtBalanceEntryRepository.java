package com.myfinance.repository;

import com.myfinance.domain.Debt;
import com.myfinance.domain.DebtBalanceEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DebtBalanceEntryRepository extends JpaRepository<DebtBalanceEntry, Long> {

    List<DebtBalanceEntry> findByDebtOrderByEntryDateDesc(Debt debt);

    Optional<DebtBalanceEntry> findFirstByDebtOrderByEntryDateDesc(Debt debt);

    void deleteByDebt(Debt debt);
}
