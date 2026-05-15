package com.myfinance.service;

import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.Instrument;
import com.myfinance.dto.*;
import com.myfinance.repository.InstrumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MarketDataService {

    static final ZoneId PARIS = ZoneId.of("Europe/Paris");

    private final BoursoramaClient boursoramaClient;
    private final CoinGeckoClient coinGeckoClient;
    private final EcbRateClient ecbRateClient;
    private final InstrumentRepository instrumentRepository;
    private final ExchangeRateService exchangeRateService;
    private final PortfolioSnapshotService portfolioSnapshotService;
    private final InstrumentPriceHistoryService priceHistoryService;
    private final ExchangeRateHistoryService rateHistoryService;

    public MarketDataReportDto runFullUpdate() {
        log.info("[MàJ] Démarrage de la mise à jour des données marché");
        LocalDateTime start = LocalDateTime.now();
        List<String> errors = new ArrayList<>();

        int resolved     = resolveSymbols(errors);
        int[] priceResult = updatePrices(errors);
        int updated = priceResult[0], failed = priceResult[1];
        int rates        = updateExchangeRates(errors);
        BulkSnapshotResultDto snap = createMonthlySnapshots(errors);

        if (errors.isEmpty()) {
            log.info("[MàJ] Terminé — {} CoinGecko résolus | {} cours MàJ | {} taux | {} snapshots créés",
                    resolved, updated, rates, snap.created());
        } else {
            log.warn("[MàJ] Terminé avec {} erreur(s) — {} cours MàJ | {} échoués | {} taux | {} snapshots créés",
                    errors.size(), updated, failed, rates, snap.created());
        }

        return new MarketDataReportDto(resolved, updated, failed, rates,
                snap.created(), snap.skipped(), snap.failed(), errors, start);
    }

    // ── Étape 1 : résolution des IDs CoinGecko (CRYPTO uniquement) ──

    int resolveSymbols(List<String> errors) {
        int count = 0;

        List<Instrument> cryptoNonResolus =
                instrumentRepository.findByCategoryAndCoinGeckoIdIsNullAndStablePriceFalse(AssetCategory.CRYPTO);
        for (Instrument inst : cryptoNonResolus) {
            if (inst.getTicker() == null) continue;
            Optional<String> id = coinGeckoClient.searchId(inst.getTicker());
            if (id.isPresent()) {
                inst.setCoinGeckoId(id.get());
                instrumentRepository.save(inst);
                count++;
            } else {
                String msg = "ID CoinGecko introuvable pour ticker " + inst.getTicker() + " (" + inst.getName() + ")";
                log.warn("[Résolution] {}", msg);
                errors.add(msg);
            }
        }

        if (count > 0) log.info("[Résolution] {} ID(s) CoinGecko résolu(s)", count);
        return count;
    }

    // ── Étape 2 : mise à jour des cours ───────────────────────

    int[] updatePrices(List<String> errors) {
        int updated = 0, failed = 0;

        // BOURSE — via Boursorama
        List<Instrument> bourse = instrumentRepository
                .findByCategoryAndStablePriceFalseAndBoursoramaSymbolIsNotNull(AssetCategory.BOURSE);

        LocalDate today = LocalDate.now(PARIS);
        for (Instrument inst : bourse) {
            Optional<BigDecimal> price = boursoramaClient.getPrice(inst.getBoursoramaSymbol());
            if (price.isPresent()) {
                inst.setLastPrice(price.get());
                inst.setLastPriceUpdatedAt(LocalDateTime.now(PARIS));
                instrumentRepository.save(inst);
                priceHistoryService.savePrice(inst, today, price.get(), InstrumentPriceHistoryService.SOURCE_BOURSORAMA);
                updated++;
            } else {
                String msg = "Cours Boursorama indisponible pour " + inst.getBoursoramaSymbol() + " (" + inst.getName() + ")";
                log.error("[Prix] {}", msg);
                errors.add(msg);
                failed++;
            }
        }

        // CRYPTO — un seul appel groupé CoinGecko
        List<Instrument> crypto = instrumentRepository
                .findByCategoryAndStablePriceFalseAndCoinGeckoIdIsNotNull(AssetCategory.CRYPTO);

        if (!crypto.isEmpty()) {
            List<String> ids = crypto.stream().map(Instrument::getCoinGeckoId).toList();
            Map<String, BigDecimal> prices = coinGeckoClient.getPrices(ids);

            for (Instrument inst : crypto) {
                BigDecimal price = prices.get(inst.getCoinGeckoId());
                if (price != null) {
                    inst.setLastPrice(price);
                    inst.setLastPriceUpdatedAt(LocalDateTime.now(PARIS));
                    instrumentRepository.save(inst);
                    priceHistoryService.savePrice(inst, today, price, InstrumentPriceHistoryService.SOURCE_COINGECKO);
                    updated++;
                } else {
                    String msg = "Cours CoinGecko indisponible pour " + inst.getCoinGeckoId() + " (" + inst.getName() + ")";
                    log.error("[Prix] {}", msg);
                    errors.add(msg);
                    failed++;
                }
            }
        }

        return new int[]{updated, failed};
    }

    // ── Étape 3 : taux de change ───────────────────────────────

    int updateExchangeRates(List<String> errors) {
        Map<String, BigDecimal> allRates = ecbRateClient.getRates();
        if (allRates.isEmpty()) {
            String msg = "Aucun taux de change récupéré depuis l'API ECB/Frankfurter";
            log.error("[Taux] {}", msg);
            errors.add(msg);
            return 0;
        }

        // Seules les devises déjà configurées par l'admin sont mises à jour —
        // les nouvelles devises retournées par ECB ne sont pas importées automatiquement.
        Set<String> configured = exchangeRateService.findAllCurrencies();
        Map<String, BigDecimal> rates = allRates.entrySet().stream()
                .filter(e -> configured.contains(e.getKey()))
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));

        if (rates.isEmpty()) {
            log.info("[Taux] Aucune devise configurée à mettre à jour (configured={})", configured.size());
            return 0;
        }

        List<UpdateExchangeRateRequest> requests = rates.entrySet().stream()
                .map(e -> new UpdateExchangeRateRequest(e.getKey(), e.getValue()))
                .toList();
        exchangeRateService.updateRates(requests);
        rateHistoryService.saveRatesBatch(rates, LocalDate.now(PARIS), ExchangeRateHistoryService.SOURCE_ECB);
        log.info("[Taux] {} devise(s) mises à jour sur {} disponibles depuis ECB", rates.size(), allRates.size());
        return rates.size();
    }

    // ── Étape 4 : snapshot mensuel ─────────────────────────────

    BulkSnapshotResultDto createMonthlySnapshots(List<String> errors) {
        try {
            CreateSnapshotRequest req = new CreateSnapshotRequest(LocalDate.now(PARIS));
            return portfolioSnapshotService.createForAllUsers(req);
        } catch (Exception e) {
            String msg = "Échec de la création des snapshots mensuels : " + e.getMessage();
            log.error("[Snapshot] {}", msg);
            errors.add(msg);
            return new BulkSnapshotResultDto(0, 0, 1);
        }
    }
}
