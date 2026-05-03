package com.myfinance.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.TreeMap;

/**
 * Client pour l'API Frankfurter (données BCE) — retourne les taux EUR/devise.
 * Convention : rate = unités de devise étrangère pour 1 EUR (ex: USD=1.09 → 1 EUR = 1.09 USD).
 * Cohérent avec la convention ExchangeRate du projet : amountEur = amountNatif / rate.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EcbRateClient {

    private final RestTemplate restTemplate;

    private static final String RATES_URL = "https://api.frankfurter.app/latest?from=EUR";
    private static final String HISTORY_URL = "https://api.frankfurter.app/{from}..{to}?from=EUR&to={currency}";

    @SuppressWarnings("unchecked")
    public Map<String, BigDecimal> getRates() {
        try {
            log.debug("[ECB] Récupération des taux de change EUR/devises via Frankfurter");
            Map<String, Object> response = restTemplate.getForObject(RATES_URL, Map.class);
            if (response == null) return Map.of();

            Map<String, Object> rates = (Map<String, Object>) response.get("rates");
            if (rates == null) return Map.of();

            Map<String, BigDecimal> result = new HashMap<>();
            for (Map.Entry<String, Object> entry : rates.entrySet()) {
                result.put(entry.getKey(), new BigDecimal(entry.getValue().toString()));
            }
            log.info("[ECB] {} taux de change récupérés (date : {})", result.size(), response.get("date"));
            return result;
        } catch (Exception e) {
            log.error("[ECB] Échec de la récupération des taux : {}", e.getMessage());
            return Map.of();
        }
    }

    /**
     * Récupère l'historique daily des taux EUR/{currency} entre deux dates inclusives.
     * Frankfurter ne retourne que les jours ouvrés (pas de week-end ni de jours fériés BCE).
     * En cas d'erreur, retourne une map vide.
     */
    @SuppressWarnings("unchecked")
    public Map<LocalDate, BigDecimal> getRatesHistory(String currency, LocalDate from, LocalDate to) {
        try {
            log.debug("[ECB] Historique {} entre {} et {} via Frankfurter", currency, from, to);
            Map<String, Object> response = restTemplate.getForObject(
                    HISTORY_URL, Map.class,
                    from.toString(), to.toString(), currency);
            if (response == null) return Map.of();

            Map<String, Object> rates = (Map<String, Object>) response.get("rates");
            if (rates == null || rates.isEmpty()) {
                log.warn("[ECB] Historique vide pour {} ({} → {})", currency, from, to);
                return Map.of();
            }

            Map<LocalDate, BigDecimal> result = new TreeMap<>();
            for (Map.Entry<String, Object> dayEntry : rates.entrySet()) {
                LocalDate date = LocalDate.parse(dayEntry.getKey());
                Map<String, Object> dayRates = (Map<String, Object>) dayEntry.getValue();
                Object rate = dayRates.get(currency);
                if (rate != null) {
                    result.put(date, new BigDecimal(rate.toString()));
                }
            }
            log.info("[ECB] {} jours d'historique récupérés pour {} ({} → {})",
                    result.size(), currency, from, to);
            return result;
        } catch (Exception e) {
            log.error("[ECB] Échec historique {} ({} → {}) : {}", currency, from, to, e.getMessage());
            return Map.of();
        }
    }
}
