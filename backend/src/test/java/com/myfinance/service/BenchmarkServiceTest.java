package com.myfinance.service;

import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.Instrument;
import com.myfinance.dto.BenchmarkDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BenchmarkServiceTest {

    @Mock InstrumentPriceHistoryService priceHistoryService;
    @InjectMocks BenchmarkService service;

    Instrument cw8;

    @BeforeEach
    void setUp() {
        cw8 = new Instrument();
        cw8.setId(1L);
        cw8.setName("Amundi MSCI World");
        cw8.setTicker("CW8");
        cw8.setCurrency("EUR");
        cw8.setCategory(AssetCategory.BOURSE);
    }

    // ── Cas : aucun prix disponible ───────────────────────────────────────────

    @Test
    void aucunPrix_retourneSerieVide() {
        when(priceHistoryService.loadPriceBatch(any(), any(), any())).thenReturn(Map.of());

        BenchmarkDto dto = service.compute(cw8, LocalDate.of(2024, 1, 1), null);

        assertThat(dto.twrAnnualized()).isNull();
        assertThat(dto.series()).isEmpty();
    }

    // ── Cas : from null → retourne résultat vide ──────────────────────────────

    @Test
    void fromNull_retourneVide() {
        BenchmarkDto dto = service.compute(cw8, null, null);

        assertThat(dto.twrAnnualized()).isNull();
        assertThat(dto.series()).isEmpty();
    }

    // ── Cas nominal : hausse de 10 % sur 1 mois ──────────────────────────────
    //
    // Hypothèse : prix au 31/12/2023 = 100, prix au 31/01/2024 = 110
    // R_jan = 110/100 - 1 = 0.10
    // TWR total = 0.10
    // TWR annualisé ≈ (1.10)^(365/31) - 1 ≈ 2.12 — mais on teste surtout la direction

    @Test
    void unMoisHausse10pct_twrPositif() {
        // clé format : "instrumentId|YYYY-MM-DD"
        Map<String, BigDecimal> prices = Map.of(
                "1|2023-12-31", new BigDecimal("100"),
                "1|2024-01-31", new BigDecimal("110")
        );
        when(priceHistoryService.loadPriceBatch(any(), any(), any())).thenReturn(prices);

        BenchmarkDto dto = service.compute(cw8, LocalDate.of(2024, 1, 1), LocalDate.of(2024, 1, 31));

        assertThat(dto.twrAnnualized()).isNotNull();
        assertThat(dto.twrAnnualized()).isGreaterThan(0);
        // La série doit contenir le point d'ouverture + 1 mois = 2 points
        assertThat(dto.series()).hasSize(2);
        // Dernier point ≈ 110.0 (base 100 × 1.10)
        assertThat(dto.series().get(1).value()).isCloseTo(110.0, within(0.01));
    }

    // ── Cas : deux mois à +5 % chacun — TWR = (1.05)² - 1 ≈ 10.25 % ─────────

    @Test
    void deuxMoisCinqPct_twrChaine() {
        Map<String, BigDecimal> prices = Map.of(
                "1|2023-12-31", new BigDecimal("100"),
                "1|2024-01-31", new BigDecimal("105"),
                "1|2024-02-29", new BigDecimal("110.25")
        );
        when(priceHistoryService.loadPriceBatch(any(), any(), any())).thenReturn(prices);

        BenchmarkDto dto = service.compute(cw8,
                LocalDate.of(2024, 1, 1),
                LocalDate.of(2024, 2, 29));

        // TWR total = (1.05 × 1.05) - 1 = 10.25 %
        // Série : ouverture + jan + fév = 3 points
        assertThat(dto.series()).hasSize(3);
        assertThat(dto.series().get(2).value()).isCloseTo(110.25, within(0.01));
        assertThat(dto.twrAnnualized()).isNotNull();
    }

    // ── Label ────────────────────────────────────────────────────────────────

    @Test
    void label_contientNomEtTicker() {
        when(priceHistoryService.loadPriceBatch(any(), any(), any())).thenReturn(Map.of(
                "1|2023-12-31", new BigDecimal("100"),
                "1|2024-01-31", new BigDecimal("100")
        ));

        BenchmarkDto dto = service.compute(cw8, LocalDate.of(2024, 1, 1), LocalDate.of(2024, 1, 31));

        assertThat(dto.label()).contains("Amundi MSCI World");
        assertThat(dto.label()).contains("CW8");
        assertThat(dto.instrumentId()).isEqualTo(1L);
        assertThat(dto.currency()).isEqualTo("EUR");
    }
}
