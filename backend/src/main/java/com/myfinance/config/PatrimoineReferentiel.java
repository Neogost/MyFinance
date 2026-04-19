package com.myfinance.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Référentiel patrimoine brut par tranche d'âge, chargé depuis patrimoine-referentiel.yml.
 * Source : INSEE Enquête Patrimoine 2021-2022.
 */
@Configuration
@ConfigurationProperties(prefix = "patrimoine")
@Data
public class PatrimoineReferentiel {

    private String source;
    private List<Tranche> tranches;

    @Data
    public static class Tranche {
        private String label;
        private int ageMin;
        private int ageMax;
        private long d1;
        private long d2;
        private long d3;
        private long d4;
        private long d5;
        private long d6;
        private long d7;
        private long d8;
        private long d9;
    }
}
