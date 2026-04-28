package com.myfinance.service.math;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class XirrSolverTest {

    private static final double EPSILON = 0.002; // tolérance 0,2 % (XIRR varie selon nb de jours réels)

    @Test
    void solve_rendementNul_siFuxEgaux() {
        // Investir 1000 € et récupérer 1000 € un an plus tard → taux = 0 %
        List<XirrSolver.Cashflow> cashflows = List.of(
                new XirrSolver.Cashflow(LocalDate.of(2024, 1, 1), -1000),
                new XirrSolver.Cashflow(LocalDate.of(2025, 1, 1), +1000)
        );
        Double rate = XirrSolver.solve(cashflows);
        assertThat(rate).isNotNull().isCloseTo(0.0, within(EPSILON));
    }

    @Test
    void solve_rendementExact10Pourcent() {
        // Investir 1000 €, recevoir 1100 € un an plus tard → taux = 10 %
        List<XirrSolver.Cashflow> cashflows = List.of(
                new XirrSolver.Cashflow(LocalDate.of(2024, 1, 1), -1000),
                new XirrSolver.Cashflow(LocalDate.of(2025, 1, 1), +1100)
        );
        Double rate = XirrSolver.solve(cashflows);
        assertThat(rate).isNotNull().isCloseTo(0.10, within(EPSILON));
    }

    @Test
    void solve_fluxMultiples_convergeProprement() {
        // Scénario DCA : 3 versements de 1000 €, valeur finale 3500 €
        List<XirrSolver.Cashflow> cashflows = List.of(
                new XirrSolver.Cashflow(LocalDate.of(2023, 1, 1),  -1000),
                new XirrSolver.Cashflow(LocalDate.of(2023, 7, 1),  -1000),
                new XirrSolver.Cashflow(LocalDate.of(2024, 1, 1),  -1000),
                new XirrSolver.Cashflow(LocalDate.of(2024, 6, 30), +3500)
        );
        Double rate = XirrSolver.solve(cashflows);
        // Taux positif : la valeur finale dépasse l'investissement total
        assertThat(rate).isNotNull().isGreaterThan(0.0);
    }

    @Test
    void solve_tauxNegatif_siPerteSurInvestissement() {
        // Investir 1000 €, récupérer 800 € — perte de 20 % en 1 an
        List<XirrSolver.Cashflow> cashflows = List.of(
                new XirrSolver.Cashflow(LocalDate.of(2024, 1, 1), -1000),
                new XirrSolver.Cashflow(LocalDate.of(2025, 1, 1),  +800)
        );
        Double rate = XirrSolver.solve(cashflows);
        assertThat(rate).isNotNull().isCloseTo(-0.20, within(EPSILON));
    }

    @Test
    void solve_retourneNull_siMoinsDeDeuxFlux() {
        assertThat(XirrSolver.solve(null)).isNull();
        assertThat(XirrSolver.solve(List.of())).isNull();
        assertThat(XirrSolver.solve(List.of(new XirrSolver.Cashflow(LocalDate.now(), -100)))).isNull();
    }

    @Test
    void solve_rendementTresMiseAEchelleAnnuelle() {
        // Investir 1000 €, récupérer 1050 € en 6 mois → ~10 % annualisé
        List<XirrSolver.Cashflow> cashflows = List.of(
                new XirrSolver.Cashflow(LocalDate.of(2024, 1, 1), -1000),
                new XirrSolver.Cashflow(LocalDate.of(2024, 7, 1), +1050)
        );
        Double rate = XirrSolver.solve(cashflows);
        // En 6 mois, 5 % correspond à ~10,25 % annualisé
        assertThat(rate).isNotNull().isGreaterThan(0.09).isLessThan(0.12);
    }
}
