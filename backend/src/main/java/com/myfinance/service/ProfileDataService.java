package com.myfinance.service;

import com.myfinance.domain.User;
import com.myfinance.dto.DataSummaryDto;
import com.myfinance.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProfileDataService {

    private final SalaryContractRepository   salaryContractRepository;
    private final OtherIncomeRepository      otherIncomeRepository;
    private final RecurringExpenseRepository recurringExpenseRepository;
    private final PositionRepository         positionRepository;
    private final PortfolioSnapshotRepository portfolioSnapshotRepository;
    private final DebtRepository             debtRepository;
    private final DebtBalanceEntryRepository debtBalanceEntryRepository;
    private final PossessionRepository       possessionRepository;
    private final PatrimoineTargetRepository patrimoineTargetRepository;
    private final LoanSimulationRepository   loanSimulationRepository;
    private final UserBudgetRepository       userBudgetRepository;
    private final AnalyticsEventRepository   analyticsEventRepository;
    private final FamilyGroupRepository      familyGroupRepository;
    private final UserRepository             userRepository;
    private final PasswordEncoder            passwordEncoder;

    public DataSummaryDto getSummary(User user) {
        return new DataSummaryDto(
                salaryContractRepository.findByUserOrderByStartDateDesc(user).size(),
                otherIncomeRepository.findByUserOrderByDateDesc(user).size(),
                recurringExpenseRepository.findByUserOrderByCategoryAscLabelAsc(user).size(),
                positionRepository.findByUserOrderByCreatedAtDesc(user).size(),
                debtRepository.findByUserOrderByTypeAscLabelAsc(user).size(),
                possessionRepository.findByUserOrderByCategoryAscLabelAsc(user).size(),
                portfolioSnapshotRepository.findByUserOrderBySnapshotDateDesc(user).size(),
                loanSimulationRepository.findByUserOrderBySavedAtDesc(user).size(),
                patrimoineTargetRepository.findByUser(user).size(),
                analyticsEventRepository.countByUser(user)
        );
    }

    @Transactional
    public void deleteAllData(User user, String currentPassword) {
        verifyPassword(user, currentPassword);
        log.info("[ProfileData] Suppression de toutes les données de l'utilisateur {}", user.getLogin());

        // 1. Snapshots (cascade → PositionSnapshots)
        portfolioSnapshotRepository.deleteAll(
                portfolioSnapshotRepository.findByUserOrderBySnapshotDateDesc(user));

        // 2. Positions (cascade → Orders)
        positionRepository.deleteAll(
                positionRepository.findByUserOrderByCreatedAtDesc(user));

        // 3. Contrats salariaux (cascade → Bulletins, Primes, Avantages, Astreintes, Révisions)
        salaryContractRepository.deleteAll(
                salaryContractRepository.findByUserOrderByStartDateDesc(user));

        // 4. Dettes — BalanceEntries d'abord, puis les dettes
        var debts = debtRepository.findByUserOrderByTypeAscLabelAsc(user);
        debts.forEach(d -> debtBalanceEntryRepository.deleteAll(
                debtBalanceEntryRepository.findByDebtOrderByEntryDateDesc(d)));
        debtRepository.deleteAll(debts);

        // 5. Données simples à portée deleteByUser
        otherIncomeRepository.deleteByUser(user);
        recurringExpenseRepository.deleteByUser(user);
        possessionRepository.deleteByUser(user);
        patrimoineTargetRepository.deleteByUser(user);
        userBudgetRepository.deleteByUser(user);

        // 6. Simulations d'emprunt
        loanSimulationRepository.deleteAll(
                loanSimulationRepository.findByUserOrderBySavedAtDesc(user));

        // 7. Analytics events (suppression complète des traces comportementales)
        analyticsEventRepository.deleteByUser(user);

        // 8. Retrait du groupe familial (sans supprimer le groupe si d'autres membres)
        var group = user.getFamilyGroup();
        if (group != null) {
            if (group.getOwner() != null && group.getOwner().getId().equals(user.getId())) {
                // Owner → dissolution du groupe (les membres sont retirés côté DB via FK)
                familyGroupRepository.delete(group);
            }
            // Dans tous les cas, on détache l'utilisateur du groupe avant suppression
        }

        // 9. Suppression du compte utilisateur
        userRepository.delete(user);

        log.info("[ProfileData] Compte {} supprimé avec toutes ses données", user.getLogin());
    }

    @Transactional
    public void deleteDataOnly(User user, String currentPassword) {
        verifyPassword(user, currentPassword);
        log.info("[ProfileData] Suppression des données (sans le compte) de l'utilisateur {}", user.getLogin());

        portfolioSnapshotRepository.deleteAll(
                portfolioSnapshotRepository.findByUserOrderBySnapshotDateDesc(user));
        positionRepository.deleteAll(
                positionRepository.findByUserOrderByCreatedAtDesc(user));
        salaryContractRepository.deleteAll(
                salaryContractRepository.findByUserOrderByStartDateDesc(user));

        var debts = debtRepository.findByUserOrderByTypeAscLabelAsc(user);
        debts.forEach(d -> debtBalanceEntryRepository.deleteAll(
                debtBalanceEntryRepository.findByDebtOrderByEntryDateDesc(d)));
        debtRepository.deleteAll(debts);

        otherIncomeRepository.deleteByUser(user);
        recurringExpenseRepository.deleteByUser(user);
        possessionRepository.deleteByUser(user);
        patrimoineTargetRepository.deleteByUser(user);
        userBudgetRepository.deleteByUser(user);

        loanSimulationRepository.deleteAll(
                loanSimulationRepository.findByUserOrderBySavedAtDesc(user));

        analyticsEventRepository.deleteByUser(user);

        log.info("[ProfileData] Données de {} supprimées, compte conservé", user.getLogin());
    }

    // Re-authentification par mot de passe avant toute opération destructive.
    // Empêche qu'une XSS exploitant le cookie CSRF puisse détruire le compte.
    private void verifyPassword(User user, String currentPassword) {
        if (currentPassword == null || !passwordEncoder.matches(currentPassword, user.getPassword())) {
            log.warn("[ProfileData] Tentative de suppression refusée pour {} : mot de passe incorrect",
                    user.getLogin());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Mot de passe incorrect");
        }
    }
}
