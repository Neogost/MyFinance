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
    private float pass = 47100.0f;
    private EmployeeContributions employeeContributions = new EmployeeContributions();
    private FlatRateDeduction flatRateDeduction = new FlatRateDeduction();
    private List<TaxBracket> brackets;

    @Data
    public static class EmployeeContributions {
        private float csgBaseRate           = 0.9825f;
        private float csgDeductibleRate     = 0.0680f;
        private float vieillessePlafonneRate    = 0.0690f;
        private float vieillesseDePlafonneeRate = 0.0040f;
        private float agircArrcoT1Rate      = 0.0315f;
        private float cegT1Rate             = 0.0086f;
        private float agircArrcoT2Rate      = 0.0864f;
        private float cegT2Rate             = 0.0108f;
        private float apecRate              = 0.00024f; // cadres, jusqu'à 4 PASS
    }

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
