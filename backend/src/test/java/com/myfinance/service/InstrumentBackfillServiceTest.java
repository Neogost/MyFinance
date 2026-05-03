package com.myfinance.service;

import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.Instrument;
import com.myfinance.dto.BackfillReport;
import com.myfinance.repository.InstrumentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InstrumentBackfillServiceTest {

    @Mock InstrumentRepository instrumentRepository;
    @Mock InstrumentPriceHistoryService priceHistoryService;
    @Mock CoinGeckoClient coinGeckoClient;
    @InjectMocks InstrumentBackfillService service;

    private Instrument crypto(Long id, String coinGeckoId) {
        Instrument i = new Instrument();
        i.setId(id);
        i.setName("Bitcoin");
        i.setCategory(AssetCategory.CRYPTO);
        i.setCurrency("USD");
        i.setCoinGeckoId(coinGeckoId);
        return i;
    }

    private Instrument bourse(Long id) {
        Instrument i = new Instrument();
        i.setId(id);
        i.setName("Amundi MSCI World");
        i.setCategory(AssetCategory.BOURSE);
        i.setCurrency("EUR");
        return i;
    }

    // ── backfillCrypto ────────────────────────────────────────────────────────

    @Test
    void backfillCrypto_succes() {
        Instrument inst = crypto(1L, "bitcoin");
        Map<LocalDate, BigDecimal> history = new TreeMap<>(Map.of(
                LocalDate.of(2024, 1, 1), new BigDecimal("42000"),
                LocalDate.of(2024, 1, 2), new BigDecimal("43000")
        ));
        when(instrumentRepository.findById(1L)).thenReturn(Optional.of(inst));
        when(coinGeckoClient.getMarketChart("bitcoin")).thenReturn(history);
        when(priceHistoryService.countDays(inst)).thenReturn(0L, 2L);

        BackfillReport report = service.backfillCrypto(1L);

        assertThat(report.scope()).isEqualTo(BackfillReport.Scope.INSTRUMENT_PRICES);
        assertThat(report.linesInserted()).isEqualTo(2);
        assertThat(report.linesUpdated()).isEqualTo(0);
        assertThat(report.fromDate()).isEqualTo(LocalDate.of(2024, 1, 1));
        assertThat(report.toDate()).isEqualTo(LocalDate.of(2024, 1, 2));
        verify(priceHistoryService, times(2)).savePrice(any(), any(), any(), eq("COINGECKO"));
    }

    @Test
    void backfillCrypto_instrumentNonCrypto_leve400() {
        Instrument inst = bourse(2L);
        when(instrumentRepository.findById(2L)).thenReturn(Optional.of(inst));

        assertThatThrownBy(() -> service.backfillCrypto(2L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("CRYPTO");
    }

    @Test
    void backfillCrypto_sansCoinGeckoId_leve400() {
        Instrument inst = crypto(3L, null);
        when(instrumentRepository.findById(3L)).thenReturn(Optional.of(inst));

        assertThatThrownBy(() -> service.backfillCrypto(3L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("coinGeckoId");
    }

    @Test
    void backfillCrypto_instrumentInexistant_leve404() {
        when(instrumentRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.backfillCrypto(99L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("introuvable");
    }

    @Test
    void backfillCrypto_coinGeckoVide_rapportAvecErreur() {
        Instrument inst = crypto(1L, "bitcoin");
        when(instrumentRepository.findById(1L)).thenReturn(Optional.of(inst));
        when(coinGeckoClient.getMarketChart("bitcoin")).thenReturn(Map.of());

        BackfillReport report = service.backfillCrypto(1L);

        assertThat(report.linesInserted()).isEqualTo(0);
        assertThat(report.errors()).hasSize(1);
        assertThat(report.errors().get(0)).contains("CoinGecko");
        verify(priceHistoryService, never()).savePrice(any(), any(), any(), any());
    }

    // ── importCsv ─────────────────────────────────────────────────────────────

    @Test
    void importCsv_succes() {
        Instrument inst = bourse(1L);
        when(instrumentRepository.findById(1L)).thenReturn(Optional.of(inst));
        when(priceHistoryService.countDays(inst)).thenReturn(0L, 2L);

        // CSV avec header + 1 commentaire + 2 lignes data — linesSkipped doit être 0
        // (le header et les commentaires ne sont pas des skips)
        String csv = "# Instrument: Test\ndate;price\n2024-01-02;432,15\n2024-01-03;433,20\n";
        MockMultipartFile file = new MockMultipartFile("file", "test.csv", "text/csv", csv.getBytes());

        BackfillReport report = service.importCsv(1L, file);

        assertThat(report.linesInserted()).isEqualTo(2);
        assertThat(report.linesSkipped()).isEqualTo(0);
        assertThat(report.errors()).isEmpty();
        verify(priceHistoryService, times(2)).savePrice(any(), any(), any(), eq("MANUAL_CSV"));
    }

    @Test
    void importCsv_instrumentNonBourse_leve400() {
        Instrument inst = crypto(1L, "bitcoin");
        when(instrumentRepository.findById(1L)).thenReturn(Optional.of(inst));

        MockMultipartFile file = new MockMultipartFile("file", "test.csv", "text/csv", "date;price\n2024-01-02;100\n".getBytes());

        assertThatThrownBy(() -> service.importCsv(1L, file))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("BOURSE");
    }

    @Test
    void importCsv_fichierVide_leve400() {
        Instrument inst = bourse(1L);
        when(instrumentRepository.findById(1L)).thenReturn(Optional.of(inst));

        MockMultipartFile file = new MockMultipartFile("file", "vide.csv", "text/csv", new byte[0]);

        assertThatThrownBy(() -> service.importCsv(1L, file))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("vide");
    }

    @Test
    void importCsv_avecLignesInvalides_rapportContientErreurs() {
        Instrument inst = bourse(1L);
        when(instrumentRepository.findById(1L)).thenReturn(Optional.of(inst));
        when(priceHistoryService.countDays(inst)).thenReturn(0L, 1L);

        String csv = "date;price\n2024-01-02;432,15\npasUneDate;100\n";
        MockMultipartFile file = new MockMultipartFile("file", "test.csv", "text/csv", csv.getBytes());

        BackfillReport report = service.importCsv(1L, file);

        assertThat(report.linesInserted()).isEqualTo(1);
        assertThat(report.errors()).isNotEmpty();
        assertThat(report.errors().get(0)).contains("date invalide");
    }
}
