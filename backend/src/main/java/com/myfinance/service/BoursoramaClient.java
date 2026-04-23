package com.myfinance.service;

import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Optional;

@Slf4j
@Service
public class BoursoramaClient {

    private static final String COURS_URL = "https://www.boursorama.com/cours/%s/";
    private static final String USER_AGENT =
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

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
}
