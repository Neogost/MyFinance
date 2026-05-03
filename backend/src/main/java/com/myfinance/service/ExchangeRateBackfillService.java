package com.myfinance.service;

import com.myfinance.dto.BackfillReport;
import com.myfinance.repository.ExchangeRateHistoryRepository;
import com.myfinance.repository.PositionOrderRepository;
import com.myfinance.repository.PositionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

/**
 * Backfill de l'historique des taux de change EUR/devise via Frankfurter (BCE).
 * Date de début automatique : la plus ancienne entre (premier ordre dans cette devise) et (-5 ans).
 * Date de fin automatique : aujourd'hui.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExchangeRateBackfillService {

    private static final ZoneId PARIS = ZoneId.of("Europe/Paris");
    private static final LocalDate FRANKFURTER_MIN = LocalDate.of(1999, 1, 4);

    private final ExchangeRateHistoryRepository rateHistoryRepository;
    private final ExchangeRateHistoryService rateHistoryService;
    private final EcbRateClient ecbRateClient;
    private final PositionRepository positionRepository;
    private final PositionOrderRepository orderRepository;

    public BackfillReport backfill(String currency, LocalDate fromOverride, LocalDate toOverride) {
        long t0 = System.currentTimeMillis();
        String code = currency.toUpperCase();

        if ("EUR".equals(code)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "EUR ne nécessite pas de backfill (taux implicite = 1.0)");
        }

        LocalDate to   = toOverride   != null ? toOverride   : LocalDate.now(PARIS);
        LocalDate from = fromOverride != null ? fromOverride : earliestOrderDateForCurrency(code).orElse(to.minusYears(5));
        if (from.isBefore(FRANKFURTER_MIN)) from = FRANKFURTER_MIN;
        if (from.isAfter(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "from (" + from + ") doit être ≤ to (" + to + ")");
        }

        log.info("[Backfill] Devise {} via Frankfurter ({} → {})", code, from, to);
        Map<LocalDate, BigDecimal> history = ecbRateClient.getRatesHistory(code, from, to);

        if (history.isEmpty()) {
            return new BackfillReport(
                    BackfillReport.Scope.EXCHANGE_RATES,
                    code, code,
                    from, to,
                    0, 0, 0,
                    List.of("Aucune donnée Frankfurter pour " + code + " entre " + from + " et " + to),
                    System.currentTimeMillis() - t0
            );
        }

        long countBefore = rateHistoryRepository.findByCurrencyInAndRateDateBetween(List.of(code), from, to).size();
        for (Map.Entry<LocalDate, BigDecimal> entry : history.entrySet()) {
            rateHistoryService.saveRate(code, entry.getKey(), entry.getValue(), ExchangeRateHistoryService.SOURCE_FRANKFURTER);
        }
        long countAfter = rateHistoryRepository.findByCurrencyInAndRateDateBetween(List.of(code), from, to).size();
        int inserted = (int) (countAfter - countBefore);
        int updated  = history.size() - inserted;

        LocalDate effectiveFrom = history.keySet().iterator().next();
        LocalDate effectiveTo   = new java.util.ArrayList<>(history.keySet()).get(history.size() - 1);

        log.info("[Backfill] Devise {} : {} insérés, {} mis à jour ({} → {})",
                code, inserted, updated, effectiveFrom, effectiveTo);

        return new BackfillReport(
                BackfillReport.Scope.EXCHANGE_RATES,
                code, code,
                effectiveFrom, effectiveTo,
                inserted, updated, 0,
                List.of(),
                System.currentTimeMillis() - t0
        );
    }

    private java.util.Optional<LocalDate> earliestOrderDateForCurrency(String currency) {
        return positionRepository.findAll().stream()
                .filter(p -> currency.equalsIgnoreCase(p.getCurrency()))
                .flatMap(p -> orderRepository.findByPositionOrderByOrderDateDesc(p).stream())
                .map(o -> o.getOrderDate())
                .min(java.util.Comparator.naturalOrder());
    }
}
