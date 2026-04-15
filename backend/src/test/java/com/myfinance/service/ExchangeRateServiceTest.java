package com.myfinance.service;

import com.myfinance.domain.ExchangeRate;
import com.myfinance.dto.ExchangeRateDto;
import com.myfinance.dto.UpdateExchangeRateRequest;
import com.myfinance.repository.ExchangeRateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExchangeRateServiceTest {

    @Mock ExchangeRateRepository exchangeRateRepository;
    @InjectMocks ExchangeRateService exchangeRateService;

    ExchangeRate usd;
    ExchangeRate gbp;

    @BeforeEach
    void setUp() {
        usd = ExchangeRate.builder()
                .id(1L).currency("USD").rate(new BigDecimal("1.08"))
                .lastUpdatedAt(LocalDateTime.of(2026, 4, 10, 12, 0))
                .build();

        gbp = ExchangeRate.builder()
                .id(2L).currency("GBP").rate(new BigDecimal("0.86"))
                .lastUpdatedAt(LocalDateTime.of(2026, 4, 10, 12, 0))
                .build();
    }

    // ── findAll ────────────────────────────────────────────────

    @Test
    void findAll_retourneTousLesTauxTriesParDevise() {
        when(exchangeRateRepository.findAllByOrderByCurrencyAsc()).thenReturn(List.of(gbp, usd));

        List<ExchangeRateDto> result = exchangeRateService.findAll();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).currency()).isEqualTo("GBP");
        assertThat(result.get(1).currency()).isEqualTo("USD");
    }

    @Test
    void findAll_aucunTaux_retourneListeVide() {
        when(exchangeRateRepository.findAllByOrderByCurrencyAsc()).thenReturn(List.of());

        List<ExchangeRateDto> result = exchangeRateService.findAll();

        assertThat(result).isEmpty();
    }

    // ── getRatesAsMap ──────────────────────────────────────────

    @Test
    void getRatesAsMap_retourneMapDeviseTaux() {
        when(exchangeRateRepository.findAll()).thenReturn(List.of(usd, gbp));

        Map<String, BigDecimal> result = exchangeRateService.getRatesAsMap();

        assertThat(result).hasSize(2);
        assertThat(result.get("USD")).isEqualByComparingTo(new BigDecimal("1.08"));
        assertThat(result.get("GBP")).isEqualByComparingTo(new BigDecimal("0.86"));
    }

    @Test
    void getRatesAsMap_aucunTaux_retourneMapVide() {
        when(exchangeRateRepository.findAll()).thenReturn(List.of());

        Map<String, BigDecimal> result = exchangeRateService.getRatesAsMap();

        assertThat(result).isEmpty();
    }

    // ── updateRates — mise à jour d'un taux existant ───────────

    @Test
    void updateRates_deviseExistante_metAJourLeTaux() {
        UpdateExchangeRateRequest req = new UpdateExchangeRateRequest("USD", new BigDecimal("1.10"));

        when(exchangeRateRepository.findByCurrency("USD")).thenReturn(Optional.of(usd));
        when(exchangeRateRepository.save(any(ExchangeRate.class))).thenAnswer(inv -> inv.getArgument(0));

        List<ExchangeRateDto> result = exchangeRateService.updateRates(List.of(req));

        assertThat(result).hasSize(1);
        assertThat(result.get(0).currency()).isEqualTo("USD");
        assertThat(result.get(0).rate()).isEqualByComparingTo(new BigDecimal("1.10"));
        assertThat(result.get(0).lastUpdatedAt()).isNotNull();
        verify(exchangeRateRepository).save(usd);
    }

    @Test
    void updateRates_nouvelleDevise_creeUnNouveauTaux() {
        UpdateExchangeRateRequest req = new UpdateExchangeRateRequest("CHF", new BigDecimal("0.95"));

        when(exchangeRateRepository.findByCurrency("CHF")).thenReturn(Optional.empty());
        when(exchangeRateRepository.save(any(ExchangeRate.class))).thenAnswer(inv -> {
            ExchangeRate saved = inv.getArgument(0);
            saved.setId(3L);
            return saved;
        });

        List<ExchangeRateDto> result = exchangeRateService.updateRates(List.of(req));

        assertThat(result).hasSize(1);
        assertThat(result.get(0).currency()).isEqualTo("CHF");
        assertThat(result.get(0).rate()).isEqualByComparingTo(new BigDecimal("0.95"));
        verify(exchangeRateRepository).save(any(ExchangeRate.class));
    }

    @Test
    void updateRates_plusieursDevises_metAJourToutes() {
        UpdateExchangeRateRequest req1 = new UpdateExchangeRateRequest("USD", new BigDecimal("1.10"));
        UpdateExchangeRateRequest req2 = new UpdateExchangeRateRequest("GBP", new BigDecimal("0.88"));

        when(exchangeRateRepository.findByCurrency("USD")).thenReturn(Optional.of(usd));
        when(exchangeRateRepository.findByCurrency("GBP")).thenReturn(Optional.of(gbp));
        when(exchangeRateRepository.save(any(ExchangeRate.class))).thenAnswer(inv -> inv.getArgument(0));

        List<ExchangeRateDto> result = exchangeRateService.updateRates(List.of(req1, req2));

        assertThat(result).hasSize(2);
        verify(exchangeRateRepository, times(2)).save(any(ExchangeRate.class));
    }
}
