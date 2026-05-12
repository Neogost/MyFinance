package com.myfinance.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.List;
import java.util.Map;

/**
 * Barèmes de donation chargés depuis donation-parameters.yml.
 * Mis à jour selon la loi de finances annuelle : modifier le YAML et redémarrer.
 *
 * Note : les noms de champs doivent rester à 2 mots max en camelCase pour que
 * le binding Spring Boot @ConfigurationProperties fonctionne correctement
 * (contrainte observée avec les List<Object> en Spring Boot 3.5).
 */
@Configuration
@ConfigurationProperties(prefix = "donation")
@Data
public class DonationParameters {

    /** Abattements légaux par lien de parenté (€). */
    private Map<String, Integer> abattements;

    /** Bonus abattement pour personne handicapée (art. 779-II CGI). */
    private int handicapBonus;

    /** Barème ligne directe (art. 777 CGI) : enfants, conjoint, descendants. */
    private List<Tranche> ligneDirecte;

    /** Barème frères et sœurs (art. 777 CGI). */
    private List<Tranche> freresSoeurs;

    /** Barème tiers / autres liens (art. 777 CGI). */
    private List<Tranche> autres;

    /** Émoluments du notaire — barème réglementé (décret tarifaire 2023), appliqué HT. */
    private List<Tranche> emolumentsNotaire;

    /** Frais de formalités forfaitaires (débours, copies, formalités). */
    private int fraisFormalites;

    /** Minimum d'émoluments HT (90 € légal). */
    private int emolumentsMinimum;

    /** Taxe de publicité foncière (immobilier uniquement) — sur valeur transmise. */
    private double taxePubliciteFonciere;

    /** Contribution de sécurité immobilière (immobilier uniquement) — sur valeur transmise. */
    private double contributionSecuriteImmobiliere;

    /** Table démembrement art. 669 CGI. */
    private List<Demembrement> demembrement;

    @Data
    public static class Tranche {
        private double from;   // borne inférieure (inclusive)
        private Double to;     // borne supérieure (exclusive) — null = tranche terminale
        private double rate;
    }

    @Data
    public static class Demembrement {
        private int ageMax;      // âge de l'usufruitier (inclusive)
        private double npRatio;  // fraction de la valeur fiscale de la nue-propriété
    }
}
