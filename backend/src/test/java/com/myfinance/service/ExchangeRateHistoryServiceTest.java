package com.myfinance.service;

import com.myfinance.domain.ExchangeRateHistory;
import com.myfinance.repository.ExchangeRateHistoryRepository;
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
class ExchangeRateHistoryServiceTest {

    @Mock ExchangeRateHistoryRepository repo;
    @InjectMocks ExchangeRateHistoryService service;

    // ── getRateAt ──────────────────────────────────────────────────────────────

    @Test
    void getRateAt_eur_retourneToujours1() {
        // EUR est la devise de référence : toujours 1.0, aucune query DB.
        Optional<BigDecimal> result = service.getRateAt("EUR", LocalDate.of(2024, 6, 15));

        assertThat(result).isPresent();
        assertThat(result.get()).isEqualByComparingTo("1");
        verifyNoInteractions(repo);
    }

    @Test
    void getRateAt_tauxDisponible_retourneLeTaux() {
        LocalDate date = LocalDate.of(2024, 6, 15);
        ExchangeRateHistory entry = ExchangeRateHistory.builder()
                .currency("USD").rateDate(date).rate(new BigDecimal("1.08")).source("ECB")
                .build();

        when(repo.findTopByCurrencyAndRateDateLessThanEqualOrderByRateDateDesc("USD", date))
                .thenReturn(Optional.of(entry));

        Optional<BigDecimal> result = service.getRateAt("USD", date);

        assertThat(result).isPresent();
        assertThat(result.get()).isEqualByComparingTo("1.08");
    }

    @Test
    void getRateAt_aucunTauxAvantDate_retourneEmpty() {
        LocalDate date = LocalDate.of(2020, 1, 1);

        when(repo.findTopByCurrencyAndRateDateLessThanEqualOrderByRateDateDesc("GBP", date))
                .thenReturn(Optional.empty());

        Optional<BigDecimal> result = service.getRateAt("GBP", date);

        assertThat(result).isEmpty();
    }

    // ── saveRate (upsert idempotent) ───────────────────────────────────────────

    @Test
    void saveRate_nouvelleEntree_persiste() {
        LocalDate date = LocalDate.of(2024, 6, 15);

        when(repo.findByCurrencyAndRateDate("USD", date)).thenReturn(Optional.empty());
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.saveRate("USD", date, new BigDecimal("1.08"), "ECB");

        ArgumentCaptor<ExchangeRateHistory> captor = ArgumentCaptor.forClass(ExchangeRateHistory.class);
        verify(repo).save(captor.capture());
        assertThat(captor.getValue().getCurrency()).isEqualTo("USD");
        assertThat(captor.getValue().getRate()).isEqualByComparingTo("1.08");
        assertThat(captor.getValue().getSource()).isEqualTo("ECB");
    }

    @Test
    void saveRate_entreeExistante_miseAJour() {
        LocalDate date = LocalDate.of(2024, 6, 15);
        ExchangeRateHistory existing = ExchangeRateHistory.builder()
                .id(5L).currency("USD").rateDate(date).rate(new BigDecimal("1.07")).source("ECB")
                .build();

        when(repo.findByCurrencyAndRateDate("USD", date)).thenReturn(Optional.of(existing));
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.saveRate("USD", date, new BigDecimal("1.09"), "ECB");

        ArgumentCaptor<ExchangeRateHistory> captor = ArgumentCaptor.forClass(ExchangeRateHistory.class);
        verify(repo).save(captor.capture());
        assertThat(captor.getValue().getId()).isEqualTo(5L);
        assertThat(captor.getValue().getRate()).isEqualByComparingTo("1.09");
    }

    @Test
    void saveRate_eur_ignoreSansQuery() {
        // EUR ne doit jamais être persisté dans l'historique (taux = 1.0, implicite).
        service.saveRate("EUR", LocalDate.now(), BigDecimal.ONE, "ECB");

        verifyNoInteractions(repo);
    }

    // ── saveRatesBatch ─────────────────────────────────────────────────────────

    @Test
    void saveRatesBatch_persisteChaqueTaux() {
        LocalDate date = LocalDate.of(2024, 6, 15);
        Map<String, BigDecimal> rates = Map.of("USD", new BigDecimal("1.08"), "GBP", new BigDecimal("0.86"));

        when(repo.findByCurrencyAndRateDate(any(), eq(date))).thenReturn(Optional.empty());
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        int count = service.saveRatesBatch(rates, date, "ECB");

        assertThat(count).isEqualTo(2);
        verify(repo, times(2)).save(any());
    }

    // ── loadRateBatch ──────────────────────────────────────────────────────────

    @Test
    void loadRateBatch_construitMapParCle() {
        LocalDate d1 = LocalDate.of(2024, 1, 15);
        LocalDate d2 = LocalDate.of(2024, 2, 15);
        List<ExchangeRateHistory> entries = List.of(
                ExchangeRateHistory.builder().currency("USD").rateDate(d1).rate(new BigDecimal("1.08")).source("ECB").build(),
                ExchangeRateHistory.builder().currency("USD").rateDate(d2).rate(new BigDecimal("1.09")).source("ECB").build()
        );

        when(repo.findByCurrencyInAndRateDateBetween(List.of("USD"), d1, d2)).thenReturn(entries);

        Map<String, BigDecimal> result = service.loadRateBatch(List.of("USD"), d1, d2);

        assertThat(result).hasSize(2);
        assertThat(result.get(ExchangeRateHistoryService.batchKey("USD", d1))).isEqualByComparingTo("1.08");
        assertThat(result.get(ExchangeRateHistoryService.batchKey("USD", d2))).isEqualByComparingTo("1.09");
    }

    @Test
    void loadRateBatch_listeEurSeule_retourneMapVide() {
        // EUR ne génère pas de query.
        Map<String, BigDecimal> result = service.loadRateBatch(List.of("EUR"), LocalDate.now(), LocalDate.now());

        assertThat(result).isEmpty();
        verifyNoInteractions(repo);
    }

    // ── batchKey ───────────────────────────────────────────────────────────────

    @Test
    void batchKey_formatStable() {
        String key = ExchangeRateHistoryService.batchKey("USD", LocalDate.of(2024, 6, 15));
        assertThat(key).isEqualTo("USD|2024-06-15");
    }
}
