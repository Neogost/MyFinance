package com.myfinance.controller;

import com.myfinance.dto.BackfillReport;
import com.myfinance.dto.PriceHistoryEntryDto;
import com.myfinance.dto.PriceHistorySummaryDto;
import com.myfinance.dto.UpsertPriceRequest;
import com.myfinance.repository.PositionOrderRepository;
import com.myfinance.service.ExchangeRateBackfillService;
import com.myfinance.service.InstrumentBackfillService;
import com.myfinance.service.InstrumentPriceHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@RestController
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminBackfillController {

    private final InstrumentBackfillService instrumentBackfillService;
    private final ExchangeRateBackfillService exchangeRateBackfillService;
    private final InstrumentPriceHistoryService priceHistoryService;
    private final PositionOrderRepository positionOrderRepository;

    /**
     * Résumé d'historique de prix + date du premier ordre par instrument — pour l'UI admin.
     * Retourne Map<instrumentId, {dayCount, fromDate, toDate, firstOrderDate}>.
     */
    @GetMapping("/api/admin/instruments/price-history-summary")
    public ResponseEntity<Map<Long, PriceHistorySummaryDto>> priceHistorySummary() {
        Map<Long, PriceHistorySummaryDto> priceSummaries = priceHistoryService.getSummaryForAllInstruments();

        // Premier ordre par instrument (pour borner l'import CSV)
        Map<Long, LocalDate> firstOrderDates = new HashMap<>();
        for (Object[] row : positionOrderRepository.findMinOrderDatesGroupedByInstrument()) {
            firstOrderDates.put((Long) row[0], (LocalDate) row[1]);
        }

        // Fusion : ajouter firstOrderDate à chaque entrée, créer une entrée pour les instruments sans prix
        Map<Long, PriceHistorySummaryDto> result = new HashMap<>(priceSummaries.size() + firstOrderDates.size());
        priceSummaries.forEach((id, s) ->
                result.put(id, new PriceHistorySummaryDto(s.dayCount(), s.fromDate(), s.toDate(),
                        firstOrderDates.get(id))));
        firstOrderDates.forEach((id, date) ->
                result.computeIfAbsent(id, k -> new PriceHistorySummaryDto(0, null, null, date)));

        return ResponseEntity.ok(result);
    }

    /**
     * Backfill automatique CRYPTO via CoinGecko market_chart?days=max.
     * Réservé aux instruments de catégorie CRYPTO avec coinGeckoId renseigné.
     */
    @PostMapping("/api/admin/instruments/{id}/backfill-prices")
    public ResponseEntity<BackfillReport> backfillCryptoPrices(@PathVariable Long id) {
        return ResponseEntity.ok(instrumentBackfillService.backfillCrypto(id));
    }

    /**
     * Import CSV manuel pour instruments BOURSE.
     * Format détaillé dans docs/architecture/patrimoine-performance.md section 2.3.
     */
    @PostMapping(value = "/api/admin/instruments/{id}/import-prices",
                 consumes = "multipart/form-data")
    public ResponseEntity<BackfillReport> importBoursePrices(@PathVariable Long id,
                                                              @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(instrumentBackfillService.importCsv(id, file));
    }

    /**
     * Backfill automatique du taux de change EUR/{currency} via Frankfurter (BCE).
     * Si from/to non spécifiés : couvre la période depuis le premier ordre dans cette devise (ou -5 ans par défaut).
     */
    @PostMapping("/api/admin/exchange-rates/{currency}/backfill")
    public ResponseEntity<BackfillReport> backfillExchangeRate(
            @PathVariable String currency,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(exchangeRateBackfillService.backfill(currency, from, to));
    }

    // ── Consultation / édition manuelle de l'historique de cours ─────────────

    /** Liste les entrées d'historique d'un instrument sur une plage de dates. */
    @GetMapping("/api/admin/instruments/{id}/price-history")
    public ResponseEntity<List<PriceHistoryEntryDto>> getPriceHistory(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(priceHistoryService.getHistory(id, from, to));
    }

    /** Ajoute ou met à jour manuellement le cours d'un instrument à une date donnée (source = MANUAL). */
    @PutMapping("/api/admin/instruments/{id}/price-history/{date}")
    public ResponseEntity<PriceHistoryEntryDto> upsertPrice(
            @PathVariable Long id,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestBody UpsertPriceRequest body) {
        return ResponseEntity.ok(priceHistoryService.upsertManual(id, date, body.price()));
    }

    /** Supprime le cours d'un instrument à une date donnée. */
    @DeleteMapping("/api/admin/instruments/{id}/price-history/{date}")
    public ResponseEntity<Void> deletePrice(
            @PathVariable Long id,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        priceHistoryService.deleteEntry(id, date);
        return ResponseEntity.noContent().build();
    }
}
