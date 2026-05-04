package com.myfinance.service;

import com.myfinance.domain.Instrument;
import com.myfinance.domain.InstrumentPriceHistory;
import com.myfinance.dto.PriceHistorySummaryDto;
import com.myfinance.repository.InstrumentPriceHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class InstrumentPriceHistoryService {

    public static final String SOURCE_BOURSORAMA  = "BOURSORAMA";
    public static final String SOURCE_COINGECKO   = "COINGECKO";
    public static final String SOURCE_MANUAL_CSV  = "MANUAL_CSV";
    public static final String SOURCE_MANUAL      = "MANUAL";

    private final InstrumentPriceHistoryRepository priceHistoryRepository;

    // ── Lecture ────────────────────────────────────────────────────────────────

    /**
     * Retourne le dernier prix connu pour un instrument à une date donnée (≤ date).
     * Retourne empty si aucun prix n'est connu avant cette date
     * (interdiction d'extrapoler dans le passé — cf. spec performance §3.1).
     */
    public Optional<BigDecimal> getPriceAt(Instrument instrument, LocalDate date) {
        return priceHistoryRepository
                .findTopByInstrumentAndPriceDateLessThanEqualOrderByPriceDateDesc(instrument, date)
                .map(InstrumentPriceHistory::getPrice);
    }

    /**
     * Charge en batch tous les prix d'une liste d'instruments sur une plage.
     * Retourne une Map (instrumentId, priceDate) → price pour éviter le N+1 dans le calcul de performance.
     */
    public Map<String, BigDecimal> loadPriceBatch(List<Instrument> instruments, LocalDate from, LocalDate to) {
        return priceHistoryRepository
                .findByInstrumentInAndPriceDateBetween(instruments, from, to)
                .stream()
                .collect(Collectors.toMap(
                        h -> batchKey(h.getInstrument().getId(), h.getPriceDate()),
                        InstrumentPriceHistory::getPrice,
                        (a, b) -> a  // en cas de doublon (ne devrait pas arriver grâce à UNIQUE constraint)
                ));
    }

    /** Clé de lookup dans la map batch : "instrumentId|YYYY-MM-DD" */
    public static String batchKey(Long instrumentId, LocalDate date) {
        return instrumentId + "|" + date;
    }

    /** Nombre de jours d'historique disponibles pour un instrument (pour UI admin) */
    public long countDays(Instrument instrument) {
        return priceHistoryRepository.countByInstrument(instrument);
    }

    public Optional<LocalDate> getMinDate(Instrument instrument) {
        return priceHistoryRepository.findMinDateByInstrument(instrument);
    }

    public Optional<LocalDate> getMaxDate(Instrument instrument) {
        return priceHistoryRepository.findMaxDateByInstrument(instrument);
    }

    /** Résumé d'historique pour tous les instruments (pour UI admin) — une seule query. */
    public Map<Long, PriceHistorySummaryDto> getSummaryForAllInstruments() {
        Map<Long, PriceHistorySummaryDto> result = new HashMap<>();
        for (Object[] row : priceHistoryRepository.findSummaryGroupedByInstrument()) {
            Long instrumentId = (Long) row[0];
            long count = ((Number) row[1]).longValue();
            LocalDate from = (LocalDate) row[2];
            LocalDate to   = (LocalDate) row[3];
            result.put(instrumentId, new PriceHistorySummaryDto(count, from, to, null));
        }
        return result;
    }

    // ── Écriture (upsert idempotent) ───────────────────────────────────────────

    /**
     * Enregistre un prix pour un instrument à une date donnée.
     * Idempotent : si une entrée existe déjà pour (instrument, date), elle est mise à jour.
     */
    public void savePrice(Instrument instrument, LocalDate date, BigDecimal price, String source) {
        InstrumentPriceHistory entry = priceHistoryRepository
                .findByInstrumentAndPriceDate(instrument, date)
                .orElse(InstrumentPriceHistory.builder()
                        .instrument(instrument)
                        .priceDate(date)
                        .build());
        entry.setPrice(price);
        entry.setSource(source);
        priceHistoryRepository.save(entry);
    }

    /**
     * Enregistrement batch de plusieurs entrées (utilisé par le backfill CSV et CoinGecko).
     * Applique un upsert entrée par entrée — acceptable pour des volumes de backfill (< 10 000 lignes).
     * Pour le forward daily (1 ligne/jour/instrument), savePrice() suffit.
     */
    public int savePricesBatch(List<InstrumentPriceHistory> entries) {
        int count = 0;
        for (InstrumentPriceHistory entry : entries) {
            savePrice(entry.getInstrument(), entry.getPriceDate(), entry.getPrice(), entry.getSource());
            count++;
        }
        log.info("[PrixHistorique] {} entrée(s) persistée(s)", count);
        return count;
    }
}
