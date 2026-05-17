package com.myfinance.service;

import com.myfinance.domain.*;
import com.myfinance.dto.ChangePasswordRequest;
import com.myfinance.dto.CreateUserRequest;
import com.myfinance.dto.UpdateUserRequest;
import com.myfinance.dto.UserDto;
import com.myfinance.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock UserRepository                  userRepository;
    @Mock PasswordEncoder                 passwordEncoder;
    @Mock PasswordPolicyService           passwordPolicyService;
    @Mock FamilyGroupRepository           familyGroupRepository;
    @Mock FamilyGroupInvitationRepository familyGroupInvitationRepository;
    @Mock PortfolioSnapshotRepository     portfolioSnapshotRepository;
    @Mock PositionRepository              positionRepository;
    @Mock PositionSnapshotRepository      positionSnapshotRepository;
    @Mock SalaryContractRepository        salaryContractRepository;
    @Mock SalaryRevisionRepository        salaryRevisionRepository;
    @Mock ContractOnCallRepository        contractOnCallRepository;
    @Mock DebtRepository                  debtRepository;
    @Mock DebtBalanceEntryRepository      debtBalanceEntryRepository;
    @Mock OtherIncomeRepository           otherIncomeRepository;
    @Mock RecurringExpenseRepository      recurringExpenseRepository;
    @Mock PossessionRepository            possessionRepository;
    @Mock PatrimoineTargetRepository      patrimoineTargetRepository;
    @Mock UserBudgetRepository            userBudgetRepository;
    @Mock BugReportRepository             bugReportRepository;
    @Mock BugVoteRepository               bugVoteRepository;
    @Mock BugCommentRepository            bugCommentRepository;
    @Mock FamilyMemberRepository          familyMemberRepository;
    @Mock UserAchievementRepository       userAchievementRepository;
    @Mock PatrimoineKpiTargetRepository   patrimoineKpiTargetRepository;
    @Mock ErrorLogRepository              errorLogRepository;
    @Mock AnalyticsEventRepository        analyticsEventRepository;
    @Mock PastDonationRepository          pastDonationRepository;
    @Mock LoanSimulationRepository        loanSimulationRepository;
    @Mock UserDashboardLayoutRepository   userDashboardLayoutRepository;
    @Mock UserDashboardRepository         userDashboardRepository;
    @InjectMocks UserService userService;

    User user;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id(1L)
                .firstName("Jean")
                .lastName("Dupont")
                .login("jean.dupont")
                .password("hashed_password")
                .role(RoleEnum.USER)
                .build();
    }

    // ── findAll ────────────────────────────────────────────────

    @Test
    void findAll_retourneLaListeDesUtilisateurs() {
        when(userRepository.findAll()).thenReturn(List.of(user));

        List<UserDto> result = userService.findAll();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).login()).isEqualTo("jean.dupont");
    }

    @Test
    void findAll_retourneListeVide_siAucunUtilisateur() {
        when(userRepository.findAll()).thenReturn(List.of());

        assertThat(userService.findAll()).isEmpty();
    }

    // ── findById ───────────────────────────────────────────────

    @Test
    void findById_retourneLutilisateur_siTrouve() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        UserDto result = userService.findById(1L);

        assertThat(result.id()).isEqualTo(1L);
        assertThat(result.login()).isEqualTo("jean.dupont");
        assertThat(result.role()).isEqualTo(RoleEnum.USER);
    }

    @Test
    void findById_leve404_siIntrouvable() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.findById(99L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    // ── create ─────────────────────────────────────────────────

    @Test
    void create_sauvegardeEtRetourneLutilisateur() {
        CreateUserRequest request = new CreateUserRequest(
                "Jean", "Dupont", null, "jean.dupont", "password", RoleEnum.USER, null, null, null);

        when(userRepository.findByLogin("jean.dupont")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("password")).thenReturn("hashed_password");
        when(userRepository.save(any(User.class))).thenReturn(user);

        UserDto result = userService.create(request);

        assertThat(result.login()).isEqualTo("jean.dupont");
        verify(passwordEncoder).encode("password");
        verify(userRepository).save(any(User.class));
    }

    @Test
    void create_useFlatRateNull_defaultVraiEtSauvegarde() {
        CreateUserRequest request = new CreateUserRequest(
                "Jean", "Dupont", null, "jean.dupont", "password", RoleEnum.USER,
                null, null, null); // useFlatRateDeduction=null → doit defaulter à true

        when(userRepository.findByLogin("jean.dupont")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("password")).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        userService.create(request);

        verify(userRepository).save(argThat(u -> Boolean.TRUE.equals(u.getUseFlatRateDeduction())));
    }

    @Test
    void create_fraisReelsSansDeduction_leve400() {
        CreateUserRequest request = new CreateUserRequest(
                "Jean", "Dupont", null, "jean.dupont", "password", RoleEnum.USER,
                1.0f, false, null); // frais réels sans montant → 400

        when(userRepository.findByLogin("jean.dupont")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.create(request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));

        verify(userRepository, never()).save(any());
    }

    @Test
    void create_leve409_siLoginDejaUtilise() {
        CreateUserRequest request = new CreateUserRequest(
                "Jean", "Dupont", null, "jean.dupont", "password", RoleEnum.USER, null, null, null);

        when(userRepository.findByLogin("jean.dupont")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> userService.create(request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));

        verify(userRepository, never()).save(any());
    }

    // ── update ─────────────────────────────────────────────────

    @Test
    void update_modifieLesChamps_sansChangerLeMdp_siPasswordVide() {
        UpdateUserRequest request = new UpdateUserRequest(
                "Marie", "Martin", null, "marie.martin", "", RoleEnum.ADMIN, null, null, null);

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.findByLogin("marie.martin")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UserDto result = userService.update(1L, request);

        assertThat(result.firstName()).isEqualTo("Marie");
        assertThat(result.login()).isEqualTo("marie.martin");
        assertThat(result.role()).isEqualTo(RoleEnum.ADMIN);
        verify(passwordEncoder, never()).encode(any());
    }

    @Test
    void update_hasheLeNouveauMdp_siPasswordFourni() {
        UpdateUserRequest request = new UpdateUserRequest(
                "Jean", "Dupont", null, "jean.dupont", "nouveau_mdp", RoleEnum.USER, null, null, null);

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.findByLogin("jean.dupont")).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("nouveau_mdp")).thenReturn("nouveau_hash");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        userService.update(1L, request);

        verify(passwordEncoder).encode("nouveau_mdp");
    }

    @Test
    void update_fraisReelsSansDeduction_leve400() {
        UpdateUserRequest request = new UpdateUserRequest(
                "Jean", "Dupont", null, "jean.dupont", null, RoleEnum.USER,
                1.0f, false, null); // frais réels sans montant → 400

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.findByLogin("jean.dupont")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> userService.update(1L, request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));

        verify(userRepository, never()).save(any());
    }

    @Test
    void update_leve404_siUtilisateurIntrouvable() {
        UpdateUserRequest request = new UpdateUserRequest(
                "Jean", "Dupont", null, "jean.dupont", null, RoleEnum.USER, null, null, null);

        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.update(99L, request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void update_leve409_siNouveauLoginPrisParAutreUtilisateur() {
        User autreUser = User.builder().id(2L).login("marie.martin").build();
        UpdateUserRequest request = new UpdateUserRequest(
                "Jean", "Dupont", null, "marie.martin", null, RoleEnum.USER, null, null, null);

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.findByLogin("marie.martin")).thenReturn(Optional.of(autreUser));

        assertThatThrownBy(() -> userService.update(1L, request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    void update_accepteLeMemeLLogin_siLeMemeUtilisateur() {
        UpdateUserRequest request = new UpdateUserRequest(
                "Jean", "Dupont", null, "jean.dupont", null, RoleEnum.USER, null, null, null);

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        // findByLogin retourne le même utilisateur → pas de conflit
        when(userRepository.findByLogin("jean.dupont")).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertThat(userService.update(1L, request).login()).isEqualTo("jean.dupont");
    }

    // ── delete ─────────────────────────────────────────────────

    @Test
    void delete_supprimeLutilisateur_avecCascadeComplete() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(familyGroupRepository.findByOwner(user)).thenReturn(Optional.empty());
        when(portfolioSnapshotRepository.findByUserOrderBySnapshotDateDesc(user)).thenReturn(List.of());
        when(positionRepository.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of());
        when(salaryContractRepository.findByUserOrderByStartDateDesc(user)).thenReturn(List.of());
        when(debtRepository.findByUserOrderByTypeAscLabelAsc(user)).thenReturn(List.of());
        when(bugReportRepository.findByReporter(user)).thenReturn(List.of());
        when(loanSimulationRepository.findByUserOrderBySavedAtDesc(user)).thenReturn(List.of());

        userService.delete(1L, "admin");

        verify(familyGroupInvitationRepository).deleteByInvitedUser(user);
        verify(bugCommentRepository).deleteByAuthor(user);
        verify(bugVoteRepository).deleteByVoter(user);
        verify(pastDonationRepository).deleteByDonor(user);
        verify(otherIncomeRepository).deleteByUser(user);
        verify(recurringExpenseRepository).deleteByUser(user);
        verify(possessionRepository).deleteByUser(user);
        verify(patrimoineTargetRepository).deleteByUser(user);
        verify(userBudgetRepository).deleteByUser(user);
        verify(familyMemberRepository).deleteByUser(user);
        verify(userAchievementRepository).deleteByUser(user);
        verify(patrimoineKpiTargetRepository).deleteByUser(user);
        verify(errorLogRepository).deleteByUser(user);
        verify(analyticsEventRepository).deleteByUser(user);
        verify(loanSimulationRepository).deleteAll(any());
        verify(userRepository).delete(user);
    }

    @Test
    void delete_avecBugsSignalesEtFamilyMembers_nettoieDansLeBonOrdre() {
        BugReport reported = BugReport.builder().id(7L).build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(familyGroupRepository.findByOwner(user)).thenReturn(Optional.empty());
        when(portfolioSnapshotRepository.findByUserOrderBySnapshotDateDesc(user)).thenReturn(List.of());
        when(positionRepository.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of());
        when(salaryContractRepository.findByUserOrderByStartDateDesc(user)).thenReturn(List.of());
        when(debtRepository.findByUserOrderByTypeAscLabelAsc(user)).thenReturn(List.of());
        when(bugReportRepository.findByReporter(user)).thenReturn(List.of(reported));
        when(loanSimulationRepository.findByUserOrderBySavedAtDesc(user)).thenReturn(List.of());

        userService.delete(1L, "admin");

        // Les enfants du bug reporté sont nettoyés AVANT le bug
        var inOrder = org.mockito.Mockito.inOrder(bugCommentRepository, bugVoteRepository, bugReportRepository);
        inOrder.verify(bugCommentRepository).deleteByBugReport(reported);
        inOrder.verify(bugVoteRepository).deleteByBugReport(reported);
        inOrder.verify(bugReportRepository).deleteAll(any());

        // Les donations sont nettoyées AVANT les FamilyMember (recipient_id NOT NULL)
        var donationsOrder = org.mockito.Mockito.inOrder(pastDonationRepository, familyMemberRepository);
        donationsOrder.verify(pastDonationRepository).deleteByDonor(user);
        donationsOrder.verify(familyMemberRepository).deleteByUser(user);
    }

    @Test
    void delete_leve404_siIntrouvable() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.delete(99L, "admin"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));

        verify(userRepository, never()).delete(any(User.class));
    }

    @Test
    void delete_autoSuppressionAdmin_leve400() {
        User admin = User.builder().id(7L).login("admin").role(RoleEnum.ADMIN).build();
        when(userRepository.findById(7L)).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> userService.delete(7L, "admin"))
                .isInstanceOf(ResponseStatusException.class)
                .hasFieldOrPropertyWithValue("statusCode", HttpStatus.BAD_REQUEST)
                .hasMessageContaining("lui-même");
        verify(userRepository, never()).delete(any(User.class));
    }

    @Test
    void delete_dernierAdmin_leve400() {
        User onlyAdmin = User.builder().id(7L).login("admin").role(RoleEnum.ADMIN).build();
        when(userRepository.findById(7L)).thenReturn(Optional.of(onlyAdmin));
        when(userRepository.countByRole(RoleEnum.ADMIN)).thenReturn(1L);

        assertThatThrownBy(() -> userService.delete(7L, "autre.admin"))
                .isInstanceOf(ResponseStatusException.class)
                .hasFieldOrPropertyWithValue("statusCode", HttpStatus.BAD_REQUEST)
                .hasMessageContaining("dernier administrateur");
        verify(userRepository, never()).delete(any(User.class));
    }

    @Test
    void delete_userNonAdmin_aucunCheckCountByRole() {
        // user (USER role) supprimé par admin → on ne consulte pas countByRole
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(familyGroupRepository.findByOwner(user)).thenReturn(Optional.empty());
        when(portfolioSnapshotRepository.findByUserOrderBySnapshotDateDesc(user)).thenReturn(List.of());
        when(positionRepository.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of());
        when(salaryContractRepository.findByUserOrderByStartDateDesc(user)).thenReturn(List.of());
        when(debtRepository.findByUserOrderByTypeAscLabelAsc(user)).thenReturn(List.of());
        when(bugReportRepository.findByReporter(user)).thenReturn(List.of());
        when(loanSimulationRepository.findByUserOrderBySavedAtDesc(user)).thenReturn(List.of());

        userService.delete(1L, "admin");

        verify(userRepository, never()).countByRole(any());
        verify(userRepository).delete(user);
    }

    // ── loadUserByUsername ─────────────────────────────────────

    @Test
    void loadUserByUsername_retourneLutilisateur_siTrouve() {
        when(userRepository.findByLogin("jean.dupont")).thenReturn(Optional.of(user));

        assertThat(userService.loadUserByUsername("jean.dupont").getUsername())
                .isEqualTo("jean.dupont");
    }

    @Test
    void loadUserByUsername_leveUsernameNotFoundException_siIntrouvable() {
        when(userRepository.findByLogin("inconnu")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.loadUserByUsername("inconnu"))
                .isInstanceOf(UsernameNotFoundException.class);
    }

    // ── findEntityById ─────────────────────────────────────────

    @Test
    void findEntityById_retourneLentite_siTrouvee() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        User result = userService.findEntityById(1L);

        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getLogin()).isEqualTo("jean.dupont");
    }

    @Test
    void findEntityById_leve404_siInexistant() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.findEntityById(99L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    // ── changePassword ─────────────────────────────────────────

    @Test
    void changePassword_avecSucces_encodeEtSauvegarde() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("ancien", "hashed_password")).thenReturn(true);
        when(passwordEncoder.encode("Nouveau1")).thenReturn("nouveau_hash");

        userService.changePassword(1L, new ChangePasswordRequest("ancien", "Nouveau1"));

        verify(userRepository).save(argThat(u -> "nouveau_hash".equals(u.getPassword())));
    }

    @Test
    void changePassword_userInexistant_leve404() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.changePassword(99L,
                new ChangePasswordRequest("ancien", "Nouveau1")))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void changePassword_motDePasseActuelIncorrect_leve401() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("mauvais", "hashed_password")).thenReturn(false);

        assertThatThrownBy(() -> userService.changePassword(1L,
                new ChangePasswordRequest("mauvais", "Nouveau1")))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.UNAUTHORIZED));

        verify(userRepository, never()).save(any());
    }
}
