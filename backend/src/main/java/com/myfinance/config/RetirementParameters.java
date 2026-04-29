package com.myfinance.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Barèmes retraite chargés depuis retirement-parameters.yml.
 * Couvre : PASS, Régime Général (CNAV), Agirc-Arrco, RAFP.
 */
@Component
@ConfigurationProperties(prefix = "retirement")
@Data
public class RetirementParameters {

    private PassConfig pass;
    private BaseSchemeConfig baseScheme;
    private AgircArrcoConfig agircArrco;
    private RafpConfig rafp;

    @Data
    public static class PassConfig {
        private List<PassEntry> history;
        private double growthRate;
    }

    @Data
    public static class PassEntry {
        private int year;
        private double value;
    }

    @Data
    public static class BaseSchemeConfig {
        private double privateRate;
        private double publicRate;
        private double decoteByMissingTrimestre;
        private double maxDecote;
        private double maxSurcote;
        private double socialChargesRateBase;
        private double socialChargesRateWithComplementary;
        private Map<String, Integer> trimestresByGeneration;
        private int trimestresByGenerationDefault;
        private Map<String, Integer> ageMinimalByGeneration;
        private int ageMinimalDefault;
        private int ageTauxPleinAuto;
    }

    @Data
    public static class AgircArrcoConfig {
        private double pointPurchasePrice;
        private double pointValue;
        private double employeeRateT1;
        private double employeeRateT2;
        private double coefficientSolidaritePenalty;
        private int coefficientSolidariteDuration;
    }

    @Data
    public static class RafpConfig {
        private double pointValue;
        private double pointPurchasePrice;
        private double employeeRate;
        private double employerRate;
        private double primeCapPercentage;
    }
}
