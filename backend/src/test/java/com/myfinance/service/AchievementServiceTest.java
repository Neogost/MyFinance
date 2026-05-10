package com.myfinance.service;

import com.myfinance.config.PatrimoineReferentiel;
import com.myfinance.domain.*;
import com.myfinance.repository.*;
import com.myfinance.service.achievement.*;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AchievementServiceTest {

    @Mock AchievementCatalog              catalog;
    @Mock UserAchievementRepository       achievementRepo;
    @Mock UserRepository                  userRepository;
    @Mock PortfolioSnapshotRepository     snapshotRepo;
    @Mock PositionRepository              positionRepo;
    @Mock InstrumentAllocationRepository  allocationRepo;
    @Mock PatrimoineScoreService          scoreService;
    @Mock MonthlyPaySlipRepository        paySlipRepo;
    @Mock PositionOrderRepository         orderRepo;
    @Mock AnalyticsEventRepository        analyticsRepo;
    @Mock LoanSimulationRepository        loanRepo;
    @Mock SalaryContractRepository        salaryRepo;
    @Mock OtherIncomeRepository           otherIncomeRepo;
    @Mock PatrimoineTargetRepository           targetRepo;
    @Mock LoginEventRepository                 loginRepo;
    @Mock RecurringExpenseRepository           expenseRepo;
    @Mock DebtRepository                       debtRepo;
    @Mock DebtService                          debtService;
    @Mock InstrumentSectorAllocationRepository sectorAllocationRepo;
    @Mock PatrimoineReferentiel                referentiel;

    @InjectMocks AchievementService service;

    User user;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).login("test").role(RoleEnum.USER).build();
    }

    // ── evaluateAndPersist ─────────────────────────────────────────────────────

    @Test
    void evaluateAndPersist_pionnier_debloqueSiPositionExiste() {
        AchievementDefinition def = new AchievementDefinition(
                AchievementCode.PIONNIER, "🌟", "Le Pionnier", "desc",
                AchievementSensitivity.NULLE, false,
                List.of(AchievementLevel.unique()));
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(positionRepo.findByUserOrderByCreatedAtDesc(user))
                .thenReturn(List.of(new Position()));
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt()))
                .thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getAchievementCode()).isEqualTo(AchievementCode.PIONNIER);
        verify(achievementRepo).save(argThat(a -> a.getLevel() == 1 && a.getConfirmedAt() != null));
    }

    @Test
    void evaluateAndPersist_pionnier_aucunePositionPasDeDeblocage() {
        AchievementDefinition def = new AchievementDefinition(
                AchievementCode.PIONNIER, "🌟", "Le Pionnier", "desc",
                AchievementSensitivity.NULLE, false,
                List.of(AchievementLevel.unique()));
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(positionRepo.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of());

        List<UserAchievement> result = service.evaluateAndPersist(user);

        assertThat(result).isEmpty();
        verify(achievementRepo, never()).save(any());
    }

    @Test
    void evaluateAndPersist_photographe_niveauCorrectSelonNbSnapshots() {
        AchievementDefinition def = new AchievementDefinition(
                AchievementCode.PHOTOGRAPHE, "📸", "Le Photographe", "desc",
                AchievementSensitivity.FAIBLE, false,
                List.of(AchievementLevel.of(1,"Bronze","🥉",1),
                        AchievementLevel.of(2,"Argent","🥈",6),
                        AchievementLevel.of(3,"Or","🥇",24)));
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(snapshotRepo.countByUser(user)).thenReturn(8L);
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt()))
                .thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);

        // 8 snapshots → palier 2 (≥6), persistance des niveaux 1 et 2
        assertThat(result).hasSize(2);
    }

    @Test
    void evaluateAndPersist_toTheMoon_pasAssezDeSnapshots_pasDeDeblocage() {
        AchievementDefinition def = new AchievementDefinition(
                AchievementCode.TO_THE_MOON, "🚀", "To The Moon", "desc",
                AchievementSensitivity.FORTE, false,
                List.of(AchievementLevel.of(1,"Bronze","🥉",50_000)));
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        // Seulement 2 snapshots (< 3 requis)
        when(snapshotRepo.findTop3ByUserOrderBySnapshotDateDesc(user))
                .thenReturn(List.of(snapshot(60_000), snapshot(55_000)));

        List<UserAchievement> result = service.evaluateAndPersist(user);

        assertThat(result).isEmpty();
    }

    @Test
    void evaluateAndPersist_toTheMoon_3SnapshotsAuDessus_debloque() {
        AchievementDefinition def = new AchievementDefinition(
                AchievementCode.TO_THE_MOON, "🚀", "To The Moon", "desc",
                AchievementSensitivity.FORTE, false,
                List.of(AchievementLevel.of(1,"Bronze","🥉",50_000)));
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(snapshotRepo.findTop3ByUserOrderBySnapshotDateDesc(user))
                .thenReturn(List.of(snapshot(60_000), snapshot(55_000), snapshot(51_000)));
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt()))
                .thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getAchievementCode()).isEqualTo(AchievementCode.TO_THE_MOON);
    }

    // ── getConfirmedForUser ───────────────────────────────────────────────────

    @Test
    void getConfirmedForUser_delegueAuRepo() {
        UserAchievement ua = UserAchievement.builder()
                .achievementCode(AchievementCode.PIONNIER).level(1)
                .confirmedAt(LocalDateTime.now()).build();
        when(achievementRepo.findByUserAndConfirmedAtIsNotNullOrderByConfirmedAtDesc(user))
                .thenReturn(List.of(ua));

        List<UserAchievement> result = service.getConfirmedForUser(user);

        assertThat(result).hasSize(1);
    }

    // ── V2 Plus lourd ─────────────────────────────────────────────────────────

    @Test
    void evalBullRun_performancePositive_debloqueBronze() {
        AchievementDefinition def = new AchievementDefinition(
                AchievementCode.BULL_RUN, "🐂", "Bull Run", "desc",
                AchievementSensitivity.FAIBLE, false,
                List.of(AchievementLevel.of(1, "Bronze", "🥉", 10)));
        when(catalog.all()).thenReturn(List.of(def));
        LocalDate jan1 = LocalDate.of(LocalDate.now().getYear(), 1, 1);
        PortfolioSnapshot current  = snapshotWithCategory(12_000, AssetCategory.BOURSE, LocalDate.now());
        PortfolioSnapshot baseline = snapshotWithCategory(10_000, AssetCategory.BOURSE, jan1);
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(user)).thenReturn(List.of(current, baseline));
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getAchievementCode()).isEqualTo(AchievementCode.BULL_RUN);
    }

    @Test
    void evalDiamondHands_positionAncienneDe2Ans_debloqueBronze() {
        AchievementDefinition def = new AchievementDefinition(
                AchievementCode.DIAMOND_HANDS, "💎", "Diamond Hands", "desc",
                AchievementSensitivity.FAIBLE, false,
                List.of(AchievementLevel.of(1, "Bronze", "🥉", 1),
                        AchievementLevel.of(2, "Or", "🥇", 3)));
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        Position pos = Position.builder()
                .category(AssetCategory.BOURSE)
                .createdAt(LocalDateTime.now().minusYears(2))
                .status(PositionStatus.ACTIVE)
                .build();
        when(positionRepo.findByUserAndStatusOrderByCreatedAtDesc(user, PositionStatus.ACTIVE))
                .thenReturn(List.of(pos));
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getLevel()).isEqualTo(1); // 2 ans → Bronze, pas encore Or (3 ans)
    }

    @Test
    void evalSangFroid_repliSansVente_debloque() {
        AchievementDefinition def = new AchievementDefinition(
                AchievementCode.LE_SANG_FROID, "❄", "Le Sang-Froid", "desc",
                AchievementSensitivity.FAIBLE, false,
                List.of(AchievementLevel.unique()));
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        PortfolioSnapshot s1 = snapshotWithCategory(10_000, AssetCategory.BOURSE, LocalDate.now().minusMonths(1));
        PortfolioSnapshot s2 = snapshotWithCategory(8_000, AssetCategory.BOURSE, LocalDate.now()); // -20%
        when(snapshotRepo.findByUserWithPositionsOrderBySnapshotDateAsc(user)).thenReturn(List.of(s1, s2));
        when(orderRepo.existsByPositionUserAndOrderTypeAndOrderDateBetween(any(), any(), any(), any())).thenReturn(false);
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getAchievementCode()).isEqualTo(AchievementCode.LE_SANG_FROID);
    }

    @Test
    void evalRebalancer_venteEtAchatCategoriesDifferentes_debloque() {
        AchievementDefinition def = new AchievementDefinition(
                AchievementCode.LE_REBALANCER, "🎯", "Le Rebalancer", "desc",
                AchievementSensitivity.FAIBLE, false,
                List.of(AchievementLevel.unique()));
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        Position posBourse = Position.builder().category(AssetCategory.BOURSE).build();
        Position posCrypto = Position.builder().category(AssetCategory.CRYPTO).build();
        PositionOrder sell = PositionOrder.builder()
                .orderType(OrderType.SELL).orderDate(LocalDate.now().minusDays(3)).position(posBourse).build();
        PositionOrder buy = PositionOrder.builder()
                .orderType(OrderType.BUY).orderDate(LocalDate.now()).position(posCrypto).build();
        when(orderRepo.findByPositionUserWithPositionOrderByOrderDateAsc(user)).thenReturn(List.of(sell, buy));
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getAchievementCode()).isEqualTo(AchievementCode.LE_REBALANCER);
    }

    @Test
    void evalAscension_decileElevePourAge_debloqueBronze() {
        AchievementDefinition def = new AchievementDefinition(
                AchievementCode.L_ASCENSION, "📊", "L'Ascension", "desc",
                AchievementSensitivity.FAIBLE, false,
                List.of(AchievementLevel.of(1, "Bronze", "🥉", 5),
                        AchievementLevel.of(2, "Argent", "🥈", 7)));
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        user.setBirthDate(LocalDate.now().minusYears(35));
        PortfolioSnapshot snap = snapshot(80_000);
        when(snapshotRepo.findTop3ByUserOrderBySnapshotDateDesc(user)).thenReturn(List.of(snap));
        PatrimoineReferentiel.Tranche tranche = new PatrimoineReferentiel.Tranche();
        tranche.setAgeMin(30); tranche.setAgeMax(39);
        tranche.setD1(1_000); tranche.setD2(5_000); tranche.setD3(20_000); tranche.setD4(50_000);
        tranche.setD5(100_000); tranche.setD6(160_000); tranche.setD7(250_000); tranche.setD8(400_000);
        tranche.setD9(700_000);
        when(referentiel.getTranches()).thenReturn(List.of(tranche));
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);

        // 80_000 < D5 (100_000) → rang 5 → Bronze (≥5), pas Argent (≥7)
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getAchievementCode()).isEqualTo(AchievementCode.L_ASCENSION);
        assertThat(result.get(0).getLevel()).isEqualTo(1);
    }

    @Test
    void evalDisciple_tauxEpargneEleve_debloqueDiamant() {
        AchievementDefinition def = new AchievementDefinition(
                AchievementCode.LE_DISCIPLE, "💪", "Le Disciple", "desc",
                AchievementSensitivity.FAIBLE, false,
                List.of(AchievementLevel.of(1, "Bronze", "🥉", 30),
                        AchievementLevel.of(2, "Or", "🥇", 50),
                        AchievementLevel.of(3, "Diamant", "💎", 70)));
        when(catalog.all()).thenReturn(List.of(def));
        // Snapshot actuel 100k€, snapshot 12 mois avant 40k€ → delta = 60k€
        PortfolioSnapshot current  = snapshotWithDate(100_000, LocalDate.now());
        PortfolioSnapshot baseline = snapshotWithDate(40_000, LocalDate.now().minusMonths(13));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(user)).thenReturn(List.of(current, baseline));
        // Salaire brut annuel 40k€ → net mensuel ≈ 2_400€ → 13 mois × 2_400 = 31_200€
        // Taux = 60_000 / 31_200 × 100 ≈ 192% → Diamant
        SalaryContract contract = SalaryContract.builder()
                .annualGrossSalary(40_000f).build();
        when(salaryRepo.findByUserAndEndDateIsNull(user)).thenReturn(Optional.of(contract));
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);

        assertThat(result).hasSize(3); // niveaux 1, 2 et 3 débloqués simultanément
        assertThat(result.stream().map(UserAchievement::getAchievementCode).distinct().toList())
                .containsOnly(AchievementCode.LE_DISCIPLE);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private PortfolioSnapshot snapshot(long total) {
        PortfolioSnapshot s = new PortfolioSnapshot();
        s.setTotalCurrentValueEur(BigDecimal.valueOf(total));
        return s;
    }

    private PortfolioSnapshot snapshotWithDate(long total, LocalDate date) {
        return PortfolioSnapshot.builder()
                .snapshotDate(date)
                .totalCurrentValueEur(BigDecimal.valueOf(total))
                .build();
    }

    private PortfolioSnapshot snapshotWithCategory(long catValue, AssetCategory cat, LocalDate date) {
        Position pos = Position.builder().category(cat).build();
        PositionSnapshot ps = PositionSnapshot.builder()
                .position(pos)
                .currentValueEur(BigDecimal.valueOf(catValue))
                .build();
        return PortfolioSnapshot.builder()
                .snapshotDate(date)
                .totalCurrentValueEur(BigDecimal.valueOf(catValue))
                .positionSnapshots(new ArrayList<>(List.of(ps)))
                .build();
    }
}
