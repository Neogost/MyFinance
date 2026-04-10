package com.myfinance.service;

import com.myfinance.config.TaxParameters;

/**
 * Calcule le salaire net imposable (net fiscal) à partir du brut annuel.
 *
 * Formule : brut − cotisations salariales déductibles du revenu imposable.
 * Sont exclues du déductible : CSG non déductible (2,40%) et CRDS (0,50%),
 * qui sont prélevées mais réintégrées dans la base imposable.
 *
 * Les taux et le PASS sont externalisés dans tax-parameters.yml.
 */
public class NetImposableCalculator {

    private NetImposableCalculator() {}

    /**
     * @param brut             Salaire brut annuel en €
     * @param isCadre          true = cadre (APEC applicable)
     * @param prevoyanceRate   Taux prévoyance/mutuelle salarié en décimal (ex : 0.015), nullable
     * @param params           Paramètres fiscaux chargés depuis tax-parameters.yml
     * @return                 Net imposable annuel en €
     */
    public static float calculer(float brut, boolean isCadre, Float prevoyanceRate, TaxParameters params) {
        float pass = params.getPass();
        TaxParameters.EmployeeContributions c = params.getEmployeeContributions();

        // Assiette CSG/CRDS = brut × 98,25%
        float assietteCsg = brut * c.getCsgBaseRate();

        // Vieillesse plafonnée (dans la limite du PASS) + déplafonnée (sur totalité)
        float vieillessePlaf    = Math.min(brut, pass) * c.getVieillessePlafonneRate();
        float vieillesseDeplaf  = brut * c.getVieillesseDePlafonneeRate();

        // CSG déductible
        float csgDeductible = assietteCsg * c.getCsgDeductibleRate();

        // AGIRC-ARRCO + CEG — tranches T1 (0→PASS) et T2 (PASS→8×PASS)
        float t1Base = Math.min(brut, pass);
        float t2Base = Math.max(0f, Math.min(brut, pass * 8f) - pass);
        float agircArrco = t1Base * c.getAgircArrcoT1Rate() + t2Base * c.getAgircArrcoT2Rate();
        float ceg        = t1Base * c.getCegT1Rate()        + t2Base * c.getCegT2Rate();

        // APEC (cadres uniquement, jusqu'à 4 PASS)
        float apec = 0f;
        if (isCadre) {
            float apecBase = Math.min(brut, pass * 4f);
            apec = apecBase * c.getApecRate();
        }

        // Prévoyance / mutuelle salarié (variable selon convention)
        float prevoyance = prevoyanceRate != null ? brut * prevoyanceRate : 0f;

        float totalDeductible = vieillessePlaf + vieillesseDeplaf + csgDeductible
                + agircArrco + ceg + apec + prevoyance;

        return Math.max(0f, brut - totalDeductible);
    }
}
