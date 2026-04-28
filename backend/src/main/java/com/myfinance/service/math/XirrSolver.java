package com.myfinance.service.math;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Calcul du XIRR (taux interne de rendement pondéré par le temps des flux monétaires).
 * Algorithme : Newton-Raphson avec fallback par bissection.
 */
public final class XirrSolver {

    public record Cashflow(LocalDate date, double amount) {}

    private static final double TOLERANCE  = 1e-7;
    private static final int    MAX_ITER   = 200;
    private static final double INITIAL_GUESS = 0.1;

    private XirrSolver() {}

    /**
     * @param cashflows flux datés : versements négatifs (argent sorti de poche), encaissements positifs.
     *                  Doit inclure la valeur terminale en dernière position (positive).
     * @return taux annualisé (ex. 0.092 = 9,2 %) ou null si la convergence échoue.
     */
    public static Double solve(List<Cashflow> cashflows) {
        if (cashflows == null || cashflows.size() < 2) return null;

        LocalDate t0 = cashflows.get(0).date();

        // Newton-Raphson
        double r = INITIAL_GUESS;
        for (int i = 0; i < MAX_ITER; i++) {
            double npv  = npv(cashflows, t0, r);
            double dnpv = dnpv(cashflows, t0, r);
            if (Math.abs(dnpv) < 1e-12) break;
            double rNext = r - npv / dnpv;
            if (Math.abs(rNext - r) < TOLERANCE) return rNext;
            r = rNext;
        }

        // Bissection (fallback si Newton diverge)
        return bisection(cashflows, t0);
    }

    private static double npv(List<Cashflow> cfs, LocalDate t0, double r) {
        double sum = 0;
        for (Cashflow cf : cfs) {
            double years = ChronoUnit.DAYS.between(t0, cf.date()) / 365.0;
            sum += cf.amount() / Math.pow(1 + r, years);
        }
        return sum;
    }

    private static double dnpv(List<Cashflow> cfs, LocalDate t0, double r) {
        double sum = 0;
        for (Cashflow cf : cfs) {
            double years = ChronoUnit.DAYS.between(t0, cf.date()) / 365.0;
            sum += -years * cf.amount() / Math.pow(1 + r, years + 1);
        }
        return sum;
    }

    private static Double bisection(List<Cashflow> cfs, LocalDate t0) {
        double lo = -0.999, hi = 100.0;
        if (Math.signum(npv(cfs, t0, lo)) == Math.signum(npv(cfs, t0, hi))) return null;
        for (int i = 0; i < MAX_ITER; i++) {
            double mid = (lo + hi) / 2.0;
            double npvMid = npv(cfs, t0, mid);
            if (Math.abs(npvMid) < TOLERANCE || (hi - lo) / 2.0 < TOLERANCE) return mid;
            if (Math.signum(npvMid) == Math.signum(npv(cfs, t0, lo))) lo = mid;
            else hi = mid;
        }
        return null;
    }
}
