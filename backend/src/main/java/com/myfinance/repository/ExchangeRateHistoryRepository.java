package com.myfinance.repository;

import com.myfinance.domain.ExchangeRateHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

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

    /** Historique d'une devise sur une plage — pour la consultation UI */
    List<ExchangeRateHistory> findByCurrencyAndRateDateBetweenOrderByRateDateAsc(
            String currency, LocalDate from, LocalDate to);

    /** Suppression en masse d'une devise (utilisé lors de la suppression d'un taux de change). */
    void deleteByCurrency(String currency);

    /** Résumé par devise : nombre de jours, date min, date max */
    @Query("""
            SELECT h.currency, COUNT(h), MIN(h.rateDate), MAX(h.rateDate)
            FROM ExchangeRateHistory h
            GROUP BY h.currency
            ORDER BY h.currency
            """)
    List<Object[]> findSummaryGroupedByCurrency();
}
