package com.myfinance.service;

import com.myfinance.domain.PositionStatus;
import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.SafetyNetMode;
import com.myfinance.domain.User;
import com.myfinance.dto.*;
import com.myfinance.service.InstrumentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PatrimoineScoreServiceTest {

    @Mock InstrumentService instrumentService;
    @Mock PositionService positionService;
    @Mock PatrimoineTargetService patrimoineTargetService;
    @Mock DebtService debtService;
    @Mock RecurringExpenseService recurringExpenseService;
    @Mock PortfolioSnapshotService portfolioSnapshotService;

    @InjectMocks PatrimoineScoreService service;

    User user;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id(1L).login("user").role(RoleEnum.USER)
                .birthDate(LocalDate.of(1990, 1, 1))
                .safetyNetMode(SafetyNetMode.MONTHS_EXPENSES)
                .safetyNetMonths(3.0)
                .build();
    }

    // ── Nominal ────────────────────────────────────────────────────

    @Test
    void computeScore_retourneUnScoreValide() {
        stubDataComplet();

        PatrimoineScoreDto result = service.computeScore(user);

        assertThat(result.totalScore()).isBetween(0, 105);
        assertThat(result.maxScore()).isEqualTo(105);
        assertThat(result.profile()).isNotNull();
        assertThat(result.axes()).hasSize(6);
    }

    @Test
    void computeScore_avecPatrimoineSolide_retourneProfilDynamiqueOuMieux() {
        stubDataComplet();

        PatrimoineScoreDto result = service.computeScore(user);

        assertThat(result.profile()).isIn("DYNAMIQUE", "OPTIMISE", "EQUILIBRE");
    }

    @Test
    void computeScore_sansDette_axeEndettementMaximal() {
        stubSansDette();

        PatrimoineScoreDto result = service.computeScore(user);

        PatrimoineScoreDto.AxeScoreDto axe = result.axes().stream()
                .filter(a -> a.id().equals("ENDETTEMENT"))
                .findFirst().orElseThrow();
        assertThat(axe.score()).isEqualTo(axe.maxScore());
    }

    // ── Sans données ───────────────────────────────────────────────

    @Test
    void computeScore_sansBirthDate_axeAgeRisqueAZero() {
        user = User.builder().id(1L).login("user").role(RoleEnum.USER).build();
        stubDataMinimale();

        PatrimoineScoreDto result = service.computeScore(user);

        PatrimoineScoreDto.AxeScoreDto axe = result.axes().stream()
                .filter(a -> a.id().equals("AGE_RISQUE"))
                .findFirst().orElseThrow();
        assertThat(axe.score()).isZero();
    }

    @Test
    void computeScore_sansSnapshot_axeProgressionAZero() {
        stubDataMinimale();
        when(portfolioSnapshotService.findAllByUser(user)).thenReturn(List.of());

        PatrimoineScoreDto result = service.computeScore(user);

        PatrimoineScoreDto.AxeScoreDto axe = result.axes().stream()
                .filter(a -> a.id().equals("PROGRESSION"))
                .findFirst().orElseThrow();
        assertThat(axe.score()).isZero();
    }

    @Test
    void computeScore_sansConfigSafetyNet_axeMateLasAZero() {
        user = User.builder().id(1L).login("user").role(RoleEnum.USER)
                .birthDate(LocalDate.of(1990, 1, 1))
                .build();
        stubDataMinimale();

        PatrimoineScoreDto result = service.computeScore(user);

        PatrimoineScoreDto.AxeScoreDto axe = result.axes().stream()
                .filter(a -> a.id().equals("MATELAS"))
                .findFirst().orElseThrow();
        assertThat(axe.score()).isZero();
    }

    @Test
    void computeScore_avecTroisObjectifs_ajouteLeBonusDePoints() {
        stubDataComplet();
        when(patrimoineTargetService.getTargets(user))
                .thenReturn(Map.of("BOURSE", 50000.0, "LIVRET", 10000.0, "LIQUIDITE", 5000.0));

        PatrimoineScoreDto result = service.computeScore(user);

        // Le bonus +5 est inclus dans le totalScore
        int baseScore = result.axes().stream().mapToInt(PatrimoineScoreDto.AxeScoreDto::score).sum();
        assertThat(result.totalScore()).isEqualTo(baseScore + 5);
    }

    @Test
    void computeScore_axeLePlusFaibleFournitUnConseil() {
        stubDataMinimale();

        PatrimoineScoreDto result = service.computeScore(user);

        assertThat(result.weakestAxisId()).isNotNull();
        assertThat(result.weakestAxisAdvice()).isNotBlank();
    }

    // ── Helpers ────────────────────────────────────────────────────

    private void stubDataComplet() {
        when(instrumentService.loadAllocationsForScore(any()))
                .thenReturn(new InstrumentService.AllocationsBundle(Map.of(), Map.of()));

        PositionComputedDto computed = new PositionComputedDto(
                BigDecimal.valueOf(40000), BigDecimal.valueOf(50000),
                BigDecimal.valueOf(10000), null, null);

        PositionDto bourse = buildPosition("BOURSE", computed);
        PositionDto livret = buildPosition("LIVRET", new PositionComputedDto(
                BigDecimal.valueOf(10000), BigDecimal.valueOf(10000), BigDecimal.ZERO, null, null));
        PositionDto liquidite = buildPosition("LIQUIDITE", new PositionComputedDto(
                BigDecimal.valueOf(8000), BigDecimal.valueOf(8000), BigDecimal.ZERO, null, null));
        PositionDto immo = buildPosition("IMMO_PHYSIQUE", new PositionComputedDto(
                BigDecimal.valueOf(150000), BigDecimal.valueOf(180000), BigDecimal.valueOf(30000), null, null));

        when(positionService.findAllByUser(eq(user), any(), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(bourse, livret, liquidite, immo));
        when(patrimoineTargetService.getTargets(user)).thenReturn(Map.of("BOURSE", 50000.0));
        when(debtService.getSummary(user)).thenReturn(new DebtSummaryDto(
                1, BigDecimal.valueOf(80000), BigDecimal.valueOf(900),
                BigDecimal.valueOf(50), BigDecimal.valueOf(950), List.of()));
        when(recurringExpenseService.getSummary(user)).thenReturn(new ExpenseSummaryDto(
                3500f, "NET_AFTER_TAX", 2000f, 24000f, 1500f, 43f,
                List.of(), null, null, null, null));
        when(portfolioSnapshotService.findAllByUser(user)).thenReturn(List.of(
                new PortfolioSnapshotDto(2L, LocalDate.now().minusMonths(1),
                        BigDecimal.valueOf(200000), BigDecimal.valueOf(248000), BigDecimal.valueOf(48000), null),
                new PortfolioSnapshotDto(1L, LocalDate.now().minusMonths(6),
                        BigDecimal.valueOf(190000), BigDecimal.valueOf(230000), BigDecimal.valueOf(40000), null)
        ));
    }

    private void stubSansDette() {
        stubDataComplet();
        when(debtService.getSummary(user)).thenReturn(new DebtSummaryDto(
                0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, List.of()));
    }

    private void stubDataMinimale() {
        when(instrumentService.loadAllocationsForScore(any()))
                .thenReturn(new InstrumentService.AllocationsBundle(Map.of(), Map.of()));

        when(positionService.findAllByUser(eq(user), any(), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of());
        when(patrimoineTargetService.getTargets(user)).thenReturn(Map.of());
        when(debtService.getSummary(user)).thenReturn(new DebtSummaryDto(
                0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, List.of()));
        when(recurringExpenseService.getSummary(user)).thenReturn(new ExpenseSummaryDto(
                null, "NONE", 0f, 0f, null, null, List.of(), null, null, null, null));
        when(portfolioSnapshotService.findAllByUser(user)).thenReturn(List.of());
    }

    private PositionDto buildPosition(String category, PositionComputedDto computed) {
        return new PositionDto(null,
                com.myfinance.domain.AssetCategory.valueOf(category),
                null, category, "EUR", null, null, null,
                null, null, null, null, null, null, null, null,
                false, PositionStatus.ACTIVE, null, null, computed);
    }
}
