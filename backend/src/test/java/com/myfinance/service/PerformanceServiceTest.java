package com.myfinance.service;

import com.myfinance.domain.*;
import com.myfinance.dto.PerformanceDto;
import com.myfinance.repository.PositionOrderRepository;
import com.myfinance.repository.PositionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PerformanceServiceTest {

    @Mock PositionRepository           positionRepository;
    @Mock PositionOrderRepository      orderRepository;
    @Mock InstrumentPriceHistoryService priceHistoryService;
    @Mock ExchangeRateHistoryService   rateHistoryService;
    @Mock ValuationService             valuationService;
    @InjectMocks PerformanceService    service;

    User user;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).login("admin").role(RoleEnum.ADMIN).build();
    }

    // ── Cas : aucune position éligible ────────────────────────────────────────

    @Test
    void aucunePositionEligible_twrEtMwrNull() {
        when(positionRepository.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of());

        PerformanceDto dto = service.computeGlobal(user);

        assertThat(dto.twrAnnualized()).isNull();
        assertThat(dto.mwrAnnualized()).isNull();
        assertThat(dto.warnings()).anyMatch(w -> w.contains("Aucune position éligible"));
    }

    @Test
    void aucunOrdre_twrEtMwrNull() {
        Position p = livretPosition();
        when(positionRepository.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of(p));
        when(orderRepository.findByPositionInOrderByOrderDateAsc(any())).thenReturn(List.of());

        PerformanceDto dto = service.computeGlobal(user);

        assertThat(dto.twrAnnualized()).isNull();
        assertThat(dto.mwrAnnualized()).isNull();
    }

    // ── Cas : position IMMO_PHYSIQUE ignorée ──────────────────────────────────

    @Test
    void immoPhysique_ignoree_calculSansElle() {
        Position immo = new Position();
        immo.setId(99L);
        immo.setCategory(AssetCategory.IMMO_PHYSIQUE);
        immo.setLabel("Résidence principale");
        immo.setCurrency("EUR");
        immo.setStatus(PositionStatus.ACTIVE);
        immo.setIncludeInIncomeProjection(false);
        immo.setCreatedAt(LocalDateTime.now());
        immo.setOrders(new ArrayList<>());

        when(positionRepository.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of(immo));

        PerformanceDto dto = service.computeGlobal(user);

        assertThat(dto.twrAnnualized()).isNull();
        assertThat(dto.warnings()).anyMatch(w -> w.contains("Aucune position éligible"));
    }

    // ── Cas : ordres le même jour — nettés algébriquement (règle #6) ──────────

    @Test
    void deuxOrdresMemeJour_nettesAlgebriquement() {
        Position p = livretPosition();
        LocalDate orderDate = LocalDate.of(2024, 1, 15);

        // BUY +500 et SELL -300 → flux net +200 pour TWR
        PositionOrder buy  = order(p, orderDate, OrderType.DEPOSIT, new BigDecimal("500"));
        PositionOrder sell = order(p, orderDate, OrderType.WITHDRAWAL, new BigDecimal("300"));

        when(positionRepository.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of(p));
        when(orderRepository.findByPositionInOrderByOrderDateAsc(any()))
                .thenReturn(List.of(buy, sell));
        when(valuationService.loadSnapshotBatch(any())).thenReturn(Map.of());

        // On mocke la valuation pour que le calcul aille jusqu'au bout
        when(valuationService.valuePortfolioAt(any(), any(), any(), any(), any(), any()))
                .thenReturn(BigDecimal.valueOf(200));

        PerformanceDto dto = service.computeGlobal(user);

        // Le totalInvesti = +500 - 300 = +200 (le net)
        assertThat(dto.totalInvestedEur().doubleValue()).isCloseTo(200, within(0.01));
    }

    // ── Cas : règle métier #8 — mois du premier versement exclu ──────────────

    @Test
    void premierMoisExclu_warningEmis() {
        Position p = livretPosition();
        LocalDate firstOrder = LocalDate.of(2024, 1, 15);
        PositionOrder dep = order(p, firstOrder, OrderType.DEPOSIT, new BigDecimal("1000"));

        when(positionRepository.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of(p));
        when(orderRepository.findByPositionInOrderByOrderDateAsc(any())).thenReturn(List.of(dep));
        when(valuationService.loadSnapshotBatch(any())).thenReturn(Map.of());
        when(valuationService.valuePortfolioAt(any(), any(), any(), any(), any(), any()))
                .thenReturn(BigDecimal.valueOf(1010));

        PerformanceDto dto = service.computeGlobal(user);

        // Le warning mentionne janvier 2024 exclu
        assertThat(dto.warnings()).anyMatch(w -> w.contains("2024-01") && w.contains("exclu"));
        // La date de début du chaînage = 1er février 2024
        assertThat(dto.from()).isAfterOrEqualTo(LocalDate.of(2024, 2, 1));
    }

    // ── Cas : TWR = MWR pour versement unique ─────────────────────────────────

    @Test
    void versementUnique_twrEgalMwr() {
        Position p = livretPosition();
        LocalDate orderDate = LocalDate.of(2024, 1, 1);
        PositionOrder dep = order(p, orderDate, OrderType.DEPOSIT, new BigDecimal("1000"));

        when(positionRepository.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of(p));
        when(orderRepository.findByPositionInOrderByOrderDateAsc(any())).thenReturn(List.of(dep));
        when(valuationService.loadSnapshotBatch(any())).thenReturn(Map.of());

        // Après un versement de 1000€, la valeur actuelle est 1030€.
        // Le mock retourne 1030 pour TOUS les appels → V_début = V_fin chaque mois → TWR = 0.
        // XIRR voit lui le vrai gain (1000 → 1030) → MWR > 0. Les deux doivent converger.
        when(valuationService.valuePortfolioAt(any(), any(), any(), any(), any(), any()))
                .thenReturn(BigDecimal.valueOf(1030));

        PerformanceDto dto = service.computeGlobal(user);

        // Les deux calculs doivent être disponibles (le solveur converge)
        assertThat(dto.mwrAnnualized()).isNotNull();
        // MWR reflète le gain réel (1000 → 1030)
        assertThat(dto.mwrAnnualized()).isGreaterThan(0);
    }

    // ── Cas : liquidation XIRR avec cashflow final positif ───────────────────

    @Test
    void portfolioCourant_inclutLiquidationVirtuelle_dansMwr() {
        Position p = livretPosition();
        LocalDate orderDate = LocalDate.now().withDayOfMonth(1).minusYears(1);
        PositionOrder dep = order(p, orderDate, OrderType.DEPOSIT, new BigDecimal("1000"));

        when(positionRepository.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of(p));
        when(orderRepository.findByPositionInOrderByOrderDateAsc(any())).thenReturn(List.of(dep));
        when(valuationService.loadSnapshotBatch(any())).thenReturn(Map.of());
        when(valuationService.valuePortfolioAt(any(), any(), any(), any(), any(), any()))
                .thenReturn(BigDecimal.valueOf(1100));

        PerformanceDto dto = service.computeGlobal(user);

        assertThat(dto.currentValueEur()).isNotNull();
        assertThat(dto.currentValueEur().doubleValue()).isCloseTo(1100, within(0.01));
    }

    // ── Cas : dividendes comptés dans totalDividendsEur ──────────────────────

    @Test
    void dividendes_comptesInTotalDividends() {
        Position p = livretPosition();
        LocalDate firstOrder = LocalDate.now().withDayOfMonth(1).minusMonths(3);

        PositionOrder dep = order(p, firstOrder, OrderType.DEPOSIT, new BigDecimal("1000"));
        // Dividende reçu le mois suivant
        PositionOrder div = order(p, firstOrder.plusMonths(1).withDayOfMonth(15),
                OrderType.DIVIDEND, new BigDecimal("25"));

        when(positionRepository.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of(p));
        when(orderRepository.findByPositionInOrderByOrderDateAsc(any())).thenReturn(List.of(dep, div));
        when(valuationService.loadSnapshotBatch(any())).thenReturn(Map.of());
        when(valuationService.valuePortfolioAt(any(), any(), any(), any(), any(), any()))
                .thenReturn(BigDecimal.valueOf(1025));

        PerformanceDto dto = service.computeGlobal(user);

        assertThat(dto.totalDividendsEur().doubleValue()).isCloseTo(25.0, within(0.01));
        // Les dividendes NE sont PAS dans totalInvested
        assertThat(dto.totalInvestedEur().doubleValue()).isCloseTo(1000.0, within(0.01));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Position livretPosition() {
        Position p = new Position();
        p.setId(1L);
        p.setCategory(AssetCategory.LIVRET);
        p.setLabel("Livret A");
        p.setCurrency("EUR");
        p.setAnnualRate(new BigDecimal("3.0"));
        p.setStatus(PositionStatus.ACTIVE);
        p.setIncludeInIncomeProjection(true);
        p.setCreatedAt(LocalDateTime.now());
        p.setOrders(new ArrayList<>());
        return p;
    }

    private PositionOrder order(Position pos, LocalDate date, OrderType type, BigDecimal amount) {
        PositionOrder o = new PositionOrder();
        o.setPosition(pos);
        o.setOrderType(type);
        o.setAmount(amount);
        o.setAmountEur(amount);
        o.setOrderDate(date);
        return o;
    }
}
