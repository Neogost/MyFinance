package com.myfinance.service.math;

import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;

import static com.myfinance.service.math.ModifiedDietzCalculator.Cashflow;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

/**
 * Golden tests du Modified Dietz Calculator.
 * Chaque résultat est calculé à la main avant assertion (cf. commentaires).
 * Tolérance : epsilon = 1e-6 (formules en double, erreur < 1e-15).
 */
class ModifiedDietzCalculatorTest {

    private static final double EPS = 1e-6;

    // ── subPeriodReturn ───────────────────────────────────────────────────────

    @Test
    void cas1_aucunCashflow_plusValue10pct() {
        // V_début=1000, V_fin=1100, F=[]
        // R = (1100 - 1000 - 0) / (1000 + 0) = 100/1000 = 0.10
        Double r = ModifiedDietzCalculator.subPeriodReturn(1000, 1100, List.of(), 30);
        assertThat(r).isNotNull().isCloseTo(0.10, within(EPS));
    }

    @Test
    void cas2_cashflowPremierJour_poidsProche1() {
        // V_début=1000, V_fin=2100, F=[(jour=1, +1000)], mois 30 jours
        // w₁ = (30-1)/30 = 29/30 ≈ 0.9667
        // numérateur  = 2100 - 1000 - 1000 = 100
        // dénominateur = 1000 + 0.9667×1000 = 1966.67
        // R ≈ 100 / 1966.67 ≈ 0.050847
        Double r = ModifiedDietzCalculator.subPeriodReturn(
                1000, 2100, List.of(new Cashflow(1, 1000)), 30);
        double w1 = (30.0 - 1) / 30;
        double expected = 100.0 / (1000 + w1 * 1000);
        assertThat(r).isNotNull().isCloseTo(expected, within(EPS));
    }

    @Test
    void cas3_cashflowDernierJour_poidsZero() {
        // V_début=1000, V_fin=2100, F=[(jour=30, +1000)], mois 30 jours
        // w₁ = (30-30)/30 = 0
        // numérateur  = 2100 - 1000 - 1000 = 100
        // dénominateur = 1000 + 0×1000 = 1000
        // R = 100/1000 = 0.10
        Double r = ModifiedDietzCalculator.subPeriodReturn(
                1000, 2100, List.of(new Cashflow(30, 1000)), 30);
        assertThat(r).isNotNull().isCloseTo(0.10, within(EPS));
    }

    @Test
    void cas4_cashflowMilieuDeMois() {
        // V_début=1000, V_fin=2100, F=[(jour=15, +1000)], mois 30 jours
        // w₁ = (30-15)/30 = 0.5
        // numérateur  = 100
        // dénominateur = 1000 + 0.5×1000 = 1500
        // R = 100/1500 ≈ 0.066667
        Double r = ModifiedDietzCalculator.subPeriodReturn(
                1000, 2100, List.of(new Cashflow(15, 1000)), 30);
        assertThat(r).isNotNull().isCloseTo(100.0 / 1500, within(EPS));
    }

    @Test
    void cas5_plusieursCashflows() {
        // V_début=1000, V_fin=3000, F=[(jour=10, +1000), (jour=20, +500)], mois 30 jours
        // w₁ = (30-10)/30 = 20/30 = 0.6667, F₁ = +1000 → w₁×F₁ = 666.67
        // w₂ = (30-20)/30 = 10/30 = 0.3333, F₂ = +500  → w₂×F₂ = 166.67
        // F_net = 1500
        // numérateur  = 3000 - 1000 - 1500 = 500
        // dénominateur = 1000 + 666.67 + 166.67 = 1833.34
        // R ≈ 500 / 1833.34 ≈ 0.272727
        Double r = ModifiedDietzCalculator.subPeriodReturn(
                1000, 3000,
                List.of(new Cashflow(10, 1000), new Cashflow(20, 500)),
                30);
        double w1 = 20.0 / 30, w2 = 10.0 / 30;
        double expected = 500.0 / (1000 + w1 * 1000 + w2 * 500);
        assertThat(r).isNotNull().isCloseTo(expected, within(EPS));
    }

    @Test
    void cas6_retraitNet_rendementNegatif() {
        // V_début=2000, V_fin=900, F=[(jour=15, -1000)], mois 30 jours
        // w₁ = 0.5, W×F = -500
        // numérateur  = 900 - 2000 - (-1000) = -100
        // dénominateur = 2000 + (-500) = 1500
        // R = -100/1500 ≈ -0.066667
        Double r = ModifiedDietzCalculator.subPeriodReturn(
                2000, 900, List.of(new Cashflow(15, -1000)), 30);
        assertThat(r).isNotNull().isCloseTo(-100.0 / 1500, within(EPS));
    }

    @Test
    void cas7_denominateurNegatif_retourneNull() {
        // V_début=500, V_fin=0, F=[(jour=1, -1000)]
        // w₁ = 29/30 ≈ 0.9667, W×F ≈ -966.67
        // dénominateur = 500 - 966.67 < 0 → retourne null
        Double r = ModifiedDietzCalculator.subPeriodReturn(
                500, 0, List.of(new Cashflow(1, -1000)), 30);
        assertThat(r).isNull();
    }

    // ── chainReturns ──────────────────────────────────────────────────────────

    @Test
    void cas8_chainageDeux_moisA5pct_chacun() {
        // TWR_total = (1.05)² - 1 = 0.1025
        double twr = ModifiedDietzCalculator.chainReturns(List.of(0.05, 0.05));
        assertThat(twr).isCloseTo(0.1025, within(EPS));
    }

    @Test
    void chainReturns_ignoreNullsMoisExclus() {
        // Mois exclu (null) doit être ignoré (facteur 1)
        // TWR = (1.05)×1×(1.05) - 1 = 0.1025
        // Arrays.asList accepte les nulls, contrairement à List.of()
        double twr = ModifiedDietzCalculator.chainReturns(Arrays.asList(0.05, null, 0.05));
        assertThat(twr).isCloseTo(0.1025, within(EPS));
    }

    // ── annualize ─────────────────────────────────────────────────────────────

    @Test
    void cas9_annualisationSur2Ans_21pct() {
        // TWR_total = 0.21, durée = 730 jours
        // TWR_annualisé = (1.21)^(365/730) - 1 = (1.21)^0.5 - 1 ≈ 0.10
        double annualized = ModifiedDietzCalculator.annualize(0.21, 730);
        assertThat(annualized).isCloseTo(0.10, within(EPS));
    }

    @Test
    void cas10_annualisationSur6Mois_5pct() {
        // TWR_total = 0.05, durée = 182 jours
        // TWR_annualisé = (1.05)^(365/182) - 1 ≈ 0.10274
        double annualized = ModifiedDietzCalculator.annualize(0.05, 182);
        double expected = Math.pow(1.05, 365.0 / 182) - 1.0;
        assertThat(annualized).isCloseTo(expected, within(EPS));
    }

    @Test
    void annualize_dureZero_retourneTotalReturn() {
        // Garde-fou : division par zéro évitée
        double annualized = ModifiedDietzCalculator.annualize(0.10, 0);
        assertThat(annualized).isCloseTo(0.10, within(EPS));
    }
}
