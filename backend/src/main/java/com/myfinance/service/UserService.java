package com.myfinance.service;

import com.myfinance.domain.*;
import com.myfinance.dto.ChangePasswordRequest;
import com.myfinance.dto.CreateUserRequest;
import com.myfinance.dto.UpdateUserRequest;
import com.myfinance.dto.UserDto;
import com.myfinance.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService implements UserDetailsService {

    private final UserRepository                 userRepository;
    private final PasswordEncoder                passwordEncoder;
    private final PasswordPolicyService          passwordPolicyService;
    private final FamilyGroupRepository          familyGroupRepository;
    private final FamilyGroupInvitationRepository familyGroupInvitationRepository;
    private final PortfolioSnapshotRepository    portfolioSnapshotRepository;
    private final PositionRepository             positionRepository;
    private final PositionSnapshotRepository     positionSnapshotRepository;
    private final SalaryContractRepository       salaryContractRepository;
    private final SalaryRevisionRepository       salaryRevisionRepository;
    private final ContractOnCallRepository       contractOnCallRepository;
    private final DebtRepository                 debtRepository;
    private final DebtBalanceEntryRepository     debtBalanceEntryRepository;
    private final OtherIncomeRepository          otherIncomeRepository;
    private final RecurringExpenseRepository     recurringExpenseRepository;
    private final PossessionRepository           possessionRepository;
    private final PatrimoineTargetRepository     patrimoineTargetRepository;
    private final UserBudgetRepository           userBudgetRepository;
    private final BugReportRepository            bugReportRepository;
    private final BugVoteRepository              bugVoteRepository;
    private final BugCommentRepository           bugCommentRepository;
    private final FamilyMemberRepository         familyMemberRepository;
    private final UserAchievementRepository      userAchievementRepository;
    private final PatrimoineKpiTargetRepository  patrimoineKpiTargetRepository;
    private final ErrorLogRepository             errorLogRepository;
    private final AnalyticsEventRepository       analyticsEventRepository;
    private final PastDonationRepository         pastDonationRepository;
    private final LoanSimulationRepository       loanSimulationRepository;
    private final UserDashboardLayoutRepository  userDashboardLayoutRepository;
    private final UserDashboardRepository        userDashboardRepository;

    // ── Spring Security ────────────────────────────────────────

    @Override
    public UserDetails loadUserByUsername(String login) throws UsernameNotFoundException {
        return userRepository.findByLogin(login)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur introuvable : " + login));
    }

    // ── Lecture ────────────────────────────────────────────────

    public List<UserDto> findAll() {
        return userRepository.findAll().stream()
                .map(UserDto::from)
                .toList();
    }

    public UserDto findById(Long id) {
        return userRepository.findById(id)
                .map(UserDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Utilisateur introuvable : " + id));
    }

    // ── Lecture (entité) — usage interne et simulateur ────────

    public User findEntityById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Utilisateur introuvable : " + id));
    }

    // ── Création ───────────────────────────────────────────────

    public UserDto create(CreateUserRequest request) {
        if (userRepository.findByLogin(request.login()).isPresent()) {
            log.warn("[system] Création utilisateur refusée - login déjà utilisé");
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Ce login est déjà utilisé : " + request.login());
        }

        passwordPolicyService.validateNotCommon(request.password());
        passwordPolicyService.validateNotContainsIdentity(
                request.password(), request.login(), request.firstName(), request.lastName());

        validerProfilFiscal(request.useFlatRateDeduction(), request.customProfessionalDeduction());

        User user = User.builder()
                .firstName(request.firstName())
                .lastName(request.lastName())
                .birthDate(request.birthDate())
                .login(request.login())
                .password(passwordEncoder.encode(request.password()))
                .role(request.role())
                .fiscalParts(request.fiscalParts() != null ? request.fiscalParts() : 1.0f)
                .useFlatRateDeduction(request.useFlatRateDeduction() != null ? request.useFlatRateDeduction() : true)
                .customProfessionalDeduction(request.customProfessionalDeduction())
                .build();

        UserDto dto = UserDto.from(userRepository.save(user));
        log.info("[system] Utilisateur créé #{} [rôle: {}]", dto.id(), request.role());
        return dto;
    }

    // ── Modification ───────────────────────────────────────────

    public UserDto update(Long id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Utilisateur introuvable : " + id));

        // Vérifie que le nouveau login n'est pas déjà pris par quelqu'un d'autre
        userRepository.findByLogin(request.login())
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    log.warn("[system] Modification utilisateur #{} refusée - login déjà utilisé", id);
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "Ce login est déjà utilisé : " + request.login());
                });

        validerProfilFiscal(request.useFlatRateDeduction(), request.customProfessionalDeduction());

        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setBirthDate(request.birthDate());
        user.setLogin(request.login());
        user.setRole(request.role());

        if (request.password() != null && !request.password().isBlank()) {
            passwordPolicyService.validateNotCommon(request.password());
            passwordPolicyService.validateNotContainsIdentity(
                    request.password(), request.login(), request.firstName(), request.lastName());
            user.setPassword(passwordEncoder.encode(request.password()));
        }

        // Mise à jour profil fiscal uniquement si les champs sont fournis
        if (request.fiscalParts() != null) user.setFiscalParts(request.fiscalParts());
        if (request.useFlatRateDeduction() != null) {
            user.setUseFlatRateDeduction(request.useFlatRateDeduction());
            user.setCustomProfessionalDeduction(request.customProfessionalDeduction());
        }

        UserDto dto = UserDto.from(userRepository.save(user));
        log.info("[system] Utilisateur modifié #{}", id);
        return dto;
    }

    // ── Validation profil fiscal ───────────────────────────────

    private void validerProfilFiscal(Boolean useFlatRate, Float customDeduction) {
        if (Boolean.FALSE.equals(useFlatRate) && customDeduction == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Le montant des frais réels est obligatoire quand l'abattement forfaitaire est désactivé");
        }
    }

    // ── Changement de mot de passe (self-service) ─────────────

    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Utilisateur introuvable : " + userId));

        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Mot de passe actuel incorrect");
        }

        passwordPolicyService.validateNotSameAsCurrent(request.newPassword(), user.getPassword());
        passwordPolicyService.validateNotCommon(request.newPassword());
        passwordPolicyService.validateNotContainsIdentity(
                request.newPassword(), user.getLogin(), user.getFirstName(), user.getLastName());

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        log.info("[user:{}] Mot de passe modifié", userId);
    }

    // ── Suppression ────────────────────────────────────────────

    @Transactional
    public void delete(Long id, String callingLogin) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Utilisateur introuvable : " + id));

        // Garde-fous anti-lockout (cf. finding N16) :
        //   - un admin ne peut pas se supprimer lui-même par mégarde (ou pour effacer ses traces).
        //   - on ne peut pas supprimer le dernier admin restant — sinon plus aucun accès admin.
        if (user.getLogin().equals(callingLogin)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Un administrateur ne peut pas se supprimer lui-même.");
        }
        if (user.getRole() == RoleEnum.ADMIN && userRepository.countByRole(RoleEnum.ADMIN) <= 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Impossible de supprimer le dernier administrateur.");
        }

        // 1. Groupe familial : dissoudre si owner, quitter si membre
        familyGroupRepository.findByOwner(user).ifPresent(group -> {
            List<User> members = userRepository.findByFamilyGroup(group);
            members.forEach(m -> m.setFamilyGroup(null));
            userRepository.saveAll(members);
            familyGroupInvitationRepository.deleteByGroup(group);
            familyGroupRepository.delete(group);
        });
        familyGroupInvitationRepository.deleteByInvitedUser(user);

        // 2. Relevés patrimoniaux (cascade → PositionSnapshot)
        portfolioSnapshotRepository.deleteAll(
                portfolioSnapshotRepository.findByUserOrderBySnapshotDateDesc(user));

        // 3. Positions (snapshots orphelins d'abord, puis cascade → PositionOrder)
        List<Position> positions = positionRepository.findByUserOrderByCreatedAtDesc(user);
        if (!positions.isEmpty()) {
            positionSnapshotRepository.deleteByPositionIn(positions);
            positionRepository.deleteAll(positions);
        }

        // 4. Contrats salariaux (révisions et astreintes d'abord ; cascade → bulletins, primes, avantages)
        List<SalaryContract> contracts = salaryContractRepository.findByUserOrderByStartDateDesc(user);
        contracts.forEach(c -> {
            contractOnCallRepository.deleteByContract(c);
            salaryRevisionRepository.deleteByContract(c);
        });
        salaryContractRepository.deleteAll(contracts);

        // 5. Dettes (historique soldes d'abord)
        List<Debt> debts = debtRepository.findByUserOrderByTypeAscLabelAsc(user);
        debts.forEach(d -> debtBalanceEntryRepository.deleteByDebt(d));
        debtRepository.deleteAll(debts);

        // 6. Bug reports signalés par l'utilisateur (commentaires/votes enfants d'abord)
        List<BugReport> reportedBugs = bugReportRepository.findByReporter(user);
        reportedBugs.forEach(b -> {
            bugCommentRepository.deleteByBugReport(b);
            bugVoteRepository.deleteByBugReport(b);
        });
        bugReportRepository.deleteAll(reportedBugs);
        // Votes/commentaires faits par l'utilisateur sur les bugs d'autres
        bugCommentRepository.deleteByAuthor(user);
        bugVoteRepository.deleteByVoter(user);

        // 7. Donations passées (donor=user) — avant FamilyMember (recipient_id NOT NULL)
        pastDonationRepository.deleteByDonor(user);

        // 8. Entités simples liées à l'utilisateur
        otherIncomeRepository.deleteByUser(user);
        recurringExpenseRepository.deleteByUser(user);
        possessionRepository.deleteByUser(user);
        patrimoineTargetRepository.deleteByUser(user);
        userBudgetRepository.deleteByUser(user);
        familyMemberRepository.deleteByUser(user);
        userAchievementRepository.deleteByUser(user);
        patrimoineKpiTargetRepository.deleteByUser(user);
        errorLogRepository.deleteByUser(user);
        analyticsEventRepository.deleteByUser(user);
        loanSimulationRepository.deleteAll(
                loanSimulationRepository.findByUserOrderBySavedAtDesc(user));
        userDashboardRepository.findByUserOrderBySortOrderAsc(user)
                .forEach(d -> userDashboardLayoutRepository.deleteByDashboard(d));
        userDashboardRepository.deleteByUser(user);

        // 9. Suppression effective
        userRepository.delete(user);
        log.info("[system] Utilisateur supprimé #{} (données en cascade supprimées)", id);
    }
}
