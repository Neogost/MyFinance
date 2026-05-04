package com.myfinance.service.math;

import java.util.List;

/**
 * Calcul du rendement Modified Dietz pour le TWR (Time-Weighted Return).
 * Stateless — aucune dépendance Spring ni persistance.
 *
 * Convention temporelle CFA Institute : le poids d'un flux le jour j d'un mois
 * de D jours est w = (D - j) / D. Le flux opère « en début de journée ».
 */
public class ModifiedDietzCalculator {

    /** Cashflow externe daté, en EUR (positif = versement, négatif = retrait). */
    public record Cashflow(int dayOfMonth, double amountEur) {}

    /**
     * Calcule le rendement Modified Dietz d'une sous-période (un mois calendaire).
     *
     * Formule :
     *   R_m = (V_fin - V_début - F_net) / (V_début + Σ w_i × F_i)
     *   F_net   = Σ F_i
     *   w_i     = (D - j_i) / D  (jour j_i, D jours dans le mois)
     *
     * @param vDebut       valeur du portefeuille en début de période (dernier jour du mois précédent)
     * @param vFin         valeur en fin de période (dernier jour du mois)
     * @param cashflows    liste des flux externes nets du mois (nettés par date avant appel)
     * @param daysInMonth  D = nombre de jours du mois calendaire
     * @return R_m, ou null si le dénominateur ≤ 0 (retrait total — sous-période clôturée)
     */
    public static Double subPeriodReturn(double vDebut, double vFin,
                                         List<Cashflow> cashflows, int daysInMonth) {
        double fNet = 0;
        double weightedFlows = 0;

        for (Cashflow c : cashflows) {
            fNet += c.amountEur();
            double weight = (double) (daysInMonth - c.dayOfMonth()) / daysInMonth;
            weightedFlows += weight * c.amountEur();
        }

        double denominator = vDebut + weightedFlows;
        if (denominator <= 0) return null;

        return (vFin - vDebut - fNet) / denominator;
    }

    /**
     * Chaîne une liste de rendements mensuels en un TWR total (non annualisé).
     * Les valeurs null sont ignorées (mois exclus = facteur 1).
     *
     * TWR_total = Π(1 + R_m) - 1
     */
    public static double chainReturns(List<Double> monthlyReturns) {
        double product = 1.0;
        for (Double r : monthlyReturns) {
            if (r != null) product *= (1.0 + r);
        }
        return product - 1.0;
    }

    /**
     * Annualise un rendement total sur une durée exprimée en jours.
     *
     * TWR_annualisé = (1 + TWR_total)^(365 / totalDays) - 1
     */
    public static double annualize(double totalReturn, long totalDays) {
        if (totalDays <= 0) return totalReturn;
        return Math.pow(1.0 + totalReturn, 365.0 / totalDays) - 1.0;
    }
}
