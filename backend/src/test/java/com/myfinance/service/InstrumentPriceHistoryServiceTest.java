package com.myfinance.service;

import com.myfinance.domain.Instrument;
import com.myfinance.domain.InstrumentPriceHistory;
import com.myfinance.repository.InstrumentPriceHistoryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InstrumentPriceHistoryServiceTest {

    @Mock InstrumentPriceHistoryRepository repo;
    @InjectMocks InstrumentPriceHistoryService service;

    private Instrument instrument(Long id) {
        Instrument inst = new Instrument();
        inst.setId(id);
        return inst;
    }

    // ── getPriceAt ─────────────────────────────────────────────────────────────

    @Test
    void getPriceAt_prixDisponible_retourneLePrix() {
        Instrument inst = instrument(1L);
        LocalDate date = LocalDate.of(2024, 6, 15);
        InstrumentPriceHistory entry = InstrumentPriceHistory.builder()
                .instrument(inst).priceDate(date).price(new BigDecimal("432.15")).source("BOURSORAMA")
                .build();

        when(repo.findTopByInstrumentAndPriceDateLessThanEqualOrderByPriceDateDesc(inst, date))
                .thenReturn(Optional.of(entry));

        Optional<BigDecimal> result = service.getPriceAt(inst, date);

        assertThat(result).isPresent();
        assertThat(result.get()).isEqualByComparingTo("432.15");
    }

    @Test
    void getPriceAt_aucunPrixAvantDate_retourneEmpty() {
        // Interdit d'extrapoler dans le passé : si aucun prix n'est connu avant la date demandée,
        // on retourne empty (cf. spec performance §3.1).
        Instrument inst = instrument(2L);
        LocalDate date = LocalDate.of(2020, 1, 1);

        when(repo.findTopByInstrumentAndPriceDateLessThanEqualOrderByPriceDateDesc(inst, date))
                .thenReturn(Optional.empty());

        Optional<BigDecimal> result = service.getPriceAt(inst, date);

        assertThat(result).isEmpty();
    }

    @Test
    void getPriceAt_utiliseDernierPrixAvantDate_pasCeluidApres() {
        // Vérifie que le fallback prend bien le DERNIER prix antérieur, pas un futur.
        Instrument inst = instrument(3L);
        LocalDate demandee = LocalDate.of(2024, 6, 15);
        LocalDate disponible = LocalDate.of(2024, 6, 10);
        InstrumentPriceHistory entry = InstrumentPriceHistory.builder()
                .instrument(inst).priceDate(disponible).price(new BigDecimal("430.00")).source("BOURSORAMA")
                .build();

        when(repo.findTopByInstrumentAndPriceDateLessThanEqualOrderByPriceDateDesc(inst, demandee))
                .thenReturn(Optional.of(entry));

        Optional<BigDecimal> result = service.getPriceAt(inst, demandee);

        assertThat(result).isPresent();
        assertThat(result.get()).isEqualByComparingTo("430.00");
    }

    // ── savePrice (upsert idempotent) ──────────────────────────────────────────

    @Test
    void savePrice_nouvelleEntree_persiste() {
        Instrument inst = instrument(1L);
        LocalDate date = LocalDate.of(2024, 6, 15);

        when(repo.findByInstrumentAndPriceDate(inst, date)).thenReturn(Optional.empty());
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.savePrice(inst, date, new BigDecimal("432.15"), "BOURSORAMA");

        ArgumentCaptor<InstrumentPriceHistory> captor = ArgumentCaptor.forClass(InstrumentPriceHistory.class);
        verify(repo).save(captor.capture());
        assertThat(captor.getValue().getPrice()).isEqualByComparingTo("432.15");
        assertThat(captor.getValue().getSource()).isEqualTo("BOURSORAMA");
        assertThat(captor.getValue().getPriceDate()).isEqualTo(date);
    }

    @Test
    void savePrice_entreeExistante_miseAJour() {
        // Idempotence : si une entrée existe déjà, elle est mise à jour (pas de doublon).
        Instrument inst = instrument(1L);
        LocalDate date = LocalDate.of(2024, 6, 15);
        InstrumentPriceHistory existing = InstrumentPriceHistory.builder()
                .id(42L).instrument(inst).priceDate(date).price(new BigDecimal("430.00")).source("BOURSORAMA")
                .build();

        when(repo.findByInstrumentAndPriceDate(inst, date)).thenReturn(Optional.of(existing));
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.savePrice(inst, date, new BigDecimal("435.00"), "BOURSORAMA");

        ArgumentCaptor<InstrumentPriceHistory> captor = ArgumentCaptor.forClass(InstrumentPriceHistory.class);
        verify(repo).save(captor.capture());
        assertThat(captor.getValue().getId()).isEqualTo(42L);
        assertThat(captor.getValue().getPrice()).isEqualByComparingTo("435.00");
    }

    // ── loadPriceBatch ─────────────────────────────────────────────────────────

    @Test
    void loadPriceBatch_construitMapParCle() {
        Instrument inst = instrument(10L);
        LocalDate d1 = LocalDate.of(2024, 1, 15);
        LocalDate d2 = LocalDate.of(2024, 2, 15);
        List<InstrumentPriceHistory> entries = List.of(
                InstrumentPriceHistory.builder().instrument(inst).priceDate(d1).price(new BigDecimal("100")).source("BOURSORAMA").build(),
                InstrumentPriceHistory.builder().instrument(inst).priceDate(d2).price(new BigDecimal("110")).source("BOURSORAMA").build()
        );

        when(repo.findByInstrumentInAndPriceDateBetween(List.of(inst), d1, d2)).thenReturn(entries);

        Map<String, BigDecimal> result = service.loadPriceBatch(List.of(inst), d1, d2);

        assertThat(result).hasSize(2);
        assertThat(result.get(InstrumentPriceHistoryService.batchKey(10L, d1))).isEqualByComparingTo("100");
        assertThat(result.get(InstrumentPriceHistoryService.batchKey(10L, d2))).isEqualByComparingTo("110");
    }

    // ── batchKey ───────────────────────────────────────────────────────────────

    @Test
    void batchKey_formatStable() {
        String key = InstrumentPriceHistoryService.batchKey(42L, LocalDate.of(2024, 6, 15));
        assertThat(key).isEqualTo("42|2024-06-15");
    }
}
