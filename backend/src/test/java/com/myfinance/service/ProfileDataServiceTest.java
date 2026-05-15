package com.myfinance.service;

import com.myfinance.domain.*;
import com.myfinance.dto.DataSummaryDto;
import com.myfinance.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProfileDataServiceTest {

    @Mock SalaryContractRepository salaryContractRepository;
    @Mock OtherIncomeRepository otherIncomeRepository;
    @Mock RecurringExpenseRepository recurringExpenseRepository;
    @Mock PositionRepository positionRepository;
    @Mock PortfolioSnapshotRepository portfolioSnapshotRepository;
    @Mock DebtRepository debtRepository;
    @Mock DebtBalanceEntryRepository debtBalanceEntryRepository;
    @Mock PossessionRepository possessionRepository;
    @Mock PatrimoineTargetRepository patrimoineTargetRepository;
    @Mock LoanSimulationRepository loanSimulationRepository;
    @Mock UserBudgetRepository userBudgetRepository;
    @Mock AnalyticsEventRepository analyticsEventRepository;
    @Mock FamilyGroupRepository familyGroupRepository;
    @Mock FamilyGroupInvitationRepository familyGroupInvitationRepository;
    @Mock BugReportRepository bugReportRepository;
    @Mock BugVoteRepository bugVoteRepository;
    @Mock BugCommentRepository bugCommentRepository;
    @Mock FamilyMemberRepository familyMemberRepository;
    @Mock UserAchievementRepository userAchievementRepository;
    @Mock PatrimoineKpiTargetRepository patrimoineKpiTargetRepository;
    @Mock ErrorLogRepository errorLogRepository;
    @Mock PastDonationRepository pastDonationRepository;
    @Mock UserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;

    @InjectMocks ProfileDataService service;

    User user;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).login("test").password("hash").role(RoleEnum.USER).build();
        lenient().when(passwordEncoder.matches("good-password", "hash")).thenReturn(true);
    }

    // ── getSummary ────────────────────────────────────────────────────────────

    @Test
    void getSummary_compteToutesLesEntites() {
        when(salaryContractRepository.findByUserOrderByStartDateDesc(user)).thenReturn(List.of(new SalaryContract(), new SalaryContract()));
        when(otherIncomeRepository.findByUserOrderByDateDesc(user)).thenReturn(List.of(new OtherIncome()));
        when(recurringExpenseRepository.findByUserOrderByCategoryAscLabelAsc(user)).thenReturn(List.of(new RecurringExpense(), new RecurringExpense(), new RecurringExpense()));
        when(positionRepository.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of(new Position(), new Position()));
        when(debtRepository.findByUserOrderByTypeAscLabelAsc(user)).thenReturn(List.of(new Debt()));
        when(possessionRepository.findByUserOrderByCategoryAscLabelAsc(user)).thenReturn(List.of(new Possession(), new Possession()));
        when(portfolioSnapshotRepository.findByUserOrderBySnapshotDateDesc(user)).thenReturn(List.of(new PortfolioSnapshot()));
        when(loanSimulationRepository.findByUserOrderBySavedAtDesc(user)).thenReturn(List.of());
        when(patrimoineTargetRepository.findByUser(user)).thenReturn(List.of(new PatrimoineTarget()));
        when(analyticsEventRepository.countByUser(user)).thenReturn(42L);

        DataSummaryDto result = service.getSummary(user);

        assertThat(result.salaryContracts()).isEqualTo(2);
        assertThat(result.otherIncomes()).isEqualTo(1);
        assertThat(result.recurringExpenses()).isEqualTo(3);
        assertThat(result.positions()).isEqualTo(2);
        assertThat(result.debts()).isEqualTo(1);
        assertThat(result.possessions()).isEqualTo(2);
        assertThat(result.portfolioSnapshots()).isEqualTo(1);
        assertThat(result.loanSimulations()).isZero();
        assertThat(result.patrimoineTargets()).isEqualTo(1);
        assertThat(result.analyticsEvents()).isEqualTo(42L);
    }

    @Test
    void getSummary_aucuneDonnee_retourneToutAZero() {
        when(salaryContractRepository.findByUserOrderByStartDateDesc(user)).thenReturn(List.of());
        when(otherIncomeRepository.findByUserOrderByDateDesc(user)).thenReturn(List.of());
        when(recurringExpenseRepository.findByUserOrderByCategoryAscLabelAsc(user)).thenReturn(List.of());
        when(positionRepository.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of());
        when(debtRepository.findByUserOrderByTypeAscLabelAsc(user)).thenReturn(List.of());
        when(possessionRepository.findByUserOrderByCategoryAscLabelAsc(user)).thenReturn(List.of());
        when(portfolioSnapshotRepository.findByUserOrderBySnapshotDateDesc(user)).thenReturn(List.of());
        when(loanSimulationRepository.findByUserOrderBySavedAtDesc(user)).thenReturn(List.of());
        when(patrimoineTargetRepository.findByUser(user)).thenReturn(List.of());
        when(analyticsEventRepository.countByUser(user)).thenReturn(0L);

        DataSummaryDto result = service.getSummary(user);

        assertThat(result.salaryContracts()).isZero();
        assertThat(result.analyticsEvents()).isZero();
    }

    // ── deleteAllData ─────────────────────────────────────────────────────────

    @Test
    void deleteAllData_supprimeToutesLesEntitesEtLeCompte() {
        Debt debt = Debt.builder().id(1L).build();
        BugReport reported = BugReport.builder().id(1L).build();
        when(portfolioSnapshotRepository.findByUserOrderBySnapshotDateDesc(user)).thenReturn(List.of(new PortfolioSnapshot()));
        when(positionRepository.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of(new Position()));
        when(salaryContractRepository.findByUserOrderByStartDateDesc(user)).thenReturn(List.of(new SalaryContract()));
        when(debtRepository.findByUserOrderByTypeAscLabelAsc(user)).thenReturn(List.of(debt));
        when(debtBalanceEntryRepository.findByDebtOrderByEntryDateDesc(debt))
                .thenReturn(List.of(new DebtBalanceEntry()));
        when(bugReportRepository.findByReporter(user)).thenReturn(List.of(reported));
        when(loanSimulationRepository.findByUserOrderBySavedAtDesc(user)).thenReturn(List.of());

        service.deleteAllData(user, "good-password");

        verify(portfolioSnapshotRepository).deleteAll(any());
        verify(positionRepository).deleteAll(any());
        verify(salaryContractRepository).deleteAll(any());
        verify(debtBalanceEntryRepository).deleteAll(any());
        verify(debtRepository).deleteAll(any());
        // Bugs reportés + leurs enfants
        verify(bugCommentRepository).deleteByBugReport(reported);
        verify(bugVoteRepository).deleteByBugReport(reported);
        verify(bugReportRepository).deleteAll(any());
        // Votes/commentaires faits par l'utilisateur sur les bugs d'autres
        verify(bugCommentRepository).deleteByAuthor(user);
        verify(bugVoteRepository).deleteByVoter(user);
        // Donations avant FamilyMember (recipient_id NOT NULL)
        verify(pastDonationRepository).deleteByDonor(user);
        // Entités simples
        verify(otherIncomeRepository).deleteByUser(user);
        verify(recurringExpenseRepository).deleteByUser(user);
        verify(possessionRepository).deleteByUser(user);
        verify(patrimoineTargetRepository).deleteByUser(user);
        verify(userBudgetRepository).deleteByUser(user);
        verify(familyMemberRepository).deleteByUser(user);
        verify(userAchievementRepository).deleteByUser(user);
        verify(patrimoineKpiTargetRepository).deleteByUser(user);
        verify(errorLogRepository).deleteByUser(user);
        verify(loanSimulationRepository).deleteAll(any());
        verify(analyticsEventRepository).deleteByUser(user);
        verify(familyGroupInvitationRepository).deleteByInvitedUser(user);
        verify(userRepository).delete(user);  // le compte est supprimé
    }

    @Test
    void deleteAllData_userOwnerDuFamilyGroup_dissoutLeGroupe() {
        FamilyGroup group = FamilyGroup.builder().id(10L).owner(user).build();
        user.setFamilyGroup(group);

        when(portfolioSnapshotRepository.findByUserOrderBySnapshotDateDesc(user)).thenReturn(List.of());
        when(positionRepository.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of());
        when(salaryContractRepository.findByUserOrderByStartDateDesc(user)).thenReturn(List.of());
        when(debtRepository.findByUserOrderByTypeAscLabelAsc(user)).thenReturn(List.of());
        when(loanSimulationRepository.findByUserOrderBySavedAtDesc(user)).thenReturn(List.of());

        service.deleteAllData(user, "good-password");

        verify(familyGroupRepository).delete(group);
        verify(userRepository).delete(user);
    }

    @Test
    void deleteAllData_userMembreNonOwner_neSuprimePasLeGroupe() {
        User owner = User.builder().id(99L).build();
        FamilyGroup group = FamilyGroup.builder().id(10L).owner(owner).build();
        user.setFamilyGroup(group);

        when(portfolioSnapshotRepository.findByUserOrderBySnapshotDateDesc(user)).thenReturn(List.of());
        when(positionRepository.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of());
        when(salaryContractRepository.findByUserOrderByStartDateDesc(user)).thenReturn(List.of());
        when(debtRepository.findByUserOrderByTypeAscLabelAsc(user)).thenReturn(List.of());
        when(loanSimulationRepository.findByUserOrderBySavedAtDesc(user)).thenReturn(List.of());

        service.deleteAllData(user, "good-password");

        verify(familyGroupRepository, never()).delete(any());
        verify(userRepository).delete(user);
    }

    @Test
    void deleteAllData_sansFamilyGroup_neToucheRien() {
        user.setFamilyGroup(null);
        when(portfolioSnapshotRepository.findByUserOrderBySnapshotDateDesc(user)).thenReturn(List.of());
        when(positionRepository.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of());
        when(salaryContractRepository.findByUserOrderByStartDateDesc(user)).thenReturn(List.of());
        when(debtRepository.findByUserOrderByTypeAscLabelAsc(user)).thenReturn(List.of());
        when(loanSimulationRepository.findByUserOrderBySavedAtDesc(user)).thenReturn(List.of());

        service.deleteAllData(user, "good-password");

        verify(familyGroupRepository, never()).delete(any());
        verify(userRepository).delete(user);
    }

    // ── deleteDataOnly ────────────────────────────────────────────────────────

    @Test
    void deleteDataOnly_supprimeLesDonneesMaisConserveLeCompte() {
        when(portfolioSnapshotRepository.findByUserOrderBySnapshotDateDesc(user)).thenReturn(List.of());
        when(positionRepository.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of());
        when(salaryContractRepository.findByUserOrderByStartDateDesc(user)).thenReturn(List.of());
        when(debtRepository.findByUserOrderByTypeAscLabelAsc(user)).thenReturn(List.of());
        when(loanSimulationRepository.findByUserOrderBySavedAtDesc(user)).thenReturn(List.of());

        service.deleteDataOnly(user, "good-password");

        verify(otherIncomeRepository).deleteByUser(user);
        verify(analyticsEventRepository).deleteByUser(user);
        verify(userRepository, never()).delete(any());  // ← compte conservé
        verify(familyGroupRepository, never()).delete(any());  // ← groupe non touché
    }

    // ── Confirmation par mot de passe ─────────────────────────────────────────

    @Test
    void deleteAllData_mauvaisPassword_leve401_etNeSupprimeRien() {
        when(passwordEncoder.matches("wrong", "hash")).thenReturn(false);

        assertThatThrownBy(() -> service.deleteAllData(user, "wrong"))
                .isInstanceOf(ResponseStatusException.class)
                .hasFieldOrPropertyWithValue("statusCode", HttpStatus.UNAUTHORIZED);

        verifyNoInteractions(portfolioSnapshotRepository, positionRepository,
                salaryContractRepository, debtRepository, otherIncomeRepository,
                recurringExpenseRepository, possessionRepository,
                patrimoineTargetRepository, userBudgetRepository,
                loanSimulationRepository, analyticsEventRepository,
                familyGroupRepository, userRepository);
    }

    @Test
    void deleteAllData_passwordNull_leve401() {
        assertThatThrownBy(() -> service.deleteAllData(user, null))
                .isInstanceOf(ResponseStatusException.class)
                .hasFieldOrPropertyWithValue("statusCode", HttpStatus.UNAUTHORIZED);
        verify(userRepository, never()).delete(any());
    }

    @Test
    void deleteDataOnly_mauvaisPassword_leve401_etNeSupprimeRien() {
        when(passwordEncoder.matches("wrong", "hash")).thenReturn(false);

        assertThatThrownBy(() -> service.deleteDataOnly(user, "wrong"))
                .isInstanceOf(ResponseStatusException.class)
                .hasFieldOrPropertyWithValue("statusCode", HttpStatus.UNAUTHORIZED);

        verify(otherIncomeRepository, never()).deleteByUser(any());
        verify(analyticsEventRepository, never()).deleteByUser(any());
    }
}
