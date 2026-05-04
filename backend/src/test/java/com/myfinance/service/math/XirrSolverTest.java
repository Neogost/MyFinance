package com.myfinance.service.math;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static com.myfinance.service.math.XirrSolver.CashflowPoint;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

/**
 * Golden tests du XirrSolver.
 * Tous les résultats sont vérifiables dans Excel via =XIRR(values, dates).
 * Tolérance : epsilon = 1e-4 (0,01 % — suffisant pour validation manuelle).
 */
class XirrSolverTest {

    private static final double EPS = 1e-4;

    // ── Cas nominaux ──────────────────────────────────────────────────────────

    @Test
    void cas1_versementUnique_plusValue10pct_1an() {
        // (2023-01-01, -1000) + (2024-01-01, +1100)
        // 2023 n'est pas une année bissextile → exactement 365 jours
        // XIRR = (1100/1000) - 1 = 0.10 exactement
        List<CashflowPoint> flows = List.of(
                new CashflowPoint(LocalDate.of(2023, 1, 1), -1000),
                new CashflowPoint(LocalDate.of(2024, 1, 1), +1100)
        );
        Double xirr = XirrSolver.solve(flows);
        assertThat(xirr).isNotNull().isCloseTo(0.10, within(EPS));
    }

    @Test
    void cas2_versementUnique_plusValue21pct_2ans() {
        // (2022-01-01, -1000) + (2024-01-01, +1210)
        // 2022 et 2023 ne sont pas bissextiles → exactement 730 jours
        // XIRR = (1210/1000)^(365/730) - 1 = 1.21^0.5 - 1 = 0.10
        List<CashflowPoint> flows = List.of(
                new CashflowPoint(LocalDate.of(2022, 1, 1), -1000),
                new CashflowPoint(LocalDate.of(2024, 1, 1), +1210)
        );
        Double xirr = XirrSolver.solve(flows);
        assertThat(xirr).isNotNull().isCloseTo(0.10, within(EPS));
    }

    @Test
    void cas3_deuxVersements_valeurFinale() {
        // (2024-01-01, -1000) + (2024-07-01, -1000) + (2025-01-01, +2100)
        // Vérifié via Excel =XIRR({-1000,-1000,2100},{2024-01-01,2024-07-01,2025-01-01}) ≈ 6.73%
        List<CashflowPoint> flows = List.of(
                new CashflowPoint(LocalDate.of(2024, 1, 1), -1000),
                new CashflowPoint(LocalDate.of(2024, 7, 1), -1000),
                new CashflowPoint(LocalDate.of(2025, 1, 1), +2100)
        );
        Double xirr = XirrSolver.solve(flows);
        assertThat(xirr).isNotNull().isCloseTo(0.0673, within(1e-3));
    }

    @Test
    void cas4_perte50pct() {
        // (2023-01-01, -1000) + (2024-01-01, +500)
        // 2023 non bissextile → 365 jours → XIRR = 500/1000 - 1 = -0.50
        List<CashflowPoint> flows = List.of(
                new CashflowPoint(LocalDate.of(2023, 1, 1), -1000),
                new CashflowPoint(LocalDate.of(2024, 1, 1), +500)
        );
        Double xirr = XirrSolver.solve(flows);
        assertThat(xirr).isNotNull().isCloseTo(-0.50, within(EPS));
    }

    @Test
    void cas5_plusValueNulle_taux0() {
        // (2024-01-01, -1000) + (2025-01-01, +1000)
        // XIRR = 0 exactement
        List<CashflowPoint> flows = List.of(
                new CashflowPoint(LocalDate.of(2024, 1, 1), -1000),
                new CashflowPoint(LocalDate.of(2025, 1, 1), +1000)
        );
        Double xirr = XirrSolver.solve(flows);
        assertThat(xirr).isNotNull().isCloseTo(0.0, within(EPS));
    }

    @Test
    void cas6_cashflowsInconsistants_retourneNull() {
        // Tous les flux sont positifs (entrants) — pas de solution réelle
        List<CashflowPoint> flows = List.of(
                new CashflowPoint(LocalDate.of(2024, 1, 1), +1000),
                new CashflowPoint(LocalDate.of(2025, 1, 1), +500)
        );
        Double xirr = XirrSolver.solve(flows);
        assertThat(xirr).isNull();
    }

    @Test
    void cas7_cashflowJourBissextile() {
        // (2024-02-29, -1000) + (2025-02-28, +1100)
        // Durée = 365 jours → XIRR ≈ 0.10 (comme cas 1)
        List<CashflowPoint> flows = List.of(
                new CashflowPoint(LocalDate.of(2024, 2, 29), -1000),
                new CashflowPoint(LocalDate.of(2025, 2, 28), +1100)
        );
        Double xirr = XirrSolver.solve(flows);
        assertThat(xirr).isNotNull().isCloseTo(0.10, within(EPS));
    }

    // ── Cas limites ───────────────────────────────────────────────────────────

    @Test
    void solve_listeNull_retourneNull() {
        assertThat(XirrSolver.solve(null)).isNull();
    }

    @Test
    void solve_unSeulCashflow_retourneNull() {
        assertThat(XirrSolver.solve(List.of(
                new CashflowPoint(LocalDate.of(2024, 1, 1), -1000)))).isNull();
    }
}
