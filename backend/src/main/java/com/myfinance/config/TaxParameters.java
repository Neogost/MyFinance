package com.myfinance.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Paramètres fiscaux chargés depuis tax-parameters.yml.
 * Mis à jour annuellement : modifier le fichier YAML et redémarrer l'application.
 */
@Configuration
@ConfigurationProperties(prefix = "tax")
@Data
public class TaxParameters {

    private int year;
    private String incomePeriod;
    private FlatRateDeduction flatRateDeduction = new FlatRateDeduction();
    private List<TaxBracket> brackets;

    @Data
    public static class FlatRateDeduction {
        private float rate = 0.10f;
        private float min = 504.0f;
        private float max = 13522.0f;
    }

    @Data
    public static class TaxBracket {
        private float from;
        private Float to;   // null = borne supérieure infinie (dernière tranche)
        private float rate;
    }
}
