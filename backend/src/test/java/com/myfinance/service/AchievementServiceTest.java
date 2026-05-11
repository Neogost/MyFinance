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
import org.springframework.test.util.ReflectionTestUtils;

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

    // ═══════════════════════════════════════════════════════════════════════════
    // Tests additionnels pour augmenter la couverture branch (cf. audit qualité)
    // ═══════════════════════════════════════════════════════════════════════════

    // ── API publique : runBatch ──────────────────────────────────────────────

    @Test
    void runBatch_schedulerDesactive_neFaitRien() {
        ReflectionTestUtils.setField(service, "schedulerEnabled", false);
        service.runBatch();
        verify(userRepository, never()).findAll();
    }

    @Test
    void runBatch_schedulerActive_evalueTousLesUtilisateurs() {
        ReflectionTestUtils.setField(service, "schedulerEnabled", true);
        User u1 = User.builder().id(10L).login("u1").role(RoleEnum.USER).build();
        User u2 = User.builder().id(11L).login("u2").role(RoleEnum.USER).build();
        when(userRepository.findAll()).thenReturn(List.of(u1, u2));
        when(catalog.all()).thenReturn(List.of());
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());

        service.runBatch();

        verify(userRepository).findAll();
        verify(snapshotRepo, atLeastOnce()).findByUserOrderBySnapshotDateDesc(any());
    }

    @Test
    void runBatch_uneEvaluationLeveExceptin_continueAvecLesAutresUtilisateurs() {
        ReflectionTestUtils.setField(service, "schedulerEnabled", true);
        User u1 = User.builder().id(20L).login("u1").role(RoleEnum.USER).build();
        User u2 = User.builder().id(21L).login("u2").role(RoleEnum.USER).build();
        when(userRepository.findAll()).thenReturn(List.of(u1, u2));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(u1)).thenThrow(new RuntimeException("DB error"));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(u2)).thenReturn(List.of());
        when(catalog.all()).thenReturn(List.of());

        // Ne doit pas lever — l'erreur sur u1 est attrapée
        assertThatNoException().isThrownBy(() -> service.runBatch());

        // u2 a quand même été évalué
        verify(snapshotRepo).findByUserOrderBySnapshotDateDesc(u2);
    }

    // ── API publique : countUnseen et markAllSeen ────────────────────────────

    @Test
    void countUnseen_sansLastSeen_compteToutLesConfirmes() {
        user.setLastAchievementSeenAt(null);
        when(achievementRepo.countByUserAndConfirmedAtIsNotNull(user)).thenReturn(7L);

        assertThat(service.countUnseen(user)).isEqualTo(7L);
    }

    @Test
    void countUnseen_avecLastSeen_compteUniquementCeuxPostérieurs() {
        LocalDateTime ref = LocalDateTime.of(2026, 1, 1, 12, 0);
        user.setLastAchievementSeenAt(ref);
        UserAchievement avant = UserAchievement.builder()
                .achievementCode(AchievementCode.PIONNIER).level(1)
                .confirmedAt(ref.minusDays(1)).build();
        UserAchievement apres1 = UserAchievement.builder()
                .achievementCode(AchievementCode.PHOTOGRAPHE).level(1)
                .confirmedAt(ref.plusDays(1)).build();
        UserAchievement apres2 = UserAchievement.builder()
                .achievementCode(AchievementCode.PHOTOGRAPHE).level(2)
                .confirmedAt(ref.plusDays(2)).build();
        when(achievementRepo.findByUserAndConfirmedAtIsNotNullOrderByConfirmedAtDesc(user))
                .thenReturn(List.of(apres2, apres1, avant));

        assertThat(service.countUnseen(user)).isEqualTo(2L);
    }

    @Test
    void markAllSeen_setLastAchievementSeenAtEtSauvegarde() {
        assertThat(user.getLastAchievementSeenAt()).isNull();
        when(userRepository.save(user)).thenReturn(user);

        service.markAllSeen(user);

        assertThat(user.getLastAchievementSeenAt()).isNotNull();
        verify(userRepository).save(user);
    }

    @Test
    void getConfirmedForUser_delegueAuRepository() {
        UserAchievement ua = UserAchievement.builder().achievementCode(AchievementCode.PIONNIER).level(1).build();
        when(achievementRepo.findByUserAndConfirmedAtIsNotNullOrderByConfirmedAtDesc(user))
                .thenReturn(List.of(ua));

        assertThat(service.getConfirmedForUser(user)).containsExactly(ua);
    }

    // ── evalSnapshotThreshold : 5 paliers, 3 snapshots requis ────────────────

    @Test
    void evalSnapshotThreshold_moinsDe3Snapshots_pasDeDeblocage() {
        AchievementDefinition def = paliers(AchievementCode.TO_THE_MOON,
                AchievementLevel.of(1, "Bronze", "🥉", 10_000),
                AchievementLevel.of(2, "Argent", "🥈", 50_000));
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(snapshotRepo.findTop3ByUserOrderBySnapshotDateDesc(user))
                .thenReturn(List.of(snapshot(100_000), snapshot(100_000)));  // 2 < 3

        List<UserAchievement> result = service.evaluateAndPersist(user);

        assertThat(result).isEmpty();
        verify(achievementRepo, never()).save(any());
    }

    @Test
    void evalSnapshotThreshold_3SnapshotsAuDessusDeArgent_debloqueBronzeEtArgent() {
        AchievementDefinition def = paliers(AchievementCode.TO_THE_MOON,
                AchievementLevel.of(1, "Bronze", "🥉", 10_000),
                AchievementLevel.of(2, "Argent", "🥈", 50_000),
                AchievementLevel.of(3, "Or", "🥇", 200_000));
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(snapshotRepo.findTop3ByUserOrderBySnapshotDateDesc(user))
                .thenReturn(List.of(snapshot(75_000), snapshot(60_000), snapshot(80_000)));
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);

        assertThat(result).hasSize(2);  // Bronze + Argent
    }

    @Test
    void evalSnapshotThreshold_seulementUnDes3SnapshotsAtteint_pasDeDeblocage() {
        AchievementDefinition def = paliers(AchievementCode.TO_THE_MOON,
                AchievementLevel.of(1, "Bronze", "🥉", 10_000));
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(snapshotRepo.findTop3ByUserOrderBySnapshotDateDesc(user))
                .thenReturn(List.of(snapshot(15_000), snapshot(5_000), snapshot(8_000)));

        List<UserAchievement> result = service.evaluateAndPersist(user);

        assertThat(result).isEmpty();
    }

    // ── evalLoginStreak / Quotidien ──────────────────────────────────────────

    @Test
    void evalLoginStreak_streakDe5JoursConsecutifs_debloqueArgent() {
        AchievementDefinition def = paliers(AchievementCode.QUOTIDIEN,
                AchievementLevel.of(1, "Bronze", "🥉", 3),
                AchievementLevel.of(2, "Argent", "🥈", 5),
                AchievementLevel.of(3, "Or", "🥇", 15));
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        LocalDate today = LocalDate.now();
        when(loginRepo.findSuccessfulByLoginOrderByTimestampDesc(user.getLogin()))
                .thenReturn(List.of(
                        loginAt(today),
                        loginAt(today.minusDays(1)),
                        loginAt(today.minusDays(2)),
                        loginAt(today.minusDays(3)),
                        loginAt(today.minusDays(4))));
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);

        assertThat(result).hasSize(2);  // Bronze + Argent
    }

    @Test
    void evalLoginStreak_aucunLogin_pasDeDeblocage() {
        AchievementDefinition def = paliers(AchievementCode.QUOTIDIEN,
                AchievementLevel.of(1, "Bronze", "🥉", 3));
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(loginRepo.findSuccessfulByLoginOrderByTimestampDesc(user.getLogin())).thenReturn(List.of());

        List<UserAchievement> result = service.evaluateAndPersist(user);

        assertThat(result).isEmpty();
    }

    // ── evalSnapshotCount / Photographe ──────────────────────────────────────

    @Test
    void evalSnapshotCount_aucunSnapshot_pasDeDeblocage() {
        AchievementDefinition def = paliers(AchievementCode.PHOTOGRAPHE,
                AchievementLevel.of(1, "Bronze", "🥉", 1));
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(snapshotRepo.countByUser(user)).thenReturn(0L);

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).isEmpty();
    }

    // ── evalLoanSimulations / Architecte ─────────────────────────────────────

    @Test
    void evalLoanSimulations_compteCorrectement() {
        AchievementDefinition def = paliers(AchievementCode.ARCHITECTE,
                AchievementLevel.of(1, "Bronze", "🥉", 1),
                AchievementLevel.of(2, "Argent", "🥈", 5));
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(loanRepo.countByUser(user)).thenReturn(3L);
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).hasSize(1);  // 3 ≥ 1 (Bronze) mais < 5 (Argent)
    }

    // ── Badges booléens immédiats ────────────────────────────────────────────

    @Test
    void evalPersonnaliste_existsTrue_debloque() {
        AchievementDefinition def = unique(AchievementCode.PERSONNALISTE);
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(targetRepo.existsByUser(user)).thenReturn(true);
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).hasSize(1);
    }

    @Test
    void evalProfilParfait_tousChampsRenseignes_debloque() {
        user.setFirstName("Jean");
        user.setLastName("Dupont");
        user.setBirthDate(LocalDate.of(1990, 1, 1));
        user.setFiscalParts(2f);
        user.setSafetyNetMode(SafetyNetMode.FIXED_AMOUNT);

        AchievementDefinition def = unique(AchievementCode.PROFIL_PARFAIT);
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).hasSize(1);
    }

    @Test
    void evalProfilParfait_unChampManquant_pasDeDeblocage() {
        user.setFirstName("Jean");
        user.setLastName("Dupont");
        user.setBirthDate(LocalDate.of(1990, 1, 1));
        // fiscalParts manquant
        user.setSafetyNetMode(SafetyNetMode.FIXED_AMOUNT);

        AchievementDefinition def = unique(AchievementCode.PROFIL_PARFAIT);
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).isEmpty();
    }

    @Test
    void evalTheAnswer_patrimoineProcheDe42000_debloque() {
        AchievementDefinition def = unique(AchievementCode.THE_ANSWER);
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(user)).thenReturn(List.of(snapshot(42_050)));
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).hasSize(1);
    }

    @Test
    void evalTheAnswer_patrimoineHorsZone_pasDeDeblocage() {
        AchievementDefinition def = unique(AchievementCode.THE_ANSWER);
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(user)).thenReturn(List.of(snapshot(50_000)));

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).isEmpty();
    }

    @Test
    void evalVampire_aDejaCliqueDarkMode_debloque() {
        AchievementDefinition def = unique(AchievementCode.VAMPIRE);
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(analyticsRepo.countByUserAndEventTypeAndEventNameLike(user, EventType.BUTTON_CLICK, "%dark_mode%"))
                .thenReturn(1L);
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).hasSize(1);
    }

    @Test
    void evalAnalyticsCount_compteurAvecPattern() {
        // GRAND_STRATEGE = events PAGE_VIEW sur tools.%
        AchievementDefinition def = paliers(AchievementCode.GRAND_STRATEGE,
                AchievementLevel.of(1, "Bronze", "🥉", 5));
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(analyticsRepo.countByUserAndEventTypeAndEventNameLike(user, EventType.PAGE_VIEW, "tools.%"))
                .thenReturn(10L);
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).hasSize(1);
    }

    // ── persistNewLevels : déjà niveau Bronze → ne re-persiste pas ───────────

    @Test
    void persistNewLevels_niveauBronzeDejaConfirme_neReSauvegardePas() {
        AchievementDefinition def = paliers(AchievementCode.PHOTOGRAPHE,
                AchievementLevel.of(1, "Bronze", "🥉", 1),
                AchievementLevel.of(2, "Argent", "🥈", 6));
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(snapshotRepo.countByUser(user)).thenReturn(8L);  // → Argent (niveau 2)
        when(achievementRepo.findMaxConfirmedLevel(user, AchievementCode.PHOTOGRAPHE))
                .thenReturn(Optional.of(1));  // Bronze déjà confirmé
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);

        // Seul Argent (niveau 2) est persisté — Bronze déjà fait
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getLevel()).isEqualTo(2);
    }

    // ── updatePatrimoineTracking : ATH et patrimoine initial ─────────────────

    @Test
    void updatePatrimoineTracking_setAllTimeHigh_siInexistant() {
        AchievementDefinition def = unique(AchievementCode.PIONNIER);
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(user))
                .thenReturn(List.of(snapshot(100_000), snapshot(50_000)));
        when(positionRepo.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of());

        // user n'a ni ATH ni patrimoine initial — les deux doivent être set
        assertThat(user.getAllTimeHighEur()).isNull();
        assertThat(user.getInitialNetWorthEur()).isNull();

        service.evaluateAndPersist(user);

        assertThat(user.getAllTimeHighEur()).isEqualByComparingTo("100000");
        assertThat(user.getInitialNetWorthEur()).isEqualByComparingTo("50000");  // dernier de la liste (DESC → plus ancien)
        verify(userRepository).save(user);
    }

    @Test
    void updatePatrimoineTracking_athSuperieur_metAJour() {
        user.setAllTimeHighEur(new BigDecimal("80000"));
        user.setInitialNetWorthEur(new BigDecimal("30000"));
        AchievementDefinition def = unique(AchievementCode.PIONNIER);
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(user))
                .thenReturn(List.of(snapshot(120_000)));
        when(positionRepo.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of());

        service.evaluateAndPersist(user);

        assertThat(user.getAllTimeHighEur()).isEqualByComparingTo("120000");  // remonté
        assertThat(user.getInitialNetWorthEur()).isEqualByComparingTo("30000");  // inchangé
    }

    @Test
    void updatePatrimoineTracking_athInferieur_neBougePas() {
        user.setAllTimeHighEur(new BigDecimal("100000"));
        user.setInitialNetWorthEur(new BigDecimal("30000"));
        AchievementDefinition def = unique(AchievementCode.PIONNIER);
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(user))
                .thenReturn(List.of(snapshot(50_000)));
        when(positionRepo.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of());

        service.evaluateAndPersist(user);

        assertThat(user.getAllTimeHighEur()).isEqualByComparingTo("100000");  // pas régressé
        verify(userRepository, never()).save(user);  // rien à sauvegarder
    }

    // ── evaluateSingle : exception attrapée silencieusement ──────────────────

    @Test
    void evaluateSingle_exceptionInterne_estLogueeMaisNeFaitPasEchouerLeBatch() {
        AchievementDefinition def = unique(AchievementCode.PIONNIER);
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(positionRepo.findByUserOrderByCreatedAtDesc(user))
                .thenThrow(new RuntimeException("DB unavailable"));

        // L'exception est attrapée par le try/catch interne, résultat vide mais pas d'exception
        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).isEmpty();
    }

    // ── evalCollectionneur ───────────────────────────────────────────────────

    @Test
    void evalCollectionneur_compteTousLesBadgesDejaConfirmes() {
        AchievementDefinition def = paliers(AchievementCode.LE_COLLECTIONNEUR,
                AchievementLevel.of(1, "Bronze", "🥉", 5),
                AchievementLevel.of(2, "Argent", "🥈", 15));
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(achievementRepo.countByUserAndConfirmedAtIsNotNull(user)).thenReturn(20L);
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).hasSize(2);  // Bronze + Argent
    }

    // ── evalMultiSources ─────────────────────────────────────────────────────

    @Test
    void evalMultiSources_troisTypesDistincts_debloque() {
        AchievementDefinition def = unique(AchievementCode.MULTI_SOURCES);
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(otherIncomeRepo.findByUserOrderByDateDesc(user)).thenReturn(List.of(
                OtherIncome.builder().type(OtherIncomeTypeEnum.LOCATIF).amount(800f).build(),
                OtherIncome.builder().type(OtherIncomeTypeEnum.DIVIDENDE).amount(200f).build(),
                OtherIncome.builder().type(OtherIncomeTypeEnum.AIDE_SOCIALE).amount(100f).build()));
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).hasSize(1);
    }

    @Test
    void evalMultiSources_seulementDeuxTypes_pasDeDeblocage() {
        AchievementDefinition def = unique(AchievementCode.MULTI_SOURCES);
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(otherIncomeRepo.findByUserOrderByDateDesc(user)).thenReturn(List.of(
                OtherIncome.builder().type(OtherIncomeTypeEnum.LOCATIF).amount(800f).build(),
                OtherIncome.builder().type(OtherIncomeTypeEnum.DIVIDENDE).amount(200f).build()));

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).isEmpty();
    }

    // ── evalEncyclopediste ───────────────────────────────────────────────────

    @Test
    void evalEncyclopediste_compteCodesDistincts() {
        AchievementDefinition def = paliers(AchievementCode.L_ENCYCLOPEDISTE,
                AchievementLevel.of(1, "Bronze", "🥉", 2));
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(achievementRepo.findByUserAndConfirmedAtIsNotNullOrderByConfirmedAtDesc(user))
                .thenReturn(List.of(
                        UserAchievement.builder().achievementCode(AchievementCode.PIONNIER).level(1).build(),
                        UserAchievement.builder().achievementCode(AchievementCode.PHOTOGRAPHE).level(1).build(),
                        UserAchievement.builder().achievementCode(AchievementCode.PHOTOGRAPHE).level(2).build()));
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).hasSize(1);  // 2 codes distincts (PIONNIER + PHOTOGRAPHE) = Bronze
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Lot 2 — eval méthodes restantes (positions, devises, immo, dettes, FIRE…)
    // ═══════════════════════════════════════════════════════════════════════════

    // ── evalToucheATout : nb catégories distinctes avec position active ─────

    @Test
    void evalToucheATout_3CategoriesDistinctes_debloque() {
        AchievementDefinition def = paliers(AchievementCode.TOUCHE_A_TOUT,
                AchievementLevel.of(1, "Bronze", "🥉", 3));
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(positionRepo.findByUserAndStatusOrderByCreatedAtDesc(user, PositionStatus.ACTIVE))
                .thenReturn(List.of(
                        Position.builder().category(AssetCategory.BOURSE).build(),
                        Position.builder().category(AssetCategory.CRYPTO).build(),
                        Position.builder().category(AssetCategory.LIVRET).build()));
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).hasSize(1);
    }

    // ── evalAnciennete : ancienneté depuis 1er login ─────────────────────────

    @Test
    void evalAnciennete_loginPlusDe2Ans_debloque() {
        AchievementDefinition def = paliers(AchievementCode.HABITUE,
                AchievementLevel.of(1, "Bronze", "🥉", 1),
                AchievementLevel.of(2, "Argent", "🥈", 2));
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(loginRepo.findSuccessfulByLoginOrderByTimestampDesc(user.getLogin()))
                .thenReturn(List.of(
                        loginAt(LocalDate.now()),
                        loginAt(LocalDate.now().minusYears(3))));  // oldest = 3 ans
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).hasSize(2);  // Bronze + Argent
    }

    @Test
    void evalAnciennete_aucunLogin_pasDeDeblocage() {
        AchievementDefinition def = paliers(AchievementCode.HABITUE,
                AchievementLevel.of(1, "Bronze", "🥉", 1));
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(loginRepo.findSuccessfulByLoginOrderByTimestampDesc(user.getLogin())).thenReturn(List.of());

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).isEmpty();
    }

    // ── evalCosmopolite : devises non-EUR ────────────────────────────────────

    @Test
    void evalCosmopolite_devisesEtrangeresDistinctes() {
        AchievementDefinition def = paliers(AchievementCode.LE_COSMOPOLITE,
                AchievementLevel.of(1, "Bronze", "🥉", 2));
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(positionRepo.findByUserAndStatusOrderByCreatedAtDesc(user, PositionStatus.ACTIVE))
                .thenReturn(List.of(
                        Position.builder().instrument(Instrument.builder().currency("USD").build()).build(),
                        Position.builder().instrument(Instrument.builder().currency("GBP").build()).build(),
                        Position.builder().instrument(Instrument.builder().currency("EUR").build()).build()));
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).hasSize(1);  // 2 devises non-EUR
    }

    // ── evalEnveloppePresence : présence d'une enveloppe fiscale ─────────────

    @Test
    void evalEnveloppePresence_aUnePerActive_debloque() {
        AchievementDefinition def = unique(AchievementCode.LE_PREVOYANT);
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(positionRepo.findByUserAndStatusOrderByCreatedAtDesc(user, PositionStatus.ACTIVE))
                .thenReturn(List.of(Position.builder().fiscalEnvelope(FiscalEnvelope.PER).build()));
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).hasSize(1);
    }

    // ── evalRoyalFlush : 4 enveloppes simultanées ────────────────────────────

    @Test
    void evalRoyalFlush_les4EnveloppesPresentes_debloque() {
        AchievementDefinition def = unique(AchievementCode.LE_ROYAL_FLUSH);
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(positionRepo.findByUserAndStatusOrderByCreatedAtDesc(user, PositionStatus.ACTIVE))
                .thenReturn(List.of(
                        Position.builder().fiscalEnvelope(FiscalEnvelope.PEA).build(),
                        Position.builder().fiscalEnvelope(FiscalEnvelope.AV).build(),
                        Position.builder().fiscalEnvelope(FiscalEnvelope.PER).build(),
                        Position.builder().fiscalEnvelope(FiscalEnvelope.CTO).build()));
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).hasSize(1);
    }

    @Test
    void evalRoyalFlush_3EnveloppesSur4_pasDeDeblocage() {
        AchievementDefinition def = unique(AchievementCode.LE_ROYAL_FLUSH);
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(positionRepo.findByUserAndStatusOrderByCreatedAtDesc(user, PositionStatus.ACTIVE))
                .thenReturn(List.of(
                        Position.builder().fiscalEnvelope(FiscalEnvelope.PEA).build(),
                        Position.builder().fiscalEnvelope(FiscalEnvelope.AV).build(),
                        Position.builder().fiscalEnvelope(FiscalEnvelope.PER).build()));  // CTO manquant

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).isEmpty();
    }

    // ── evalMultiProprietaire : nb IMMO_PHYSIQUE actives ─────────────────────

    @Test
    void evalMultiProprietaire_deuxImmoActives_debloqueArgent() {
        AchievementDefinition def = paliers(AchievementCode.MULTI_PROPRIETAIRE,
                AchievementLevel.of(1, "Bronze", "🥉", 1),
                AchievementLevel.of(2, "Argent", "🥈", 2));
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(positionRepo.findByUserAndCategoryAndStatusOrderByCreatedAtDesc(
                user, AssetCategory.IMMO_PHYSIQUE, PositionStatus.ACTIVE))
                .thenReturn(List.of(new Position(), new Position()));
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).hasSize(2);  // Bronze + Argent
    }

    // ── evalCategoryPresence : présence d'au moins 1 position IMMO_PHYSIQUE ──

    @Test
    void evalCategoryPresence_premierToit_uneImmoActive_debloque() {
        AchievementDefinition def = unique(AchievementCode.PREMIER_TOIT);
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(positionRepo.findByUserAndCategoryAndStatusOrderByCreatedAtDesc(
                user, AssetCategory.IMMO_PHYSIQUE, PositionStatus.ACTIVE))
                .thenReturn(List.of(new Position()));
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).hasSize(1);
    }

    // ── evalDiversificateurCrypto : nb cryptos distinctes ────────────────────

    @Test
    void evalDiversificateurCrypto_troisCryptosDistinctes_debloque() {
        AchievementDefinition def = paliers(AchievementCode.LE_DIVERSIFICATEUR,
                AchievementLevel.of(1, "Bronze", "🥉", 3));
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        Instrument btc = Instrument.builder().id(1L).build();
        Instrument eth = Instrument.builder().id(2L).build();
        Instrument sol = Instrument.builder().id(3L).build();
        when(positionRepo.findByUserAndCategoryAndStatusOrderByCreatedAtDesc(
                user, AssetCategory.CRYPTO, PositionStatus.ACTIVE))
                .thenReturn(List.of(
                        Position.builder().instrument(btc).build(),
                        Position.builder().instrument(eth).build(),
                        Position.builder().instrument(sol).build()));
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).hasSize(1);
    }

    // ── evalPremierRemboursement : dette à 0 ─────────────────────────────────

    @Test
    void evalPremierRemboursement_uneDetteAvecCapitalAZero_debloque() {
        AchievementDefinition def = unique(AchievementCode.PREMIER_REMBOURSEMENT);
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(debtRepo.findByUserOrderByTypeAscLabelAsc(user)).thenReturn(List.of(
                Debt.builder().remainingCapitalOverride(BigDecimal.ZERO).build()));
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).hasSize(1);
    }

    // ── evalLibertéConquise : aucune dette + au moins 1 snapshot ─────────────

    @Test
    void evalLiberteConquise_aucuneDetteAvecSnapshot_debloque() {
        AchievementDefinition def = unique(AchievementCode.LIBERTE_CONQUISE);
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of(snapshot(50_000)));
        when(debtRepo.findByUserOrderByTypeAscLabelAsc(user)).thenReturn(List.of());
        when(snapshotRepo.countByUser(user)).thenReturn(5L);
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).hasSize(1);
    }

    @Test
    void evalLiberteConquise_aUneDette_pasDeDeblocage() {
        AchievementDefinition def = unique(AchievementCode.LIBERTE_CONQUISE);
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(debtRepo.findByUserOrderByTypeAscLabelAsc(user))
                .thenReturn(List.of(Debt.builder().build()));

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).isEmpty();
    }

    // ── evalLordDuManoir : IMMO_PHYSIQUE + dette immobilier ──────────────────

    @Test
    void evalLordDuManoir_immoEtDetteImmo_debloque() {
        AchievementDefinition def = unique(AchievementCode.LORD_DU_MANOIR);
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(positionRepo.findByUserAndCategoryAndStatusOrderByCreatedAtDesc(
                user, AssetCategory.IMMO_PHYSIQUE, PositionStatus.ACTIVE))
                .thenReturn(List.of(new Position()));
        when(debtRepo.findByUserOrderByTypeAscLabelAsc(user))
                .thenReturn(List.of(Debt.builder().type(DebtTypeEnum.IMMOBILIER).build()));
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).hasSize(1);
    }

    // ── evalPayslipStreak : mois consécutifs de bulletins ────────────────────

    @Test
    void evalPayslipStreak_troisMoisConsecutifs_debloque() {
        AchievementDefinition def = paliers(AchievementCode.COMPTABLE_METICULEUX,
                AchievementLevel.of(1, "Bronze", "🥉", 3));
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        java.time.YearMonth current = java.time.YearMonth.now();
        when(paySlipRepo.findByContractUserOrderByPeriodAsc(user))
                .thenReturn(List.of(
                        MonthlyPaySlip.builder().period(current.atDay(1)).build(),
                        MonthlyPaySlip.builder().period(current.minusMonths(1).atDay(1)).build(),
                        MonthlyPaySlip.builder().period(current.minusMonths(2).atDay(1)).build()));
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).hasSize(1);
    }

    // ── evalAvVeteran : AV ouverte depuis >8 ans ─────────────────────────────

    @Test
    void evalAvVeteran_aUneAvAncienne_debloque() {
        AchievementDefinition def = unique(AchievementCode.AV_VETERAN);
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(positionRepo.findByUserAndStatusOrderByCreatedAtDesc(user, PositionStatus.ACTIVE))
                .thenReturn(List.of(Position.builder()
                        .fiscalEnvelope(FiscalEnvelope.AV)
                        .createdAt(java.time.LocalDateTime.now().minusYears(10))
                        .build()));
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).hasSize(1);
    }

    @Test
    void evalAvVeteran_avRecente_pasDeDeblocage() {
        AchievementDefinition def = unique(AchievementCode.AV_VETERAN);
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(positionRepo.findByUserAndStatusOrderByCreatedAtDesc(user, PositionStatus.ACTIVE))
                .thenReturn(List.of(Position.builder()
                        .fiscalEnvelope(FiscalEnvelope.AV)
                        .createdAt(java.time.LocalDateTime.now().minusYears(3))
                        .build()));

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).isEmpty();
    }

    // ── evalVeteranPosition : position >10 ans ───────────────────────────────

    @Test
    void evalVeteranPosition_positionAnciennePlus10Ans_debloque() {
        AchievementDefinition def = unique(AchievementCode.LE_VETERAN);
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(positionRepo.findByUserAndStatusOrderByCreatedAtDesc(user, PositionStatus.ACTIVE))
                .thenReturn(List.of(Position.builder()
                        .createdAt(java.time.LocalDateTime.now().minusYears(12))
                        .build()));
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).hasSize(1);
    }

    // ── evalSortieRouge : initialNetWorth <1000 + current ≥10000 ─────────────

    @Test
    void evalSortieRouge_partantDeMoins1000VersPlus10000_debloque() {
        user.setInitialNetWorthEur(new BigDecimal("500"));
        AchievementDefinition def = unique(AchievementCode.SORTIE_DU_ROUGE);
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(user))
                .thenReturn(List.of(snapshot(15_000)));
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).hasSize(1);
    }

    @Test
    void evalSortieRouge_initialNetWorthSuperieurA1000_pasDeDeblocage() {
        user.setInitialNetWorthEur(new BigDecimal("5000"));
        AchievementDefinition def = unique(AchievementCode.SORTIE_DU_ROUGE);
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(user))
                .thenReturn(List.of(snapshot(50_000)));

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).isEmpty();
    }

    // ── evalFireMultiple : patrimoine ≥ N × annualExpenses ───────────────────

    @Test
    void evalFireMultiple_leanFire12x_atteint_debloque() {
        AchievementDefinition def = unique(AchievementCode.LEAN_FIRE);
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(snapshotRepo.findTop3ByUserOrderBySnapshotDateDesc(user))
                .thenReturn(List.of(snapshot(500_000), snapshot(490_000), snapshot(480_000)));
        // Dépenses mensuelles : 3000 → annuel 36k × 12 = 432k → atteint avec 500k
        when(expenseRepo.findByUserOrderByCategoryAscLabelAsc(user))
                .thenReturn(List.of(
                        RecurringExpense.builder().amount(3000f).frequency(FrequencyEnum.MONTHLY).build()));
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).hasSize(1);
    }

    @Test
    void evalFireMultiple_aucuneDepense_pasDeDeblocage() {
        AchievementDefinition def = unique(AchievementCode.LEAN_FIRE);
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(snapshotRepo.findTop3ByUserOrderBySnapshotDateDesc(user))
                .thenReturn(List.of(snapshot(500_000), snapshot(490_000), snapshot(480_000)));
        when(expenseRepo.findByUserOrderByCategoryAscLabelAsc(user)).thenReturn(List.of());

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).isEmpty();
    }

    // ── evalFreeAtLast : passive ≥ monthly expenses ──────────────────────────

    @Test
    void evalFreeAtLast_revenusPassifsCouvrentDepenses_debloque() {
        AchievementDefinition def = unique(AchievementCode.FREE_AT_LAST);
        when(catalog.all()).thenReturn(List.of(def));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(otherIncomeRepo.findByUserOrderByDateDesc(user)).thenReturn(List.of(
                OtherIncome.builder().type(OtherIncomeTypeEnum.LOCATIF).amount(2000f).build(),
                OtherIncome.builder().type(OtherIncomeTypeEnum.DIVIDENDE).amount(500f).build()));
        when(expenseRepo.findByUserOrderByCategoryAscLabelAsc(user))
                .thenReturn(List.of(
                        RecurringExpense.builder().amount(2000f).frequency(FrequencyEnum.MONTHLY).build()));
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);
        assertThat(result).hasSize(1);
    }

    // ── evalChasseur : tous les badges secrets confirmés ─────────────────────

    @Test
    void evalChasseur_tousBadgesSecretsConfirmes_debloque() {
        AchievementDefinition secret1 = new AchievementDefinition(
                AchievementCode.THE_ANSWER, "🎯", "Secret 1", "desc",
                AchievementSensitivity.NULLE, true, List.of(AchievementLevel.unique()));
        AchievementDefinition chasseur = unique(AchievementCode.LE_CHASSEUR);
        when(catalog.all()).thenReturn(List.of(secret1, chasseur));
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(any())).thenReturn(List.of());
        when(snapshotRepo.findByUserOrderBySnapshotDateDesc(user)).thenReturn(List.of(snapshot(42_000)));
        when(achievementRepo.findByUserAndConfirmedAtIsNotNullOrderByConfirmedAtDesc(user))
                .thenReturn(List.of(
                        UserAchievement.builder().achievementCode(AchievementCode.THE_ANSWER).level(1).build()));
        when(achievementRepo.findMaxConfirmedLevel(any(), any())).thenReturn(Optional.of(0));
        when(achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(any(), any(), anyInt())).thenReturn(false);
        when(achievementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<UserAchievement> result = service.evaluateAndPersist(user);
        // Le chasseur + the answer débloqués (THE_ANSWER l'est aussi car snapshot proche de 42000)
        assertThat(result.stream().map(UserAchievement::getAchievementCode))
                .contains(AchievementCode.LE_CHASSEUR);
    }

    // ── Helpers tests ────────────────────────────────────────────────────────

    private AchievementDefinition unique(AchievementCode code) {
        return new AchievementDefinition(code, "🌟", code.name(), "desc",
                AchievementSensitivity.NULLE, false, List.of(AchievementLevel.unique()));
    }

    private AchievementDefinition paliers(AchievementCode code, AchievementLevel... levels) {
        return new AchievementDefinition(code, "🌟", code.name(), "desc",
                AchievementSensitivity.FAIBLE, false, List.of(levels));
    }

    private LoginEvent loginAt(LocalDate date) {
        return LoginEvent.builder()
                .timestamp(date.atTime(12, 0))
                .build();
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
