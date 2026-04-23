package com.myfinance.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

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
}
