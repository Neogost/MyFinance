package com.myfinance.service.math;

import lombok.extern.slf4j.Slf4j;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Calcul du MWR (Money-Weighted Return) par la méthode XIRR (Newton-Raphson + bissection).
 * Stateless — aucune dépendance Spring ni persistance.
 *
 * Convention de signe : cashflow négatif = argent sorti de poche (investissement),
 * cashflow positif = argent reçu (retrait ou liquidation virtuelle à la date finale).
 *
 * Compatible avec la convention Excel =XIRR(values, dates).
 */
@Slf4j
public class XirrSolver {

    /** Cashflow daté pour le calcul XIRR. */
    public record CashflowPoint(LocalDate date, double amountEur) {}

    private static final double INITIAL_GUESS  = 0.10;
    private static final double TOLERANCE      = 1e-7;
    private static final int    MAX_ITERATIONS = 100;

    /**
     * Résout le XIRR pour une liste de cashflows.
     *
     * @return taux annualisé r (tel que Σ C_i / (1+r)^((d_i - d_0)/365) = 0),
     *         ou null si non convergent (avertissement loggué)
     */
    public static Double solve(List<CashflowPoint> cashflows) {
        if (cashflows == null || cashflows.size() < 2) return null;

        LocalDate t0 = cashflows.get(0).date();
        int n = cashflows.size();
        double[] amounts = new double[n];
        double[] years   = new double[n];

        for (int i = 0; i < n; i++) {
            amounts[i] = cashflows.get(i).amountEur();
            years[i]   = ChronoUnit.DAYS.between(t0, cashflows.get(i).date()) / 365.0;
        }

        // Newton-Raphson
        Double result = newtonRaphson(amounts, years);
        if (result != null) return result;

        // Fallback bissection
        return bisection(amounts, years);
    }

    // ── Implémentations privées ───────────────────────────────────────────────

    private static Double newtonRaphson(double[] amounts, double[] years) {
        double r = INITIAL_GUESS;

        for (int iter = 0; iter < MAX_ITERATIONS; iter++) {
            double f  = npv(r, amounts, years);
            double fp = npvDerivative(r, amounts, years);

            log.debug("Newton-Raphson itération {} : r={}, f(r)={}, f'(r)={}", iter, r, f, fp);

            if (Math.abs(f) < TOLERANCE) return r;
            if (Math.abs(fp) < 1e-15) break;    // dérivée nulle, impossible de continuer

            double rNext = r - f / fp;
            if (rNext <= -1.0) break;             // taux invalide, bascule en bissection

            if (Math.abs(rNext - r) < TOLERANCE) return rNext;
            r = rNext;
        }
        return null;
    }

    private static Double bisection(double[] amounts, double[] years) {
        double lo = -0.99, hi = 10.0;
        double fLo = npv(lo, amounts, years);
        double fHi = npv(hi, amounts, years);

        if (fLo * fHi > 0) {
            log.warn("Bissection XIRR : aucun changement de signe sur [{}, {}] — MWR non calculable", lo, hi);
            return null;
        }

        for (int iter = 0; iter < 1000; iter++) {
            double mid  = (lo + hi) / 2.0;
            double fMid = npv(mid, amounts, years);

            if (Math.abs(fMid) < TOLERANCE) return mid;

            if (fLo * fMid < 0) { hi = mid; fHi = fMid; }
            else                 { lo = mid; fLo = fMid; }
        }
        return (lo + hi) / 2.0;
    }

    /** Valeur actualisée nette : Σ C_i / (1+r)^t_i */
    private static double npv(double r, double[] amounts, double[] years) {
        double sum = 0;
        for (int i = 0; i < amounts.length; i++) {
            sum += amounts[i] / Math.pow(1.0 + r, years[i]);
        }
        return sum;
    }

    /** Dérivée de la VAN par rapport à r : Σ -C_i × t_i / (1+r)^(t_i + 1) */
    private static double npvDerivative(double r, double[] amounts, double[] years) {
        double sum = 0;
        for (int i = 0; i < amounts.length; i++) {
            sum -= amounts[i] * years[i] / Math.pow(1.0 + r, years[i] + 1.0);
        }
        return sum;
    }
}
