package com.myfinance.service;

import com.myfinance.dto.BackfillReport;
import com.myfinance.repository.ExchangeRateHistoryRepository;
import com.myfinance.repository.PositionOrderRepository;
import com.myfinance.repository.PositionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExchangeRateBackfillServiceTest {

    @Mock ExchangeRateHistoryRepository rateHistoryRepository;
    @Mock ExchangeRateHistoryService rateHistoryService;
    @Mock EcbRateClient ecbRateClient;
    @Mock PositionRepository positionRepository;
    @Mock PositionOrderRepository orderRepository;
    @InjectMocks ExchangeRateBackfillService service;

    @Test
    void backfill_succesAvecHistoriqueExplicite() {
        LocalDate from = LocalDate.of(2024, 1, 1);
        LocalDate to   = LocalDate.of(2024, 1, 5);
        Map<LocalDate, BigDecimal> history = new TreeMap<>(Map.of(
                LocalDate.of(2024, 1, 2), new BigDecimal("1.08"),
                LocalDate.of(2024, 1, 3), new BigDecimal("1.09")
        ));

        when(ecbRateClient.getRatesHistory("USD", from, to)).thenReturn(history);
        when(rateHistoryRepository.findByCurrencyInAndRateDateBetween(eq(List.of("USD")), eq(from), eq(to)))
                .thenReturn(List.of()) // avant
                .thenReturn(List.of(mock(com.myfinance.domain.ExchangeRateHistory.class),
                                    mock(com.myfinance.domain.ExchangeRateHistory.class))); // après

        BackfillReport report = service.backfill("USD", from, to);

        assertThat(report.scope()).isEqualTo(BackfillReport.Scope.EXCHANGE_RATES);
        assertThat(report.targetId()).isEqualTo("USD");
        assertThat(report.linesInserted()).isEqualTo(2);
        verify(rateHistoryService, times(2)).saveRate(eq("USD"), any(), any(), eq("FRANKFURTER"));
    }

    @Test
    void backfill_eur_leve400() {
        assertThatThrownBy(() -> service.backfill("EUR", null, null))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("EUR");
    }

    @Test
    void backfill_currencyMinuscule_normalisee() {
        when(positionRepository.findAll()).thenReturn(List.of());
        when(ecbRateClient.getRatesHistory(eq("USD"), any(), any())).thenReturn(Map.of());

        BackfillReport report = service.backfill("usd", null, null);

        assertThat(report.targetId()).isEqualTo("USD");
    }

    @Test
    void backfill_fromApresTo_leve400() {
        LocalDate from = LocalDate.of(2024, 6, 1);
        LocalDate to   = LocalDate.of(2024, 1, 1);

        assertThatThrownBy(() -> service.backfill("USD", from, to))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("from");
    }

    @Test
    void backfill_frankfurterVide_rapportAvecErreur() {
        LocalDate from = LocalDate.of(2024, 1, 1);
        LocalDate to   = LocalDate.of(2024, 1, 5);

        when(ecbRateClient.getRatesHistory("USD", from, to)).thenReturn(Map.of());

        BackfillReport report = service.backfill("USD", from, to);

        assertThat(report.linesInserted()).isEqualTo(0);
        assertThat(report.errors()).hasSize(1);
        assertThat(report.errors().get(0)).contains("Frankfurter");
        verify(rateHistoryService, never()).saveRate(any(), any(), any(), any());
    }
}
