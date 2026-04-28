package com.myfinance.service;

import com.myfinance.config.PublicSectorParameters;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PointValueServiceTest {

    @Mock PublicSectorParameters params;
    @InjectMocks PointValueService pointValueService;

    private PublicSectorParameters.PointIndice pointIndice;

    @BeforeEach
    void setUp() {
        pointIndice = new PublicSectorParameters.PointIndice();
        pointIndice.setHistory(List.of(
                entry(LocalDate.of(2022, 7, 1), 58.2004),
                entry(LocalDate.of(2023, 7, 1), 59.0734),
                entry(LocalDate.of(2017, 2, 1), 56.2323)
        ));
        when(params.getPointIndice()).thenReturn(pointIndice);
    }

    @Test
    void getAnnualValueAt_retourneValeurExacte_pourDateEgale() {
        double value = pointValueService.getAnnualValueAt(LocalDate.of(2023, 7, 1));
        assertThat(value).isEqualTo(59.0734);
    }

    @Test
    void getAnnualValueAt_retourneDerniereValeurActive_pourDateIntermediaire() {
        // Entre 2022-07 et 2023-07, c'est la valeur de 2022 qui s'applique
        double value = pointValueService.getAnnualValueAt(LocalDate.of(2023, 1, 15));
        assertThat(value).isEqualTo(58.2004);
    }

    @Test
    void getAnnualValueAt_retourneValeurLaPlusRecente_pourDateAujourdhui() {
        double value = pointValueService.getAnnualValueAt(LocalDate.now());
        assertThat(value).isEqualTo(59.0734);
    }

    @Test
    void getAnnualValueAt_retournePlusAncienneValeur_pourDateAvantHistorique() {
        // Avant 2017-02-01 (la plus ancienne dans notre jeu de test)
        double value = pointValueService.getAnnualValueAt(LocalDate.of(2010, 1, 1));
        assertThat(value).isEqualTo(56.2323);
    }

    @Test
    void getAnnualValueAt_leveException_siHistoriqueVide() {
        PublicSectorParameters.PointIndice empty = new PublicSectorParameters.PointIndice();
        empty.setHistory(List.of());
        when(params.getPointIndice()).thenReturn(empty);

        assertThatThrownBy(() -> pointValueService.getAnnualValueAt(LocalDate.now()))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void computeAnnualGross_calculCorrect() {
        // IM 421 × 59,0734 = 24 869,90 €
        float result = pointValueService.computeAnnualGross(421, LocalDate.of(2024, 1, 1));
        assertThat(result).isCloseTo(24869.90f, within(1.0f));
    }

    @Test
    void computeAnnualGross_utiliseLaBonneValeurSelonLaDate() {
        // Date antérieure à 2023-07 → valeur 2022 (58,2004)
        float result = pointValueService.computeAnnualGross(421, LocalDate.of(2022, 9, 1));
        assertThat(result).isCloseTo(421 * 58.2004f, within(1.0f));
    }

    // ── Helper ─────────────────────────────────────────────────

    private PublicSectorParameters.PointValueEntry entry(LocalDate date, double value) {
        PublicSectorParameters.PointValueEntry e = new PublicSectorParameters.PointValueEntry();
        e.setEffectiveDate(date);
        e.setAnnualValue(value);
        return e;
    }
}
