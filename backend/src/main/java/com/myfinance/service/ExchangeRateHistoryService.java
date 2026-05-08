package com.myfinance.service;

import com.myfinance.domain.ExchangeRateHistory;
import com.myfinance.dto.ExchangeRateHistoryEntryDto;
import com.myfinance.dto.ExchangeRateHistorySummaryDto;
import com.myfinance.repository.ExchangeRateHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExchangeRateHistoryService {

    public static final String SOURCE_ECB         = "ECB";
    public static final String SOURCE_FRANKFURTER = "FRANKFURTER";
    public static final String SOURCE_MANUAL      = "MANUAL";

    private final ExchangeRateHistoryRepository rateHistoryRepository;

    // ── Lecture ────────────────────────────────────────────────────────────────

    /**
     * Retourne le dernier taux connu pour une devise à une date donnée (≤ date).
     * Retourne empty si aucun taux n'est connu avant cette date.
     * Pour EUR : toujours retourner 1.0 (pas de ligne dans l'historique).
     */
    public Optional<BigDecimal> getRateAt(String currency, LocalDate date) {
        if ("EUR".equalsIgnoreCase(currency)) {
            return Optional.of(BigDecimal.ONE);
        }
        return rateHistoryRepository
                .findTopByCurrencyAndRateDateLessThanEqualOrderByRateDateDesc(currency, date)
                .map(ExchangeRateHistory::getRate);
    }

    /**
     * Charge en batch tous les taux d'une liste de devises sur une plage.
     * Retourne une Map "currency|YYYY-MM-DD" → rate pour le calcul de performance.
     */
    public Map<String, BigDecimal> loadRateBatch(List<String> currencies, LocalDate from, LocalDate to) {
        List<String> nonEur = currencies.stream()
                .filter(c -> !"EUR".equalsIgnoreCase(c))
                .toList();
        if (nonEur.isEmpty()) return Map.of();

        return rateHistoryRepository
                .findByCurrencyInAndRateDateBetween(nonEur, from, to)
                .stream()
                .collect(Collectors.toMap(
                        h -> batchKey(h.getCurrency(), h.getRateDate()),
                        ExchangeRateHistory::getRate,
                        (a, b) -> a
                ));
    }

    /** Clé de lookup dans la map batch : "CURRENCY|YYYY-MM-DD" */
    public static String batchKey(String currency, LocalDate date) {
        return currency + "|" + date;
    }

    // ── Écriture (upsert idempotent) ───────────────────────────────────────────

    /**
     * Enregistre un taux pour une devise à une date donnée.
     * Idempotent : si une entrée existe déjà pour (currency, date), elle est mise à jour.
     */
    public void saveRate(String currency, LocalDate date, BigDecimal rate, String source) {
        if ("EUR".equalsIgnoreCase(currency)) return;
        ExchangeRateHistory entry = rateHistoryRepository
                .findByCurrencyAndRateDate(currency, date)
                .orElse(ExchangeRateHistory.builder()
                        .currency(currency)
                        .rateDate(date)
                        .build());
        entry.setRate(rate);
        entry.setSource(source);
        rateHistoryRepository.save(entry);
    }

    /**
     * Enregistrement batch d'une map devise → taux pour une date donnée.
     * Utilisé par le forward daily du scheduler et par le backfill Frankfurter.
     */
    public int saveRatesBatch(Map<String, BigDecimal> rates, LocalDate date, String source) {
        int count = 0;
        for (Map.Entry<String, BigDecimal> entry : rates.entrySet()) {
            saveRate(entry.getKey(), date, entry.getValue(), source);
            count++;
        }
        if (count > 0) {
            log.info("[TauxHistorique] {} taux persisté(s) pour le {}", count, date);
        }
        return count;
    }

    // ── Consultation UI ────────────────────────────────────────────────────────

    /** Historique d'une devise sur une plage de dates, trié ASC. */
    public List<ExchangeRateHistoryEntryDto> getHistory(String currency, LocalDate from, LocalDate to) {
        return rateHistoryRepository
                .findByCurrencyAndRateDateBetweenOrderByRateDateAsc(currency, from, to)
                .stream()
                .map(h -> new ExchangeRateHistoryEntryDto(h.getCurrency(), h.getRateDate(), h.getRate(), h.getSource()))
                .toList();
    }

    /** Résumé par devise (nb jours, plage) pour l'affichage admin. */
    public List<ExchangeRateHistorySummaryDto> getSummaryByCurrency() {
        return rateHistoryRepository.findSummaryGroupedByCurrency()
                .stream()
                .map(row -> new ExchangeRateHistorySummaryDto(
                        (String)   row[0],
                        ((Number)  row[1]).longValue(),
                        (LocalDate) row[2],
                        (LocalDate) row[3]
                ))
                .toList();
    }

    /** Ajoute ou met à jour manuellement un taux (source = MANUAL). */
    public ExchangeRateHistoryEntryDto upsertManual(String currency, LocalDate date, BigDecimal rate) {
        ExchangeRateHistory entry = rateHistoryRepository
                .findByCurrencyAndRateDate(currency, date)
                .orElse(ExchangeRateHistory.builder().currency(currency).rateDate(date).build());
        entry.setRate(rate);
        entry.setSource(SOURCE_MANUAL);
        ExchangeRateHistory saved = rateHistoryRepository.save(entry);
        return new ExchangeRateHistoryEntryDto(saved.getCurrency(), saved.getRateDate(), saved.getRate(), saved.getSource());
    }

    /** Supprime une entrée d'historique (404 si inexistante). */
    public void deleteEntry(String currency, LocalDate date) {
        ExchangeRateHistory entry = rateHistoryRepository
                .findByCurrencyAndRateDate(currency, date)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Aucun taux trouvé pour " + currency + " au " + date));
        rateHistoryRepository.delete(entry);
    }
}
