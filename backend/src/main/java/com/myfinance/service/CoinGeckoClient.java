package com.myfinance.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class CoinGeckoClient {

    private final RestTemplate restTemplate;

    private static final String SEARCH_URL =
            "https://api.coingecko.com/api/v3/search?query={ticker}";
    private static final String PRICE_URL  =
            "https://api.coingecko.com/api/v3/simple/price?ids={ids}&vs_currencies=usd";
    // &interval=daily non supporté sur le plan gratuit avec days=max — CoinGecko détermine automatiquement la granularité
    private static final String MARKET_CHART_URL =
            "https://api.coingecko.com/api/v3/coins/{id}/market_chart?vs_currency=usd&days={days}";
    private static final ZoneId PARIS = ZoneId.of("Europe/Paris");

    // ── Résolution ticker → ID CoinGecko ──────────────────────

    @SuppressWarnings("unchecked")
    public Optional<String> searchId(String ticker) {
        try {
            log.debug("[CoinGecko] Recherche ID pour ticker {}", ticker);
            Map<String, Object> response = restTemplate.getForObject(SEARCH_URL, Map.class, ticker);
            if (response == null) return Optional.empty();

            List<Map<String, Object>> coins = (List<Map<String, Object>>) response.get("coins");
            if (coins == null || coins.isEmpty()) {
                log.warn("[CoinGecko] Aucun résultat pour ticker {}", ticker);
                return Optional.empty();
            }
            String id = (String) coins.get(0).get("id");
            log.info("[CoinGecko] Ticker {} → ID {}", ticker, id);
            return Optional.ofNullable(id);
        } catch (Exception e) {
            log.error("[CoinGecko] Échec de la recherche pour ticker {} : {}", ticker, e.getMessage());
            return Optional.empty();
        }
    }

    // ── Historique des cours (backfill par instrument) ─────────

    /**
     * Récupère l'historique daily des cours d'une crypto via market_chart?days=max.
     * Retourne une Map LocalDate (Europe/Paris) → cours USD.
     * En cas d'erreur réseau ou de parsing, retourne une map vide.
     */
    @SuppressWarnings("unchecked")
    public Map<LocalDate, BigDecimal> getMarketChart(String coinGeckoId) {
        try {
            log.debug("[CoinGecko] Récupération historique market_chart pour {}", coinGeckoId);
            Map<String, Object> response = restTemplate.getForObject(MARKET_CHART_URL, Map.class, coinGeckoId, "max");
            if (response == null) return Map.of();

            List<List<Number>> prices = (List<List<Number>>) response.get("prices");
            if (prices == null || prices.isEmpty()) {
                log.warn("[CoinGecko] Historique vide pour {}", coinGeckoId);
                return Map.of();
            }

            // Format CoinGecko : [[timestamp_ms, price], ...]
            // On agrège par date (Europe/Paris) — en cas de plusieurs entrées le même jour, on garde la plus récente
            Map<LocalDate, BigDecimal> result = new TreeMap<>();
            for (List<Number> entry : prices) {
                long tsMs = entry.get(0).longValue();
                BigDecimal price = new BigDecimal(entry.get(1).toString());
                LocalDate date = Instant.ofEpochMilli(tsMs).atZone(PARIS).toLocalDate();
                result.put(date, price);
            }
            log.info("[CoinGecko] {} jours d'historique récupérés pour {} (du {} au {})",
                    result.size(), coinGeckoId,
                    result.keySet().iterator().next(),
                    new java.util.ArrayList<>(result.keySet()).get(result.size() - 1));
            return result;
        } catch (Exception e) {
            log.error("[CoinGecko] Échec market_chart pour {} : {}", coinGeckoId, e.getMessage());
            return Map.of();
        }
    }

    // ── Récupération groupée des cours (un seul appel) ─────────

    @SuppressWarnings("unchecked")
    public Map<String, BigDecimal> getPrices(List<String> coinGeckoIds) {
        if (coinGeckoIds.isEmpty()) return Map.of();
        String ids = String.join(",", coinGeckoIds);
        try {
            log.debug("[CoinGecko] Récupération des cours pour : {}", ids);
            Map<String, Object> response = restTemplate.getForObject(PRICE_URL, Map.class, ids);
            if (response == null) return Map.of();

            Map<String, BigDecimal> result = new HashMap<>();
            for (Map.Entry<String, Object> entry : response.entrySet()) {
                Map<String, Object> prices = (Map<String, Object>) entry.getValue();
                Object usd = prices.get("usd");
                if (usd != null) {
                    BigDecimal price = new BigDecimal(usd.toString());
                    result.put(entry.getKey(), price);
                    log.info("[CoinGecko] {} → {} USD", entry.getKey(), price);
                }
            }
            return result;
        } catch (Exception e) {
            log.error("[CoinGecko] Échec de la récupération des cours pour {} : {}", ids, e.getMessage());
            return Map.of();
        }
    }
}
