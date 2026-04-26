package com.myfinance.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Barème kilométrique fiscal chargé depuis bareme-kilometrique.yml.
 * Mis à jour annuellement : modifier le fichier YAML et redémarrer l'application.
 */
@Configuration
@ConfigurationProperties(prefix = "bareme-kilometrique")
@Data
public class BaremeKilometriqueProperties {

    private int annee;
    private String avertissement;
    private double multiplicateurElectrique;
    private List<VoitureBareme> voitures;

    @Data
    public static class VoitureBareme {
        private int cvMax;
        private String label;
        private List<Tranche> tranches;
    }

    @Data
    public static class Tranche {
        private Integer kmMax; // null = illimité (dernière tranche)
        private double taux;
        private double forfait;
    }
}
