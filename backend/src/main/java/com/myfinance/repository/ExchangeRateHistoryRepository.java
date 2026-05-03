package com.myfinance.repository;

import com.myfinance.domain.ExchangeRateHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ExchangeRateHistoryRepository extends JpaRepository<ExchangeRateHistory, Long> {

    /** Dernier taux connu pour une devise à une date donnée (≤ date) */
    Optional<ExchangeRateHistory> findTopByCurrencyAndRateDateLessThanEqualOrderByRateDateDesc(
            String currency, LocalDate date);

    /** Chargement batch : tous les taux d'une liste de devises sur une plage */
    List<ExchangeRateHistory> findByCurrencyInAndRateDateBetween(
            List<String> currencies, LocalDate from, LocalDate to);

    /** Vérification d'existence pour idempotence (upsert) */
    Optional<ExchangeRateHistory> findByCurrencyAndRateDate(String currency, LocalDate date);
}
