package com.myfinance.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class BoursoramaClient {

    private static final String COURS_URL       = "https://www.boursorama.com/cours/%s/";
    private static final String COMPOSITION_URL = "https://www.boursorama.com/bourse/trackers/cours/composition/%s/";
    private static final String USER_AGENT =
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

    private final ObjectMapper objectMapper;

    public Optional<BigDecimal> getPrice(String boursoramaSymbol) {
        try {
            log.debug("[Boursorama] Récupération cours pour symbole {}", boursoramaSymbol);
            String url = String.format(COURS_URL, boursoramaSymbol);
            Document doc = Jsoup.connect(url)
                    .userAgent(USER_AGENT)
                    .timeout(10_000)
                    .followRedirects(true)
                    .get();

            Element el = doc.selectFirst("span.c-instrument--last[data-ist-last]");
            if (el == null) {
                log.warn("[Boursorama] Élément prix non trouvé pour symbole {}", boursoramaSymbol);
                return Optional.empty();
            }

            // Format français : "30,8419" ou "59 140,23" (espace = séparateur de milliers)
            String priceText = el.text()
                    .replace("\u00a0", "")
                    .replace(" ", "")
                    .replace(",", ".");

            BigDecimal price = new BigDecimal(priceText);
            log.info("[Boursorama] Symbole {} → {} EUR", boursoramaSymbol, price);
            return Optional.of(price);
        } catch (Exception e) {
            log.error("[Boursorama] Échec pour symbole {} : {}", boursoramaSymbol, e.getMessage());
            return Optional.empty();
        }
    }

    /** Scrape la répartition géographique depuis la page composition Boursorama. */
    public List<CountryEntry> getCountryAllocation(String boursoramaSymbol) {
        try {
            String url = String.format(COMPOSITION_URL, boursoramaSymbol);
            Document doc = Jsoup.connect(url)
                    .userAgent(USER_AGENT)
                    .timeout(15_000)
                    .followRedirects(true)
                    .get();

            for (Element script : doc.select("script")) {
                String text = script.html();
                if (!text.contains("\"id\":\"regional\"")) continue;

                // Les données sont dans amChartData:[{name, value}] du script contenant le graphe régional
                int dataStart = text.indexOf("\"amChartData\":[");
                if (dataStart == -1) continue;
                int arrStart = text.indexOf('[', dataStart);
                int arrEnd   = text.indexOf(']', arrStart);
                if (arrStart == -1 || arrEnd == -1) continue;

                String jsonArray = text.substring(arrStart, arrEnd + 1);
                JsonNode nodes = objectMapper.readTree(jsonArray);
                List<CountryEntry> result = new ArrayList<>();
                for (JsonNode node : nodes) {
                    result.add(new CountryEntry(
                            node.get("name").asText(),
                            new BigDecimal(node.get("value").asText())));
                }
                log.debug("[Boursorama] {} — {} pays récupérés", boursoramaSymbol, result.size());
                return result;
            }
        } catch (Exception e) {
            log.error("[Boursorama] Échec composition pour symbole {} : {}", boursoramaSymbol, e.getMessage());
        }
        return List.of();
    }

    public record CountryEntry(String name, BigDecimal percentage) {}
}
