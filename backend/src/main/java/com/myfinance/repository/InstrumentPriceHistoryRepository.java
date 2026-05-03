package com.myfinance.repository;

import com.myfinance.domain.Instrument;
import com.myfinance.domain.InstrumentPriceHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface InstrumentPriceHistoryRepository extends JpaRepository<InstrumentPriceHistory, Long> {

    /** Dernier prix connu pour un instrument à une date donnée (≤ date) */
    Optional<InstrumentPriceHistory> findTopByInstrumentAndPriceDateLessThanEqualOrderByPriceDateDesc(
            Instrument instrument, LocalDate date);

    /** Chargement batch pour le calcul de performance : tous les prix d'une liste d'instruments sur une plage */
    List<InstrumentPriceHistory> findByInstrumentInAndPriceDateBetween(
            List<Instrument> instruments, LocalDate from, LocalDate to);

    /** Vérification de l'existence d'un prix pour idempotence (upsert) */
    Optional<InstrumentPriceHistory> findByInstrumentAndPriceDate(Instrument instrument, LocalDate date);

    /** Plage de dates disponibles pour un instrument (pour affichage UI admin) */
    @Query("SELECT MIN(h.priceDate) FROM InstrumentPriceHistory h WHERE h.instrument = :instrument")
    Optional<LocalDate> findMinDateByInstrument(@Param("instrument") Instrument instrument);

    @Query("SELECT MAX(h.priceDate) FROM InstrumentPriceHistory h WHERE h.instrument = :instrument")
    Optional<LocalDate> findMaxDateByInstrument(@Param("instrument") Instrument instrument);

    @Query("SELECT COUNT(h) FROM InstrumentPriceHistory h WHERE h.instrument = :instrument")
    long countByInstrument(@Param("instrument") Instrument instrument);
}
