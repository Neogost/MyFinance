package com.myfinance.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDate;
import java.util.List;

/**
 * Paramètres spécifiques à la fonction publique chargés depuis tax-parameters.yml.
 *
 * Contient :
 *  - l'historique des revalorisations de la valeur du point d'indice
 *  - les taux de cotisations salariales pour titulaires et contractuels
 */
@Configuration
@ConfigurationProperties(prefix = "fonction-publique")
@Data
public class PublicSectorParameters {

    private PointIndice pointIndice = new PointIndice();
    private Cotisations cotisations = new Cotisations();

    @Data
    public static class PointIndice {
        private List<PointValueEntry> history;
    }

    @Data
    public static class PointValueEntry {
        private LocalDate effectiveDate;
        private double annualValue;
    }

    @Data
    public static class Cotisations {
        private TitulaireRates titulaire = new TitulaireRates();
        private ContractuelRates contractuel = new ContractuelRates();
    }

    @Data
    public static class TitulaireRates {
        /** Pension civile CNRACL — assiette : traitement indiciaire brut */
        private float pensionCivile = 0.1110f;
        /** CSG déductible effective (6,80 % × 0,9825) — réduit le net imposable */
        private float csgDeductible = 0.0668f;
        /** CSG non déductible effective (2,40 % × 0,9825) — prélevée mais non déductible */
        private float csgNonDeductible = 0.0236f;
        /** CRDS effective (0,50 % × 0,9825) — prélevée mais non déductible */
        private float crds = 0.0049f;
    }

    @Data
    public static class ContractuelRates {
        /** Si true, utilise les taux du privé (tax.employee-contributions) */
        private boolean inheritsPrivate = true;
    }
}
