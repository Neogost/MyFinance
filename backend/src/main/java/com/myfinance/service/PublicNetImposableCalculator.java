package com.myfinance.service;

import com.myfinance.config.PublicSectorParameters;
import com.myfinance.config.TaxParameters;

/**
 * Calcule le net imposable pour les fonctionnaires titulaires.
 *
 * Cotisations déductibles du revenu imposable (titulaire) :
 *   - Pension civile (CNRACL) : 11,10 % du TIB
 *   - CSG déductible effective : 6,68 % (6,80 % × 98,25 % d'abattement)
 *
 * Non déductibles (prélevées mais réintégrées dans la base imposable) :
 *   - CSG non déductible : 2,36 %
 *   - CRDS : 0,49 %
 *
 * Pour les contractuels publics, le calcul privé est réutilisé (régime général).
 */
public class PublicNetImposableCalculator {

    private PublicNetImposableCalculator() {}

    /**
     * @param brut             Traitement indiciaire brut annuel (IM × valeur du point)
     * @param prevoyanceRate   Taux prévoyance/mutuelle salarié en décimal (nullable)
     * @param rates            Taux de cotisations titulaire depuis la configuration
     * @return                 Net imposable annuel en €
     */
    public static float calculerTitulaire(float brut,
                                          Float prevoyanceRate,
                                          PublicSectorParameters.TitulaireRates rates) {
        float pensionCivile = brut * rates.getPensionCivile();
        float csgDeductible = brut * rates.getCsgDeductible();
        float prevoyance    = prevoyanceRate != null ? brut * prevoyanceRate : 0f;

        float totalDeductible = pensionCivile + csgDeductible + prevoyance;
        return Math.max(0f, brut - totalDeductible);
    }

    /**
     * Calcule le net imposable pour un contractuel public.
     * Délègue au calculateur privé (régime général identique).
     */
    public static float calculerContractuel(float brut, Float prevoyanceRate, TaxParameters taxParams) {
        return NetImposableCalculator.calculer(brut, false, prevoyanceRate, taxParams);
    }
}
