package com.myfinance.service;

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
import java.time.LocalDateTime;
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
    @Mock PatrimoineTargetRepository      targetRepo;
    @Mock LoginEventRepository            loginRepo;

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

    // ── Helpers ───────────────────────────────────────────────────────────────

    private PortfolioSnapshot snapshot(long total) {
        PortfolioSnapshot s = new PortfolioSnapshot();
        s.setTotalCurrentValueEur(BigDecimal.valueOf(total));
        return s;
    }
}
