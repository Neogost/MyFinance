package com.myfinance.service;

import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.Instrument;
import com.myfinance.dto.BackfillReport;
import com.myfinance.repository.InstrumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Backfill de l'historique des prix d'un instrument.
 * - CRYPTO : automatique via CoinGecko market_chart?days=max
 * - BOURSE : import CSV manuel uploadé par l'admin
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InstrumentBackfillService {

    private final InstrumentRepository instrumentRepository;
    private final InstrumentPriceHistoryService priceHistoryService;
    private final CoinGeckoClient coinGeckoClient;

    // ── Backfill CRYPTO via CoinGecko ─────────────────────────────────────────

    public BackfillReport backfillCrypto(Long instrumentId) {
        long t0 = System.currentTimeMillis();
        Instrument inst = instrumentRepository.findById(instrumentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Instrument introuvable : " + instrumentId));

        if (inst.getCategory() != AssetCategory.CRYPTO) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "L'endpoint backfill-prices est réservé aux instruments CRYPTO. Pour BOURSE, utiliser import-prices (CSV).");
        }
        if (inst.getCoinGeckoId() == null || inst.getCoinGeckoId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Instrument CRYPTO sans coinGeckoId : impossible de fetch CoinGecko. Compléter le champ ou attendre la résolution automatique.");
        }

        log.info("[Backfill] CRYPTO instrument #{} ({}) via CoinGecko", instrumentId, inst.getName());
        Map<LocalDate, BigDecimal> history = coinGeckoClient.getMarketChart(inst.getCoinGeckoId());

        if (history.isEmpty()) {
            return new BackfillReport(
                    BackfillReport.Scope.INSTRUMENT_PRICES,
                    instrumentId.toString(), inst.getName(),
                    null, null,
                    0, 0, 0,
                    List.of("Aucune donnée retournée par CoinGecko pour " + inst.getCoinGeckoId()),
                    System.currentTimeMillis() - t0
            );
        }

        return persistPrices(inst, history,
                InstrumentPriceHistoryService.SOURCE_COINGECKO,
                System.currentTimeMillis() - t0);
    }

    // ── Backfill BOURSE via import CSV ────────────────────────────────────────

    public BackfillReport importCsv(Long instrumentId, MultipartFile file) {
        long t0 = System.currentTimeMillis();
        Instrument inst = instrumentRepository.findById(instrumentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Instrument introuvable : " + instrumentId));

        if (inst.getCategory() != AssetCategory.BOURSE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "L'endpoint import-prices est réservé aux instruments BOURSE. Pour CRYPTO, utiliser backfill-prices (CoinGecko).");
        }
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fichier CSV vide ou absent");
        }
        if (file.getSize() > BoursePriceCsvParser.MAX_FILE_SIZE_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Fichier trop volumineux : " + file.getSize() + " octets (max " + BoursePriceCsvParser.MAX_FILE_SIZE_BYTES + ")");
        }

        log.info("[Backfill] BOURSE instrument #{} ({}) via CSV ({} octets)", instrumentId, inst.getName(), file.getSize());

        BoursePriceCsvParser.ParseResult parsed;
        try {
            parsed = BoursePriceCsvParser.parse(file.getInputStream());
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Erreur de lecture du CSV : " + e.getMessage());
        }

        Map<LocalDate, BigDecimal> history = new java.util.TreeMap<>();
        for (BoursePriceCsvParser.ParsedRow row : parsed.rows()) {
            history.put(row.date(), row.price());
        }

        BackfillReport persisted = persistPrices(inst, history,
                InstrumentPriceHistoryService.SOURCE_MANUAL_CSV,
                System.currentTimeMillis() - t0);

        // Concaténer les erreurs de parsing avec celles de persistance.
        // linesSkipped = nombre de lignes data invalides (= taille de errors du parser).
        // Le header et les commentaires ne sont PAS des skips, juste des lignes structurelles.
        List<String> allErrors = new java.util.ArrayList<>(parsed.errors());
        allErrors.addAll(persisted.errors());
        return new BackfillReport(
                persisted.scope(), persisted.targetId(), persisted.targetLabel(),
                persisted.fromDate(), persisted.toDate(),
                persisted.linesInserted(), persisted.linesUpdated(),
                persisted.linesSkipped() + parsed.errors().size(),
                allErrors,
                persisted.durationMs()
        );
    }

    // ── Persistance commune (CRYPTO + CSV) ────────────────────────────────────

    private BackfillReport persistPrices(Instrument inst, Map<LocalDate, BigDecimal> history,
                                         String source, long durationMs) {
        int inserted = 0, updated = 0;
        long countBefore = priceHistoryService.countDays(inst);

        for (Map.Entry<LocalDate, BigDecimal> entry : history.entrySet()) {
            priceHistoryService.savePrice(inst, entry.getKey(), entry.getValue(), source);
        }

        long countAfter = priceHistoryService.countDays(inst);
        inserted = (int) (countAfter - countBefore);
        updated  = history.size() - inserted;

        LocalDate from = history.keySet().iterator().next();
        LocalDate to   = new java.util.ArrayList<>(history.keySet()).get(history.size() - 1);

        log.info("[Backfill] Instrument #{} : {} insérés, {} mis à jour ({} → {})",
                inst.getId(), inserted, updated, from, to);

        return new BackfillReport(
                BackfillReport.Scope.INSTRUMENT_PRICES,
                inst.getId().toString(), inst.getName(),
                from, to,
                inserted, updated, 0,
                List.of(),
                durationMs
        );
    }
}
