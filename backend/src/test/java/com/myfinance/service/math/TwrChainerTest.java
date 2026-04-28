package com.myfinance.service.math;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class TwrChainerTest {

    private static final double EPSILON = 0.001;

    @Test
    void compute_sousperiodeUnique_sansFlux() {
        // Valeur passe de 1000 à 1100 sans aucun versement → +10 %
        List<TwrChainer.SnapshotPoint> snapshots = List.of(
                new TwrChainer.SnapshotPoint(LocalDate.of(2024, 1, 1), 1000.0),
                new TwrChainer.SnapshotPoint(LocalDate.of(2024, 7, 1), 1100.0)
        );
        TwrChainer.TwrResult result = TwrChainer.compute(
                snapshots, List.of(), LocalDate.of(2024, 7, 1), 1100.0);

        assertThat(result).isNotNull();
        assertThat(result.twr()).isCloseTo(0.10, within(EPSILON));
    }

    @Test
    void compute_deuxSousPeriodes_chainageCorrect() {
        // P1 : 1000 → 1050 (HPR = 5 %, pas de cashflow)
        // Cashflow de 500 en début de P2 (date = début de P2)
        // P2 Modified Dietz : (1705 - 1050 - 500) / (1050 + 0.5*500) = 155/1300 ≈ 11.9 %
        // TWR = 1.05 × 1.1192 - 1 ≈ 17.5 %
        List<TwrChainer.SnapshotPoint> snapshots = List.of(
                new TwrChainer.SnapshotPoint(LocalDate.of(2024, 1, 1), 1000.0),
                new TwrChainer.SnapshotPoint(LocalDate.of(2024, 7, 1), 1050.0)
        );
        List<TwrChainer.ExternalCashflow> cashflows = List.of(
                new TwrChainer.ExternalCashflow(LocalDate.of(2024, 7, 1), 500.0)
        );
        TwrChainer.TwrResult result = TwrChainer.compute(
                snapshots, cashflows, LocalDate.of(2025, 1, 1), 1705.0);

        // HPR_1 = 0.05, HPR_2 = 155/1300 ≈ 0.1192 → chaîné ≈ 0.175
        assertThat(result).isNotNull();
        assertThat(result.twr()).isCloseTo(0.175, within(0.01));
    }

    @Test
    void compute_fluxInternesNIgnorentPasSousPeriode() {
        // Les dividendes (INTERNAL_GAIN) ne brisent pas les sous-périodes
        // Ils ne doivent pas figurer dans les ExternalCashflows → identique à compute sans flux
        List<TwrChainer.SnapshotPoint> snapshots = List.of(
                new TwrChainer.SnapshotPoint(LocalDate.of(2024, 1, 1), 1000.0),
                new TwrChainer.SnapshotPoint(LocalDate.of(2025, 1, 1), 1080.0)
        );
        // Aucun cashflow externe transmis
        TwrChainer.TwrResult result = TwrChainer.compute(
                snapshots, List.of(), LocalDate.of(2025, 1, 1), 1080.0);

        assertThat(result).isNotNull();
        assertThat(result.twr()).isCloseTo(0.08, within(EPSILON));
    }

    @Test
    void compute_retourneNull_siMoinsDeDeuxPoints() {
        // Un seul snapshot : impossible de calculer un rendement
        List<TwrChainer.SnapshotPoint> snapshots = List.of(
                new TwrChainer.SnapshotPoint(LocalDate.of(2024, 1, 1), 1000.0)
        );
        TwrChainer.TwrResult result = TwrChainer.compute(
                snapshots, List.of(), LocalDate.of(2024, 1, 1), 1000.0);

        assertThat(result).isNull();
    }

    @Test
    void compute_twrAnnualiseCorrect() {
        // +21 % sur 2 ans → annualisé ≈ 10 %
        List<TwrChainer.SnapshotPoint> snapshots = List.of(
                new TwrChainer.SnapshotPoint(LocalDate.of(2023, 1, 1), 1000.0),
                new TwrChainer.SnapshotPoint(LocalDate.of(2025, 1, 1), 1210.0)
        );
        TwrChainer.TwrResult result = TwrChainer.compute(
                snapshots, List.of(), LocalDate.of(2025, 1, 1), 1210.0);

        assertThat(result).isNotNull();
        assertThat(result.twrAnnualized()).isCloseTo(0.10, within(0.005));
    }

    @Test
    void compute_serieTemporelleContientLesPoints() {
        List<TwrChainer.SnapshotPoint> snapshots = List.of(
                new TwrChainer.SnapshotPoint(LocalDate.of(2024, 1, 1), 1000.0),
                new TwrChainer.SnapshotPoint(LocalDate.of(2024, 7, 1), 1050.0),
                new TwrChainer.SnapshotPoint(LocalDate.of(2025, 1, 1), 1102.5)
        );
        TwrChainer.TwrResult result = TwrChainer.compute(
                snapshots, List.of(), LocalDate.of(2025, 1, 1), 1102.5);

        assertThat(result).isNotNull();
        assertThat(result.timeSeries()).hasSize(2);
        assertThat(result.timeSeries().get(0).date()).isEqualTo(LocalDate.of(2024, 7, 1));
        assertThat(result.timeSeries().get(1).date()).isEqualTo(LocalDate.of(2025, 1, 1));
    }

    @Test
    void compute_positionVideIgnoreSousPeriode() {
        // Si V_begin = 0, la sous-période doit être ignorée sans planter
        List<TwrChainer.SnapshotPoint> snapshots = List.of(
                new TwrChainer.SnapshotPoint(LocalDate.of(2024, 1, 1), 0.0),
                new TwrChainer.SnapshotPoint(LocalDate.of(2024, 7, 1), 1050.0)
        );
        TwrChainer.TwrResult result = TwrChainer.compute(
                snapshots, List.of(), LocalDate.of(2024, 7, 1), 1050.0);

        // Ne doit pas lever d'exception
        assertThat(result).isNotNull();
    }
}
