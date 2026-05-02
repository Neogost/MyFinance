package com.myfinance.service;

import com.myfinance.domain.*;
import com.myfinance.dto.*;
import com.myfinance.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PerformanceServiceTest {

    @Mock PositionRepository          positionRepository;
    @Mock PositionOrderRepository     positionOrderRepository;
    @Mock PortfolioSnapshotRepository portfolioSnapshotRepository;
    @Mock PositionService             positionService;

    @InjectMocks PerformanceService performanceService;

    User     owner;
    User     other;
    Position boursePosition;
    Position liquiditePosition;

    @BeforeEach
    void setUp() {
        owner = User.builder().id(1L).login("owner").role(RoleEnum.USER).build();
        other = User.builder().id(2L).login("other").role(RoleEnum.USER).build();

        boursePosition = Position.builder()
                .id(10L).user(owner).category(AssetCategory.BOURSE)
                .label("CW8").currency("EUR").status(PositionStatus.ACTIVE)
                .includeInIncomeProjection(false).createdAt(LocalDateTime.now())
                .build();

        liquiditePosition = Position.builder()
                .id(11L).user(owner).category(AssetCategory.LIQUIDITE)
                .label("Compte courant").currency("EUR").status(PositionStatus.ACTIVE)
                .includeInIncomeProjection(false).createdAt(LocalDateTime.now())
                .build();
    }

    /** Crée un PositionDto minimal compatible avec le record (21 champs). */
    private PositionDto buildPositionDto(Long id, AssetCategory cat, PositionComputedDto computed) {
        return new PositionDto(id, cat, null, "Label", "EUR",
                null, null, null, null, null, null, null, null, null,
                null, null, null, false, PositionStatus.ACTIVE, LocalDateTime.now(), null, computed);
    }

    // ── computeGlobal ─────────────────────────────────────────────────

    @Test
    void computeGlobal_sansPosition_retournePerformanceVide() {
        when(positionRepository.findByUserOrderByCreatedAtDesc(owner)).thenReturn(List.of());

        PerformanceDto result = performanceService.computeGlobal(owner, null, null, null);

        assertThat(result).isNotNull();
        assertThat(result.twrAnnualized()).isNull();
        assertThat(result.mwrAnnualized()).isNull();
        assertThat(result.warning()).contains("Aucune position");
    }

    @Test
    void computeGlobal_filtreCategorieLiquidite() {
        // La catégorie LIQUIDITE ne doit pas être incluse — aucun ordre chargé
        when(positionRepository.findByUserOrderByCreatedAtDesc(owner))
                .thenReturn(List.of(liquiditePosition));

        PerformanceDto result = performanceService.computeGlobal(owner, null, null, null);

        assertThat(result.warning()).contains("Aucune position");
        verify(positionOrderRepository, never()).findByPositionInOrderByOrderDateAsc(any());
    }

    @Test
    void computeGlobal_avecOrdreBourse_calculeMwr() {
        PositionOrder buyOrder = PositionOrder.builder()
                .id(1L).position(boursePosition)
                .orderType(OrderType.BUY)
                .orderDate(LocalDate.of(2024, 1, 1))
                .amountEur(new BigDecimal("1000"))
                .amount(new BigDecimal("1000"))
                .build();

        when(positionRepository.findByUserOrderByCreatedAtDesc(owner))
                .thenReturn(List.of(boursePosition));
        when(positionOrderRepository.findByPositionInOrderByOrderDateAsc(anyList()))
                .thenReturn(List.of(buyOrder));
        when(portfolioSnapshotRepository.findByUserWithPositionsOrderBySnapshotDateAsc(owner))
                .thenReturn(List.of());

        PositionComputedDto computed = new PositionComputedDto(
                new BigDecimal("1000"), new BigDecimal("1100"), new BigDecimal("100"), null, null);
        when(positionService.findAllByUser(eq(owner), isNull(), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(buildPositionDto(10L, AssetCategory.BOURSE, computed)));

        PerformanceDto result = performanceService.computeGlobal(owner, null, null, null);

        assertThat(result).isNotNull();
        assertThat(result.currentValueEur()).isEqualByComparingTo("1100");
        assertThat(result.totalInvestedEur()).isEqualByComparingTo("1000");
        assertThat(result.absoluteGainEur()).isEqualByComparingTo("100");
        assertThat(result.mwrAnnualized()).isNotNull();
    }

    @Test
    void computeGlobal_sansTwr_benchmarkOutperformanceNull() {
        PositionOrder buyOrder = PositionOrder.builder()
                .id(1L).position(boursePosition)
                .orderType(OrderType.BUY)
                .orderDate(LocalDate.of(2023, 1, 1))
                .amountEur(new BigDecimal("1000"))
                .amount(new BigDecimal("1000"))
                .build();

        when(positionRepository.findByUserOrderByCreatedAtDesc(owner))
                .thenReturn(List.of(boursePosition));
        when(positionOrderRepository.findByPositionInOrderByOrderDateAsc(anyList()))
                .thenReturn(List.of(buyOrder));
        when(portfolioSnapshotRepository.findByUserWithPositionsOrderBySnapshotDateAsc(owner))
                .thenReturn(List.of());

        PositionComputedDto computed = new PositionComputedDto(
                new BigDecimal("1000"), new BigDecimal("1100"), new BigDecimal("100"), null, null);
        when(positionService.findAllByUser(eq(owner), isNull(), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(buildPositionDto(10L, AssetCategory.BOURSE, computed)));

        PerformanceDto result = performanceService.computeGlobal(owner, null, null, 8.0);

        assertThat(result.benchmarkRate()).isEqualTo(8.0);
        // Sans TWR (pas de snapshots), benchmarkOutperformance est null
        assertThat(result.benchmarkOutperformance()).isNull();
    }

    // ── computePositions ──────────────────────────────────────────────

    @Test
    void computePositions_sansPosition_retourneListeVide() {
        when(positionRepository.findByUserOrderByCreatedAtDesc(owner)).thenReturn(List.of());

        List<PositionPerformanceDto> result = performanceService.computePositions(owner, null, null);

        assertThat(result).isEmpty();
    }

    // ── computePosition individuelle ──────────────────────────────────

    @Test
    void computePosition_leve404_siPositionIntrouvable() {
        when(positionRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> performanceService.computePosition(99L, owner, null, null))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void computePosition_leve403_siAutreUtilisateur() {
        when(positionRepository.findById(10L)).thenReturn(Optional.of(boursePosition));

        assertThatThrownBy(() -> performanceService.computePosition(10L, other, null, null))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void computePosition_leve400_siCategorieNonEligible() {
        when(positionRepository.findById(11L)).thenReturn(Optional.of(liquiditePosition));

        assertThatThrownBy(() -> performanceService.computePosition(11L, owner, null, null))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void computePosition_avecOrdresEtValeur_retournePerformance() {
        PositionOrder buy = PositionOrder.builder()
                .id(1L).position(boursePosition)
                .orderType(OrderType.BUY)
                .orderDate(LocalDate.of(2024, 1, 1))
                .amountEur(new BigDecimal("500"))
                .amount(new BigDecimal("500"))
                .build();

        when(positionRepository.findById(10L)).thenReturn(Optional.of(boursePosition));
        when(positionOrderRepository.findByPositionOrderByOrderDateDesc(boursePosition))
                .thenReturn(List.of(buy));
        when(portfolioSnapshotRepository.findByUserWithPositionsOrderBySnapshotDateAsc(owner))
                .thenReturn(List.of());

        PositionComputedDto computed = new PositionComputedDto(
                new BigDecimal("500"), new BigDecimal("600"), new BigDecimal("100"), null, null);
        when(positionService.findAllByUser(eq(owner), isNull(), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(buildPositionDto(10L, AssetCategory.BOURSE, computed)));

        PositionPerformanceDto result = performanceService.computePosition(10L, owner, null, null);

        assertThat(result).isNotNull();
        assertThat(result.positionId()).isEqualTo(10L);
        assertThat(result.investedEur()).isEqualByComparingTo("500");
        assertThat(result.currentValueEur()).isEqualByComparingTo("600");
        assertThat(result.gainEur()).isEqualByComparingTo("100");
        assertThat(result.mwrAnnualized()).isNotNull();
    }
}
