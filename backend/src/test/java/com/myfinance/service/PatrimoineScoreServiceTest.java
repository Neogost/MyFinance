package com.myfinance.service;

import com.myfinance.domain.FiscalEnvelope;
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
    void computeScore_sansBourseNiImmoPapier_axeFiscalMaxScore() {
        stubDataMinimale();

        PatrimoineScoreDto result = service.computeScore(user);

        PatrimoineScoreDto.AxeScoreDto axe = result.axes().stream()
                .filter(a -> a.id().equals("OPTIMISATION_FISCALE"))
                .findFirst().orElseThrow();
        assertThat(axe.score()).isEqualTo(axe.maxScore());
    }

    @Test
    void computeScore_avecBourseEnPea_axeFiscalMaxScore() {
        stubDataBase();
        PositionComputedDto computed = new PositionComputedDto(
                BigDecimal.valueOf(30000), BigDecimal.valueOf(40000), BigDecimal.valueOf(10000), null, null);
        when(positionService.findAllByUser(eq(user), any(), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(buildPositionWithEnvelope("BOURSE", FiscalEnvelope.PEA, computed)));

        PatrimoineScoreDto result = service.computeScore(user);

        PatrimoineScoreDto.AxeScoreDto axe = result.axes().stream()
                .filter(a -> a.id().equals("OPTIMISATION_FISCALE"))
                .findFirst().orElseThrow();
        assertThat(axe.score()).isEqualTo(15);
    }

    @Test
    void computeScore_avecBourseSansEnveloppe_axeFiscalAZero() {
        stubDataBase();
        PositionComputedDto computed = new PositionComputedDto(
                BigDecimal.valueOf(30000), BigDecimal.valueOf(40000), BigDecimal.valueOf(10000), null, null);
        when(positionService.findAllByUser(eq(user), any(), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(buildPositionWithEnvelope("BOURSE", FiscalEnvelope.CTO, computed)));

        PatrimoineScoreDto result = service.computeScore(user);

        PatrimoineScoreDto.AxeScoreDto axe = result.axes().stream()
                .filter(a -> a.id().equals("OPTIMISATION_FISCALE"))
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
                .thenReturn(new PatrimoineTargetsDto(
                        Map.of("BOURSE", 50000.0, "LIVRET", 10000.0, "LIQUIDITE", 5000.0), Map.of(), Map.of()));

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

    // ═══════════════════════════════════════════════════════════════════════════
    // Tests additionnels — couverture exhaustive des 6 axes
    // ═══════════════════════════════════════════════════════════════════════════

    // ── Axe Diversification : nb catégories, concentration, géo, secteurs ────

    @Test
    void diversification_2categoriesInvestissement_score9() {
        stubDataBase();
        // BOURSE + IMMO (sans LIQUIDITE qui est exclue). Répartition équilibrée pour éviter
        // que la concentration max dépasse 60%.
        when(positionService.findAllByUser(eq(user), any(), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(
                        buildPosition("BOURSE", computedOf(40_000)),
                        buildPosition("IMMO_PHYSIQUE", computedOf(50_000))));  // max 50/90 = 55%

        PatrimoineScoreDto.AxeScoreDto axe = axeOf(service.computeScore(user), "DIVERSIFICATION");
        // 2 catégories = 2 pts + concentration max ≤ 60% = +7 → 9
        assertThat(axe.score()).isEqualTo(9);
    }

    @Test
    void diversification_3categoriesInvestissement_score4() {
        stubDataBase();
        when(positionService.findAllByUser(eq(user), any(), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(
                        buildPosition("BOURSE", computedOf(20_000)),
                        buildPosition("CRYPTO", computedOf(20_000)),
                        buildPosition("IMMO_PHYSIQUE", computedOf(20_000))));

        PatrimoineScoreDto.AxeScoreDto axe = axeOf(service.computeScore(user), "DIVERSIFICATION");
        // 3 cat = 4 pts + concentration OK (33%) = 4 + 7 = 11
        assertThat(axe.score()).isEqualTo(11);
    }

    @Test
    void diversification_4categoriesInvestissement_score8() {
        stubDataBase();
        when(positionService.findAllByUser(eq(user), any(), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(
                        buildPosition("BOURSE", computedOf(10_000)),
                        buildPosition("CRYPTO", computedOf(10_000)),
                        buildPosition("IMMO_PHYSIQUE", computedOf(10_000)),
                        buildPosition("LIVRET", computedOf(10_000))));

        PatrimoineScoreDto.AxeScoreDto axe = axeOf(service.computeScore(user), "DIVERSIFICATION");
        // 4 cat = 8 pts + concentration OK = 8 + 7 = 15
        assertThat(axe.score()).isEqualTo(15);
    }

    @Test
    void diversification_concentrationSuperieure60Pct_pasDeBonus() {
        stubDataBase();
        when(positionService.findAllByUser(eq(user), any(), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(
                        buildPosition("BOURSE", computedOf(70_000)),   // 70%
                        buildPosition("IMMO_PHYSIQUE", computedOf(30_000))));  // 30%

        PatrimoineScoreDto.AxeScoreDto axe = axeOf(service.computeScore(user), "DIVERSIFICATION");
        // 2 cat = 2 pts ; concentration > 60% → pas de bonus 7 ; total 2
        assertThat(axe.score()).isEqualTo(2);
    }

    @Test
    void diversification_objectifsAtteints_ajouteBonus() {
        stubDataBase();
        when(positionService.findAllByUser(eq(user), any(), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(
                        buildPosition("BOURSE", computedOf(30_000)),
                        buildPosition("IMMO_PHYSIQUE", computedOf(30_000))));
        // 3 objectifs atteints ≥ 50% chacun (50000 × 0.5 = 25000, on est à 30000)
        when(patrimoineTargetService.getTargets(user))
                .thenReturn(new PatrimoineTargetsDto(
                        Map.of("BOURSE", 50_000.0, "IMMO_PHYSIQUE", 50_000.0, "CRYPTO", 1_000.0),
                        Map.of(), Map.of()));
        // CRYPTO target 1000 mais 0 en portfolio → pas onTrack
        // BOURSE 30000 ≥ 50000*0.5 = 25000 → onTrack
        // IMMO_PHYSIQUE 30000 ≥ 50000*0.5 = 25000 → onTrack
        // → 2 onTrack → +3 pts

        PatrimoineScoreDto.AxeScoreDto axe = axeOf(service.computeScore(user), "DIVERSIFICATION");
        // 2 cat = 2 pts + concentration OK = 2 + 7 + 3 = 12
        assertThat(axe.score()).isEqualTo(12);
    }

    // ── Axe SafetyNet : 3 modes + tiers de couverture ────────────────────────

    @Test
    void safetyNet_modeMonthsSalary_couverture100Pct_score15() {
        user = User.builder().id(1L).login("u").role(RoleEnum.USER)
                .safetyNetMode(SafetyNetMode.MONTHS_SALARY).safetyNetMonths(3.0).build();
        stubDataBase();
        when(recurringExpenseService.getSummary(user)).thenReturn(new ExpenseSummaryDto(
                1500f, "NET_AFTER_TAX", 0f, 0f, 1500f, 30f,
                List.of(), null, null, null, null, null, null, null));  // monthlyNetIncome=1500
        // Target = 1500 × 3 = 4500 ; on met 5000 en liquide pour atteindre 100%
        when(positionService.findAllByUser(eq(user), any(), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(buildPosition("LIQUIDITE", computedOf(5_000))));

        PatrimoineScoreDto.AxeScoreDto axe = axeOf(service.computeScore(user), "MATELAS");
        assertThat(axe.score()).isEqualTo(15);
    }

    @Test
    void safetyNet_modeFixedAmount_couverture66Pct_score10() {
        user = User.builder().id(1L).login("u").role(RoleEnum.USER)
                .safetyNetMode(SafetyNetMode.FIXED_AMOUNT).safetyNetAmount(10_000.0).build();
        stubDataBase();
        when(positionService.findAllByUser(eq(user), any(), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(buildPosition("LIQUIDITE", computedOf(7_000))));  // 70%

        PatrimoineScoreDto.AxeScoreDto axe = axeOf(service.computeScore(user), "MATELAS");
        assertThat(axe.score()).isEqualTo(10);  // tier 0.66 ≤ x < 1.0
    }

    @Test
    void safetyNet_couverture40Pct_score5() {
        user = User.builder().id(1L).login("u").role(RoleEnum.USER)
                .safetyNetMode(SafetyNetMode.FIXED_AMOUNT).safetyNetAmount(10_000.0).build();
        stubDataBase();
        when(positionService.findAllByUser(eq(user), any(), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(buildPosition("LIQUIDITE", computedOf(4_000))));  // 40%

        PatrimoineScoreDto.AxeScoreDto axe = axeOf(service.computeScore(user), "MATELAS");
        assertThat(axe.score()).isEqualTo(5);  // tier 0.33 ≤ x < 0.66
    }

    @Test
    void safetyNet_couvertureTropFaible_score0() {
        user = User.builder().id(1L).login("u").role(RoleEnum.USER)
                .safetyNetMode(SafetyNetMode.FIXED_AMOUNT).safetyNetAmount(10_000.0).build();
        stubDataBase();
        when(positionService.findAllByUser(eq(user), any(), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(buildPosition("LIQUIDITE", computedOf(1_000))));  // 10%

        PatrimoineScoreDto.AxeScoreDto axe = axeOf(service.computeScore(user), "MATELAS");
        assertThat(axe.score()).isZero();
    }

    @Test
    void safetyNet_modeMonthsExpenses_sansDonneesExpense_targetZero() {
        // user a configuré MONTHS_EXPENSES mais aucune donnée → target=0 → score 0
        user = User.builder().id(1L).login("u").role(RoleEnum.USER)
                .safetyNetMode(SafetyNetMode.MONTHS_EXPENSES).safetyNetMonths(3.0).build();
        stubDataMinimale();

        PatrimoineScoreDto.AxeScoreDto axe = axeOf(service.computeScore(user), "MATELAS");
        assertThat(axe.score()).isZero();
        assertThat(axe.missingData()).isTrue();
    }

    @Test
    void safetyNet_modeFixedAmount_sansMontant_targetZero() {
        user = User.builder().id(1L).login("u").role(RoleEnum.USER)
                .safetyNetMode(SafetyNetMode.FIXED_AMOUNT).build();  // sans safetyNetAmount
        stubDataMinimale();

        PatrimoineScoreDto.AxeScoreDto axe = axeOf(service.computeScore(user), "MATELAS");
        assertThat(axe.score()).isZero();
        assertThat(axe.missingData()).isTrue();
    }

    // ── Axe Endettement : tiers debtRate + ratio dette/patrimoine ────────────

    @Test
    void endettement_debtRateMoinsDe20Pct_score20() {
        stubDataBase();
        when(positionService.findAllByUser(eq(user), any(), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(buildPosition("IMMO_PHYSIQUE", computedOf(300_000))));
        when(debtService.getSummary(user)).thenReturn(new DebtSummaryDto(
                1, BigDecimal.valueOf(50_000), BigDecimal.valueOf(800),
                BigDecimal.ZERO, BigDecimal.valueOf(800), List.of()));
        // monthlyNetIncome = 5000, monthlyCost = 800 → 16% < 20% → +16 pts
        when(recurringExpenseService.getSummary(user)).thenReturn(new ExpenseSummaryDto(
                5000f, "NET_AFTER_TAX", 2000f, 24_000f, 3_000f, null,
                List.of(), null, null, null, null, null, null, null));

        PatrimoineScoreDto.AxeScoreDto axe = axeOf(service.computeScore(user), "ENDETTEMENT");
        // 16 (debtRate <20%) + 4 (ratio dette/patrimoine 50k/300k = 17% < 30%) = 20
        assertThat(axe.score()).isEqualTo(20);
    }

    @Test
    void endettement_debtRateEntre33Et40Pct_score7() {
        stubDataBase();
        when(positionService.findAllByUser(eq(user), any(), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(buildPosition("IMMO_PHYSIQUE", computedOf(200_000))));
        when(debtService.getSummary(user)).thenReturn(new DebtSummaryDto(
                1, BigDecimal.valueOf(80_000), BigDecimal.valueOf(1100),
                BigDecimal.ZERO, BigDecimal.valueOf(1100), List.of()));
        // monthlyNetIncome = 3000, monthlyCost = 1100 → 36.67% → tier 33-40% → +5 pts
        when(recurringExpenseService.getSummary(user)).thenReturn(new ExpenseSummaryDto(
                3000f, "NET_AFTER_TAX", 2000f, 24_000f, 1_000f, null,
                List.of(), null, null, null, null, null, null, null));

        PatrimoineScoreDto.AxeScoreDto axe = axeOf(service.computeScore(user), "ENDETTEMENT");
        // 5 (33-40%) + 2 (ratio 80k/200k = 40%, < 60% → +2) = 7
        assertThat(axe.score()).isEqualTo(7);
    }

    @Test
    void endettement_debtRateSuperieur40Pct_score0() {
        stubDataBase();
        when(positionService.findAllByUser(eq(user), any(), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(buildPosition("IMMO_PHYSIQUE", computedOf(50_000))));
        when(debtService.getSummary(user)).thenReturn(new DebtSummaryDto(
                1, BigDecimal.valueOf(60_000), BigDecimal.valueOf(2000),
                BigDecimal.ZERO, BigDecimal.valueOf(2000), List.of()));
        // monthlyNetIncome = 3000, monthlyCost = 2000 → 66% → 0 pts
        when(recurringExpenseService.getSummary(user)).thenReturn(new ExpenseSummaryDto(
                3000f, "NET_AFTER_TAX", 500f, 6000f, 1_000f, null,
                List.of(), null, null, null, null, null, null, null));

        PatrimoineScoreDto.AxeScoreDto axe = axeOf(service.computeScore(user), "ENDETTEMENT");
        // 0 (debtRate trop élevé) + 0 (ratio 60k/50k = 120% > 60%) = 0
        assertThat(axe.score()).isZero();
    }

    @Test
    void endettement_sansRevenuConnu_missingDataTrue() {
        stubDataBase();
        when(positionService.findAllByUser(eq(user), any(), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(buildPosition("IMMO_PHYSIQUE", computedOf(200_000))));
        when(debtService.getSummary(user)).thenReturn(new DebtSummaryDto(
                1, BigDecimal.valueOf(50_000), BigDecimal.valueOf(800),
                BigDecimal.ZERO, BigDecimal.valueOf(800), List.of()));
        // monthlyNetIncome null (premier champ)
        when(recurringExpenseService.getSummary(user)).thenReturn(new ExpenseSummaryDto(
                null, "NONE", 0f, 0f, null, null, List.of(), null, null, null, null, null, null, null));

        PatrimoineScoreDto.AxeScoreDto axe = axeOf(service.computeScore(user), "ENDETTEMENT");
        assertThat(axe.missingData()).isTrue();
    }

    // ── Axe Épargne : tiers savingsRate ──────────────────────────────────────
    // ExpenseSummaryDto : monthlyNetIncome, incomeSource, totalMonthlyExpenses,
    //                    totalAnnualExpenses, savingsCapacity, savingsRate, ...

    @Test
    void epargne_tauxEpargneSuperieur20Pct_score20() {
        stubDataBase();
        when(recurringExpenseService.getSummary(user)).thenReturn(new ExpenseSummaryDto(
                3000f, "NET_AFTER_TAX", 2000f, 24000f, 500f, 25f,  // savingsRate=25
                List.of(), null, null, null, null, null, null, null));

        PatrimoineScoreDto.AxeScoreDto axe = axeOf(service.computeScore(user), "EPARGNE");
        assertThat(axe.score()).isEqualTo(20);
    }

    @Test
    void epargne_tauxEpargneEntre10Et20Pct_score14() {
        stubDataBase();
        when(recurringExpenseService.getSummary(user)).thenReturn(new ExpenseSummaryDto(
                3000f, "NET_AFTER_TAX", 2000f, 24000f, 500f, 15f,
                List.of(), null, null, null, null, null, null, null));

        PatrimoineScoreDto.AxeScoreDto axe = axeOf(service.computeScore(user), "EPARGNE");
        assertThat(axe.score()).isEqualTo(14);
    }

    @Test
    void epargne_tauxEpargneEntre5Et10Pct_score8() {
        stubDataBase();
        when(recurringExpenseService.getSummary(user)).thenReturn(new ExpenseSummaryDto(
                3000f, "NET_AFTER_TAX", 2000f, 24000f, 500f, 7f,
                List.of(), null, null, null, null, null, null, null));

        PatrimoineScoreDto.AxeScoreDto axe = axeOf(service.computeScore(user), "EPARGNE");
        assertThat(axe.score()).isEqualTo(8);
    }

    @Test
    void epargne_tauxEpargneInferieurOuEgal5Pct_score0() {
        stubDataBase();
        when(recurringExpenseService.getSummary(user)).thenReturn(new ExpenseSummaryDto(
                3000f, "NET_AFTER_TAX", 2000f, 24000f, 500f, 3f,
                List.of(), null, null, null, null, null, null, null));

        PatrimoineScoreDto.AxeScoreDto axe = axeOf(service.computeScore(user), "EPARGNE");
        assertThat(axe.score()).isZero();
    }

    @Test
    void epargne_savingsRateNull_score0EtMissingData() {
        stubDataMinimale();

        PatrimoineScoreDto.AxeScoreDto axe = axeOf(service.computeScore(user), "EPARGNE");
        assertThat(axe.score()).isZero();
        assertThat(axe.missingData()).isTrue();
    }

    // ── Axe Optimisation Fiscale : tiers de % en enveloppe ───────────────────

    @Test
    void optimisationFiscale_60PctEnEnveloppeAvantageuse_score10() {
        stubDataBase();
        when(positionService.findAllByUser(eq(user), any(), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(
                        buildPositionWithEnvelope("BOURSE", FiscalEnvelope.PEA, computedOf(6_000)),
                        buildPositionWithEnvelope("BOURSE", FiscalEnvelope.CTO, computedOf(4_000))));

        PatrimoineScoreDto.AxeScoreDto axe = axeOf(service.computeScore(user), "OPTIMISATION_FISCALE");
        assertThat(axe.score()).isEqualTo(10);  // 60% → tier 0.60-0.80
    }

    @Test
    void optimisationFiscale_40PctEnEnveloppeAvantageuse_score5() {
        stubDataBase();
        when(positionService.findAllByUser(eq(user), any(), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(
                        buildPositionWithEnvelope("BOURSE", FiscalEnvelope.AV, computedOf(4_000)),
                        buildPositionWithEnvelope("BOURSE", FiscalEnvelope.CTO, computedOf(6_000))));

        PatrimoineScoreDto.AxeScoreDto axe = axeOf(service.computeScore(user), "OPTIMISATION_FISCALE");
        assertThat(axe.score()).isEqualTo(5);  // 40% → tier 0.40-0.60
    }

    @Test
    void optimisationFiscale_moinsDe40PctEnveloppe_score0() {
        stubDataBase();
        when(positionService.findAllByUser(eq(user), any(), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(
                        buildPositionWithEnvelope("BOURSE", FiscalEnvelope.PEA, computedOf(2_000)),
                        buildPositionWithEnvelope("BOURSE", FiscalEnvelope.CTO, computedOf(8_000))));

        PatrimoineScoreDto.AxeScoreDto axe = axeOf(service.computeScore(user), "OPTIMISATION_FISCALE");
        assertThat(axe.score()).isZero();  // 20% < 40%
    }

    // ── Axe Progression : tiers de growth ────────────────────────────────────

    @Test
    void progression_croissanceSuperieure2Pct_score10() {
        stubDataMinimale();
        when(portfolioSnapshotService.findAllByUser(user)).thenReturn(List.of(
                new PortfolioSnapshotDto(2L, LocalDate.now(), BigDecimal.ZERO,
                        BigDecimal.valueOf(110_000), BigDecimal.ZERO, null),
                new PortfolioSnapshotDto(1L, LocalDate.now().minusMonths(6), BigDecimal.ZERO,
                        BigDecimal.valueOf(100_000), BigDecimal.ZERO, null)));

        PatrimoineScoreDto.AxeScoreDto axe = axeOf(service.computeScore(user), "PROGRESSION");
        assertThat(axe.score()).isEqualTo(10);
    }

    @Test
    void progression_croissanceEntre1Et2Pct_score6() {
        stubDataMinimale();
        when(portfolioSnapshotService.findAllByUser(user)).thenReturn(List.of(
                new PortfolioSnapshotDto(2L, LocalDate.now(), BigDecimal.ZERO,
                        BigDecimal.valueOf(101_500), BigDecimal.ZERO, null),
                new PortfolioSnapshotDto(1L, LocalDate.now().minusMonths(6), BigDecimal.ZERO,
                        BigDecimal.valueOf(100_000), BigDecimal.ZERO, null)));

        PatrimoineScoreDto.AxeScoreDto axe = axeOf(service.computeScore(user), "PROGRESSION");
        assertThat(axe.score()).isEqualTo(6);
    }

    @Test
    void progression_croissanceLegere_score3() {
        stubDataMinimale();
        when(portfolioSnapshotService.findAllByUser(user)).thenReturn(List.of(
                new PortfolioSnapshotDto(2L, LocalDate.now(), BigDecimal.ZERO,
                        BigDecimal.valueOf(100_500), BigDecimal.ZERO, null),  // +0.5%
                new PortfolioSnapshotDto(1L, LocalDate.now().minusMonths(6), BigDecimal.ZERO,
                        BigDecimal.valueOf(100_000), BigDecimal.ZERO, null)));

        PatrimoineScoreDto.AxeScoreDto axe = axeOf(service.computeScore(user), "PROGRESSION");
        assertThat(axe.score()).isEqualTo(3);
    }

    @Test
    void progression_decroissance_score0() {
        stubDataMinimale();
        when(portfolioSnapshotService.findAllByUser(user)).thenReturn(List.of(
                new PortfolioSnapshotDto(2L, LocalDate.now(), BigDecimal.ZERO,
                        BigDecimal.valueOf(90_000), BigDecimal.ZERO, null),
                new PortfolioSnapshotDto(1L, LocalDate.now().minusMonths(6), BigDecimal.ZERO,
                        BigDecimal.valueOf(100_000), BigDecimal.ZERO, null)));

        PatrimoineScoreDto.AxeScoreDto axe = axeOf(service.computeScore(user), "PROGRESSION");
        assertThat(axe.score()).isZero();
    }

    @Test
    void progression_snapshotValeurNull_missingData() {
        stubDataMinimale();
        when(portfolioSnapshotService.findAllByUser(user)).thenReturn(List.of(
                new PortfolioSnapshotDto(2L, LocalDate.now(), BigDecimal.ZERO, null, BigDecimal.ZERO, null),
                new PortfolioSnapshotDto(1L, LocalDate.now().minusMonths(6), BigDecimal.ZERO,
                        BigDecimal.valueOf(100_000), BigDecimal.ZERO, null)));

        PatrimoineScoreDto.AxeScoreDto axe = axeOf(service.computeScore(user), "PROGRESSION");
        assertThat(axe.score()).isZero();
        assertThat(axe.missingData()).isTrue();
    }

    @Test
    void progression_valeurInitialeZero_missingData() {
        stubDataMinimale();
        when(portfolioSnapshotService.findAllByUser(user)).thenReturn(List.of(
                new PortfolioSnapshotDto(2L, LocalDate.now(), BigDecimal.ZERO,
                        BigDecimal.valueOf(50_000), BigDecimal.ZERO, null),
                new PortfolioSnapshotDto(1L, LocalDate.now().minusMonths(6), BigDecimal.ZERO,
                        BigDecimal.ZERO, BigDecimal.ZERO, null)));

        PatrimoineScoreDto.AxeScoreDto axe = axeOf(service.computeScore(user), "PROGRESSION");
        assertThat(axe.score()).isZero();
        assertThat(axe.missingData()).isTrue();
    }

    // ── computeProfile : tiers ───────────────────────────────────────────────

    @Test
    void profile_scoreMinimal_prudent() {
        // Sans données : ENDETTEMENT=20 (pas de dette) + OPTIMISATION_FISCALE=15 (pas d'éligibles)
        // = 35 minimum → seuil PRUDENT (35-54). FRAGILE (≤34) inatteignable sans dette ni positions.
        user = User.builder().id(1L).login("u").role(RoleEnum.USER).build();
        stubDataMinimale();

        PatrimoineScoreDto result = service.computeScore(user);
        assertThat(result.totalScore()).isBetween(35, 54);
        assertThat(result.profile()).isEqualTo("PRUDENT");
    }

    // ── Helpers ────────────────────────────────────────────────────

    private PatrimoineScoreDto.AxeScoreDto axeOf(PatrimoineScoreDto result, String id) {
        return result.axes().stream()
                .filter(a -> a.id().equals(id))
                .findFirst().orElseThrow();
    }

    private PositionComputedDto computedOf(long value) {
        return new PositionComputedDto(BigDecimal.valueOf(value), BigDecimal.valueOf(value),
                BigDecimal.ZERO, null, null);
    }

    private void stubDataComplet() {
        when(instrumentService.loadAllocationsForScore(any()))
                .thenReturn(new InstrumentService.AllocationsBundle(Map.of(), Map.of()));

        PositionComputedDto computed = new PositionComputedDto(
                BigDecimal.valueOf(40000), BigDecimal.valueOf(50000),
                BigDecimal.valueOf(10000), null, null);

        PositionDto bourse = buildPositionWithEnvelope("BOURSE", FiscalEnvelope.PEA, computed);
        PositionDto livret = buildPosition("LIVRET", new PositionComputedDto(
                BigDecimal.valueOf(10000), BigDecimal.valueOf(10000), BigDecimal.ZERO, null, null));
        PositionDto liquidite = buildPosition("LIQUIDITE", new PositionComputedDto(
                BigDecimal.valueOf(8000), BigDecimal.valueOf(8000), BigDecimal.ZERO, null, null));
        PositionDto immo = buildPosition("IMMO_PHYSIQUE", new PositionComputedDto(
                BigDecimal.valueOf(150000), BigDecimal.valueOf(180000), BigDecimal.valueOf(30000), null, null));

        when(positionService.findAllByUser(eq(user), any(), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(bourse, livret, liquidite, immo));
        when(patrimoineTargetService.getTargets(user))
                .thenReturn(new PatrimoineTargetsDto(Map.of("BOURSE", 50000.0), Map.of(), Map.of()));
        when(debtService.getSummary(user)).thenReturn(new DebtSummaryDto(
                1, BigDecimal.valueOf(80000), BigDecimal.valueOf(900),
                BigDecimal.valueOf(50), BigDecimal.valueOf(950), List.of()));
        when(recurringExpenseService.getSummary(user)).thenReturn(new ExpenseSummaryDto(
                3500f, "NET_AFTER_TAX", 2000f, 24000f, 1500f, 43f,
                List.of(), null, null, null, null, null, null, null));
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

    private void stubDataBase() {
        when(instrumentService.loadAllocationsForScore(any()))
                .thenReturn(new InstrumentService.AllocationsBundle(Map.of(), Map.of()));
        when(patrimoineTargetService.getTargets(user))
                .thenReturn(new PatrimoineTargetsDto(Map.of(), Map.of(), Map.of()));
        when(debtService.getSummary(user)).thenReturn(new DebtSummaryDto(
                0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, List.of()));
        when(recurringExpenseService.getSummary(user)).thenReturn(new ExpenseSummaryDto(
                null, "NONE", 0f, 0f, null, null, List.of(), null, null, null, null, null, null, null));
        when(portfolioSnapshotService.findAllByUser(user)).thenReturn(List.of());
    }

    private void stubDataMinimale() {
        stubDataBase();
        when(positionService.findAllByUser(eq(user), any(), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of());
    }

    private PositionDto buildPosition(String category, PositionComputedDto computed) {
        return buildPositionWithEnvelope(category, null, computed);
    }

    private PositionDto buildPositionWithEnvelope(String category, FiscalEnvelope envelope, PositionComputedDto computed) {
        return new PositionDto(null,
                com.myfinance.domain.AssetCategory.valueOf(category),
                null, category, "EUR", envelope, null, null,
                null, null, null, null, null, null, null, null, null,
                false, PositionStatus.ACTIVE, null, null, null, computed);
    }
}
