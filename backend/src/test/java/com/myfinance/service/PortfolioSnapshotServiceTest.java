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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PortfolioSnapshotServiceTest {

    @Mock PortfolioSnapshotRepository portfolioSnapshotRepository;
    @Mock PositionSnapshotRepository positionSnapshotRepository;
    @Mock PositionRepository positionRepository;
    @Mock PositionOrderRepository positionOrderRepository;
    @InjectMocks PortfolioSnapshotService portfolioSnapshotService;

    User owner;
    User other;
    Position livret;
    Position liquidite;

    @BeforeEach
    void setUp() {
        owner = User.builder().id(1L).login("owner").role(RoleEnum.USER).build();
        other = User.builder().id(2L).login("other").role(RoleEnum.USER).build();

        livret = Position.builder()
                .id(1L).user(owner)
                .category(AssetCategory.LIVRET)
                .label("Livret A").currency("EUR")
                .annualRate(new BigDecimal("3.00"))
                .includeInIncomeProjection(false)
                .status(PositionStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .build();

        liquidite = Position.builder()
                .id(2L).user(owner)
                .category(AssetCategory.LIQUIDITE)
                .label("Ticket Restaurant").currency("EUR")
                .currentBalance(new BigDecimal("500"))
                .includeInIncomeProjection(false)
                .status(PositionStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .build();
    }

    // ── findAllByUser ──────────────────────────────────────────

    @Test
    void findAllByUser_retourneLesSnapshots() {
        PortfolioSnapshot snap = PortfolioSnapshot.builder()
                .id(1L).user(owner)
                .snapshotDate(LocalDate.of(2026, 4, 1))
                .totalInvestedEur(new BigDecimal("10000"))
                .totalCurrentValueEur(new BigDecimal("10500"))
                .totalCapitalGainEur(new BigDecimal("500"))
                .build();

        when(portfolioSnapshotRepository.findByUserOrderBySnapshotDateDesc(owner))
                .thenReturn(List.of(snap));

        List<PortfolioSnapshotDto> result = portfolioSnapshotService.findAllByUser(owner);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).snapshotDate()).isEqualTo(LocalDate.of(2026, 4, 1));
    }

    // ── findById ───────────────────────────────────────────────

    @Test
    void findById_retourneLSnapshot() {
        PortfolioSnapshot snap = PortfolioSnapshot.builder()
                .id(5L).user(owner)
                .snapshotDate(LocalDate.of(2026, 4, 1))
                .totalInvestedEur(new BigDecimal("10000"))
                .totalCurrentValueEur(new BigDecimal("10500"))
                .totalCapitalGainEur(new BigDecimal("500"))
                .build();

        when(portfolioSnapshotRepository.findById(5L)).thenReturn(Optional.of(snap));

        PortfolioSnapshotDto result = portfolioSnapshotService.findById(5L, owner);

        assertThat(result.id()).isEqualTo(5L);
        assertThat(result.totalCapitalGainEur()).isEqualByComparingTo("500");
    }

    @Test
    void findById_leve403_siAutreUtilisateur() {
        PortfolioSnapshot snap = PortfolioSnapshot.builder()
                .id(5L).user(owner).snapshotDate(LocalDate.now())
                .totalInvestedEur(BigDecimal.ZERO).totalCurrentValueEur(BigDecimal.ZERO)
                .totalCapitalGainEur(BigDecimal.ZERO).build();

        when(portfolioSnapshotRepository.findById(5L)).thenReturn(Optional.of(snap));

        assertThatThrownBy(() -> portfolioSnapshotService.findById(5L, other))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));
    }

    // ── create ─────────────────────────────────────────────────

    @Test
    void create_construitEtSauvegardeLeSnapshot() {
        LocalDate snapshotDate = LocalDate.of(2026, 4, 12);
        CreateSnapshotRequest request = new CreateSnapshotRequest(snapshotDate);

        LocalDate start = snapshotDate.withDayOfMonth(1);
        LocalDate end = start.plusMonths(1).minusDays(1);

        when(portfolioSnapshotRepository.findByUserAndSnapshotDateBetween(owner, start, end))
                .thenReturn(Optional.empty());
        when(positionRepository.findByUserAndStatusOrderByCreatedAtDesc(owner, PositionStatus.ACTIVE))
                .thenReturn(List.of(livret, liquidite));
        when(positionOrderRepository.findByPositionOrderByOrderDateDesc(livret))
                .thenReturn(List.of(PositionOrder.builder()
                        .id(1L).position(livret).orderType(OrderType.DEPOSIT)
                        .amount(new BigDecimal("5000")).amountEur(new BigDecimal("5000"))
                        .orderDate(LocalDate.of(2025, 1, 1)).build()));
        when(positionOrderRepository.findByPositionOrderByOrderDateDesc(liquidite))
                .thenReturn(List.of());
        when(portfolioSnapshotRepository.save(any(PortfolioSnapshot.class)))
                .thenAnswer(inv -> {
                    PortfolioSnapshot s = inv.getArgument(0);
                    s = PortfolioSnapshot.builder()
                            .id(10L).user(s.getUser())
                            .snapshotDate(s.getSnapshotDate())
                            .totalInvestedEur(s.getTotalInvestedEur())
                            .totalCurrentValueEur(s.getTotalCurrentValueEur())
                            .totalCapitalGainEur(s.getTotalCapitalGainEur())
                            .positionSnapshots(s.getPositionSnapshots())
                            .build();
                    return s;
                });

        PortfolioSnapshotDto result = portfolioSnapshotService.create(request, owner);

        assertThat(result.id()).isEqualTo(10L);
        assertThat(result.snapshotDate()).isEqualTo(snapshotDate);
        // Livret : 5000 investi, liquidite : 500 en solde → total = 5500
        assertThat(result.totalInvestedEur()).isEqualByComparingTo("5500.00");
        verify(portfolioSnapshotRepository).save(any(PortfolioSnapshot.class));
    }

    @Test
    void create_leve409_siSnapshotExistantPourLeMois() {
        LocalDate snapshotDate = LocalDate.of(2026, 4, 12);
        CreateSnapshotRequest request = new CreateSnapshotRequest(snapshotDate);

        LocalDate start = snapshotDate.withDayOfMonth(1);
        LocalDate end = start.plusMonths(1).minusDays(1);

        PortfolioSnapshot existing = PortfolioSnapshot.builder()
                .id(1L).user(owner).snapshotDate(LocalDate.of(2026, 4, 1))
                .totalInvestedEur(BigDecimal.ZERO).totalCurrentValueEur(BigDecimal.ZERO)
                .totalCapitalGainEur(BigDecimal.ZERO).build();

        when(portfolioSnapshotRepository.findByUserAndSnapshotDateBetween(owner, start, end))
                .thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> portfolioSnapshotService.create(request, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));
        verify(portfolioSnapshotRepository, never()).save(any());
    }
}
