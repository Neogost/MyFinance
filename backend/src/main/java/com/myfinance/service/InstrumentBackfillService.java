package com.myfinance.service;

import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.Instrument;
import com.myfinance.dto.BackfillReport;
import com.myfinance.repository.InstrumentRepository;
import com.myfinance.repository.PositionOrderRepository;
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
import java.util.Optional;
import java.util.TreeMap;

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
    private final PositionOrderRepository positionOrderRepository;

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

        // Date du premier ordre sur cet instrument — borne inférieure du backfill
        Optional<LocalDate> firstOrderDate = positionOrderRepository.findMinOrderDateByInstrument(inst);
        if (firstOrderDate.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Aucun ordre trouvé pour l'instrument " + inst.getName() +
                    " — backfill inutile sans historique d'investissement.");
        }
        LocalDate fromDate = firstOrderDate.get();
        log.info("[Backfill] CRYPTO instrument #{} ({}) via CoinGecko — depuis {}", instrumentId, inst.getName(), fromDate);

        Map<LocalDate, BigDecimal> raw = coinGeckoClient.getMarketChart(inst.getCoinGeckoId());

        if (raw.isEmpty()) {
            return new BackfillReport(
                    BackfillReport.Scope.INSTRUMENT_PRICES,
                    instrumentId.toString(), inst.getName(),
                    null, null,
                    0, 0, 0,
                    List.of("Aucune donnée retournée par CoinGecko pour " + inst.getCoinGeckoId()),
                    System.currentTimeMillis() - t0
            );
        }

        // Filtrage : on ne conserve que les prix à partir du premier ordre
        Map<LocalDate, BigDecimal> history = new TreeMap<>();
        raw.forEach((date, price) -> {
            if (!date.isBefore(fromDate)) history.put(date, price);
        });

        if (history.isEmpty()) {
            return new BackfillReport(
                    BackfillReport.Scope.INSTRUMENT_PRICES,
                    instrumentId.toString(), inst.getName(),
                    null, null,
                    0, 0, 0,
                    List.of(String.format(
                            "CoinGecko a retourné %d prix mais aucun depuis votre premier ordre du %s.",
                            raw.size(), fromDate)),
                    System.currentTimeMillis() - t0
            );
        }

        log.info("[Backfill] {} prix CoinGecko → {} conservés après filtrage (depuis {})",
                raw.size(), history.size(), fromDate);

        return persistPrices(inst, history,
                InstrumentPriceHistoryService.SOURCE_COINGECKO,
                System.currentTimeMillis() - t0);
    }

    // ── Import CSV (BOURSE et CRYPTO) ─────────────────────────────────────────

    public BackfillReport importCsv(Long instrumentId, MultipartFile file) {
        long t0 = System.currentTimeMillis();
        Instrument inst = instrumentRepository.findById(instrumentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Instrument introuvable : " + instrumentId));

        if (inst.getCategory() != AssetCategory.BOURSE && inst.getCategory() != AssetCategory.CRYPTO) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "L'import CSV est réservé aux instruments BOURSE et CRYPTO.");
        }
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fichier CSV vide ou absent");
        }
        if (file.getSize() > BoursePriceCsvParser.MAX_FILE_SIZE_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Fichier trop volumineux : " + file.getSize() + " octets (max " + BoursePriceCsvParser.MAX_FILE_SIZE_BYTES + ")");
        }

        log.info("[Backfill] {} instrument #{} ({}) via CSV ({} octets)",
                inst.getCategory(), instrumentId, inst.getName(), file.getSize());

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
