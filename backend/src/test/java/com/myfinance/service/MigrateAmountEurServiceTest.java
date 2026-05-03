package com.myfinance.service;

import com.myfinance.domain.Position;
import com.myfinance.domain.PositionOrder;
import com.myfinance.dto.MigrateAmountEurReport;
import com.myfinance.repository.ExchangeRateRepository;
import com.myfinance.repository.PositionOrderRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MigrateAmountEurServiceTest {

    @Mock PositionOrderRepository orderRepository;
    @Mock ExchangeRateHistoryService rateHistoryService;
    @Mock ExchangeRateRepository exchangeRateRepository;
    @InjectMocks MigrateAmountEurService service;

    private PositionOrder orderUsd(Long id, String amount, String amountEur) {
        Position pos = new Position();
        pos.setId(id);
        pos.setCurrency("USD");

        PositionOrder order = new PositionOrder();
        order.setId(id);
        order.setPosition(pos);
        order.setAmount(new BigDecimal(amount));
        order.setAmountEur(new BigDecimal(amountEur));
        order.setOrderDate(LocalDate.of(2024, 6, 15));
        return order;
    }

    // ── dry-run ────────────────────────────────────────────────────────────────

    @Test
    void migrate_dryRun_nePersistePas() {
        PositionOrder order = orderUsd(1L, "1000", "1000"); // amountEur incorrect (= amount natif)
        when(orderRepository.findAllNonEurOrders()).thenReturn(List.of(order));
        when(rateHistoryService.getRateAt("USD", order.getOrderDate()))
                .thenReturn(Optional.of(new BigDecimal("1.08")));

        MigrateAmountEurReport report = service.migrate(true);

        assertThat(report.dryRun()).isTrue();
        assertThat(report.ordersExamined()).isEqualTo(1);
        assertThat(report.ordersToUpdate()).isEqualTo(1);
        assertThat(report.ordersUpdated()).isEqualTo(0);
        verify(orderRepository, never()).save(any());
    }

    // ── run réel ───────────────────────────────────────────────────────────────

    @Test
    void migrate_runReel_corrigeAmountEur() {
        // 1000 USD / 1.08 = 925.9259 → arrondi à 4 décimales = 925.9259
        PositionOrder order = orderUsd(1L, "1000", "1000");
        when(orderRepository.findAllNonEurOrders()).thenReturn(List.of(order));
        when(rateHistoryService.getRateAt("USD", order.getOrderDate()))
                .thenReturn(Optional.of(new BigDecimal("1.08")));
        when(orderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        MigrateAmountEurReport report = service.migrate(false);

        assertThat(report.dryRun()).isFalse();
        assertThat(report.ordersUpdated()).isEqualTo(1);
        assertThat(report.fallbacksCurrentRate()).isEqualTo(0);
        verify(orderRepository).save(argThat(o ->
                ((PositionOrder) o).getAmountEur().compareTo(new BigDecimal("925.9259")) == 0
        ));
    }

    @Test
    void migrate_ordreDejaCorrect_pasDeModification() {
        // amountEur déjà correct : 1000 / 1.08 = 925.9259
        PositionOrder order = orderUsd(1L, "1000", "925.9259");
        when(orderRepository.findAllNonEurOrders()).thenReturn(List.of(order));
        when(rateHistoryService.getRateAt("USD", order.getOrderDate()))
                .thenReturn(Optional.of(new BigDecimal("1.08")));

        MigrateAmountEurReport report = service.migrate(false);

        assertThat(report.ordersToUpdate()).isEqualTo(0);
        assertThat(report.ordersUpdated()).isEqualTo(0);
        verify(orderRepository, never()).save(any());
    }

    @Test
    void migrate_sansTauxHistorique_fallbackTauxCourant() {
        PositionOrder order = orderUsd(1L, "1000", "1000");
        when(orderRepository.findAllNonEurOrders()).thenReturn(List.of(order));
        when(rateHistoryService.getRateAt("USD", order.getOrderDate()))
                .thenReturn(Optional.empty());

        com.myfinance.domain.ExchangeRate currentRate = new com.myfinance.domain.ExchangeRate();
        currentRate.setCurrency("USD");
        currentRate.setRate(new BigDecimal("1.10"));
        when(exchangeRateRepository.findByCurrency("USD")).thenReturn(Optional.of(currentRate));
        when(orderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        MigrateAmountEurReport report = service.migrate(false);

        assertThat(report.fallbacksCurrentRate()).isEqualTo(1);
        assertThat(report.ordersUpdated()).isEqualTo(1);
    }

    @Test
    void migrate_aucunOrdreNonEur_rapportVide() {
        when(orderRepository.findAllNonEurOrders()).thenReturn(List.of());

        MigrateAmountEurReport report = service.migrate(false);

        assertThat(report.ordersExamined()).isEqualTo(0);
        assertThat(report.ordersToUpdate()).isEqualTo(0);
        assertThat(report.ordersUpdated()).isEqualTo(0);
        verify(orderRepository, never()).save(any());
    }

    @Test
    void migrate_samplesLimitesDixEntrees() {
        // 15 ordres incorrects → max 10 samples dans le rapport
        List<PositionOrder> orders = new java.util.ArrayList<>();
        for (long i = 1; i <= 15; i++) {
            orders.add(orderUsd(i, "1000", "1000"));
        }
        when(orderRepository.findAllNonEurOrders()).thenReturn(orders);
        when(rateHistoryService.getRateAt(eq("USD"), any()))
                .thenReturn(Optional.of(new BigDecimal("1.08")));

        MigrateAmountEurReport report = service.migrate(true);

        assertThat(report.ordersToUpdate()).isEqualTo(15);
        assertThat(report.samples()).hasSize(10);
    }
}
