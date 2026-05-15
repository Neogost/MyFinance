package com.myfinance.service;

import com.myfinance.domain.ExpenseCategoryEnum;
import com.myfinance.domain.FrequencyEnum;
import com.myfinance.domain.OtherIncomeTypeEnum;
import com.myfinance.domain.RecurringExpense;
import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.User;
import com.myfinance.dto.*;
import com.myfinance.repository.OtherIncomeRepository;
import com.myfinance.repository.RecurringExpenseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecurringExpenseService {

    private final RecurringExpenseRepository recurringExpenseRepository;
    private final SalaryContractService salaryContractService;
    private final OtherIncomeRepository otherIncomeRepository;

    // Types d'OtherIncome considérés comme revenus mensuels récurrents (cf. OtherIncomeForm :
    // ces types affichent le champ « par mois », contrairement aux DIVIDENDE/AUTRE qui sont
    // ponctuels avec date de perception).
    private static final List<OtherIncomeTypeEnum> RECURRING_INCOME_TYPES =
            List.of(OtherIncomeTypeEnum.LOCATIF, OtherIncomeTypeEnum.AIDE_SOCIALE);

    // ── Lecture ────────────────────────────────────────────────

    public List<RecurringExpenseDto> findAllByUser(User user) {
        return recurringExpenseRepository.findByUserOrderByCategoryAscLabelAsc(user)
                .stream()
                .map(RecurringExpenseDto::from)
                .toList();
    }

    // ── Création ───────────────────────────────────────────────

    public RecurringExpenseDto create(CreateRecurringExpenseRequest request, User user) {
        RecurringExpense expense = RecurringExpense.builder()
                .user(user)
                .category(request.category())
                .label(request.label())
                .amount(request.amount())
                .frequency(request.frequency())
                .sharePercentage(request.sharePercentage())
                .startDate(request.startDate())
                .endDate(request.endDate())
                .notes(request.notes())
                .paymentDay(request.frequency() == FrequencyEnum.MONTHLY ? request.paymentDay() : null)
                .build();

        RecurringExpenseDto dto = RecurringExpenseDto.from(recurringExpenseRepository.save(expense));
        log.info("[user:{}] Dépense récurrente créée #{} [catégorie: {}, fréquence: {}]",
                user.getId(), dto.id(), request.category(), request.frequency());
        return dto;
    }

    // ── Modification ───────────────────────────────────────────

    public RecurringExpenseDto update(Long id, UpdateRecurringExpenseRequest request, User currentUser) {
        RecurringExpense expense = getExpenseWithOwnershipCheck(id, currentUser);

        expense.setCategory(request.category());
        expense.setLabel(request.label());
        expense.setAmount(request.amount());
        expense.setFrequency(request.frequency());
        expense.setSharePercentage(request.sharePercentage());
        expense.setStartDate(request.startDate());
        expense.setEndDate(request.endDate());
        expense.setNotes(request.notes());
        expense.setPaymentDay(request.frequency() == FrequencyEnum.MONTHLY ? request.paymentDay() : null);

        RecurringExpenseDto dto = RecurringExpenseDto.from(recurringExpenseRepository.save(expense));
        log.info("[user:{}] Dépense récurrente modifiée #{} [catégorie: {}]",
                currentUser.getId(), id, request.category());
        return dto;
    }

    // ── Suppression ────────────────────────────────────────────

    public void delete(Long id, User currentUser) {
        getExpenseWithOwnershipCheck(id, currentUser);
        recurringExpenseRepository.deleteById(id);
        log.info("[user:{}] Dépense récurrente supprimée #{}", currentUser.getId(), id);
    }

    // ── Résumé capacité d'épargne ─────────────────────────────

    public ExpenseSummaryDto getSummary(User user) {
        LocalDate today = LocalDate.now();

        List<RecurringExpenseDto> activeExpenses = recurringExpenseRepository
                .findByUserOrderByCategoryAscLabelAsc(user)
                .stream()
                .filter(e -> e.getEndDate() == null || !e.getEndDate().isBefore(today))
                .map(RecurringExpenseDto::from)
                .toList();

        float totalMonthly = (float) activeExpenses.stream()
                .mapToDouble(RecurringExpenseDto::monthlyAmount)
                .sum();
        float totalAnnual = (float) activeExpenses.stream()
                .mapToDouble(RecurringExpenseDto::annualAmount)
                .sum();

        // Agrégation par catégorie (dans l'ordre de l'enum pour un affichage stable)
        Map<ExpenseCategoryEnum, Double> monthlyByCategory = activeExpenses.stream()
                .collect(Collectors.groupingBy(
                        RecurringExpenseDto::category,
                        Collectors.summingDouble(e -> e.monthlyAmount().doubleValue())
                ));

        List<ExpenseCategorySummaryDto> byCategory = Arrays.stream(ExpenseCategoryEnum.values())
                .filter(monthlyByCategory::containsKey)
                .map(cat -> {
                    float m = monthlyByCategory.get(cat).floatValue();
                    return new ExpenseCategorySummaryDto(cat, m, m * 12f);
                })
                .toList();

        // Revenu mensuel net — contrat actif (endDate == null)
        Float monthlyNetIncome = null;
        String incomeSource = "NONE";

        List<SalaryContractDto> contracts = salaryContractService.findAllByUser(user);
        SalaryContractDto active = contracts.stream()
                .filter(c -> c.endDate() == null)
                .findFirst()
                .orElse(null);

        Float breakdownNetImposable = null;
        Float breakdownEstimatedTax = null;
        Float breakdownBenefits = null;
        Float breakdownMealVoucherEmployer = null;
        Float breakdownMonthlyBonuses = null;

        if (active != null) {
            if (active.monthlyNetAfterTax() != null) {
                monthlyNetIncome = active.monthlyNetAfterTax();
                incomeSource = "NET_AFTER_TAX";
            } else if (active.monthlyNetImposable() != null) {
                monthlyNetIncome = active.monthlyNetImposable();
                incomeSource = "NET_IMPOSABLE";
            }
            // Primes MENSUELLE actives : approximation nette à 72 % du brut
            if (active.monthlyActiveMensuelleGross() != null && active.monthlyActiveMensuelleGross() > 0) {
                float bonusNet = active.monthlyActiveMensuelleGross() * 0.72f;
                monthlyNetIncome = (monthlyNetIncome != null ? monthlyNetIncome : 0f) + bonusNet;
                breakdownMonthlyBonuses = bonusNet;
            }
            breakdownNetImposable = active.monthlyNetImposable();
            breakdownEstimatedTax = active.monthlyEstimatedTax();
            breakdownBenefits = active.monthlyBenefits() != null && active.monthlyBenefits() > 0
                    ? active.monthlyBenefits() : null;
            breakdownMealVoucherEmployer = active.employerMonthlyMealVoucherCost() != null
                    && active.employerMonthlyMealVoucherCost() > 0
                    ? active.employerMonthlyMealVoucherCost() : null;
        }

        // Autres revenus mensuels récurrents (loyers, aides sociales)
        float otherIncomeMonthly = (float) otherIncomeRepository.findByUserOrderByDateDesc(user).stream()
                .filter(oi -> RECURRING_INCOME_TYPES.contains(oi.getType()))
                .mapToDouble(oi -> oi.getAmount() != null ? oi.getAmount() : 0.0)
                .sum();
        Float breakdownOtherIncome = otherIncomeMonthly > 0 ? otherIncomeMonthly : null;
        if (otherIncomeMonthly > 0) {
            monthlyNetIncome = (monthlyNetIncome != null ? monthlyNetIncome : 0f) + otherIncomeMonthly;
            // Si on n'a pas de contrat actif mais qu'il y a au moins un revenu locatif/aide,
            // on remonte du statut NONE pour que le frontend cesse d'afficher "Aucun contrat actif".
            if ("NONE".equals(incomeSource)) {
                incomeSource = "OTHER_INCOME_ONLY";
            }
        }

        float income = monthlyNetIncome != null ? monthlyNetIncome : 0f;
        float savingsCapacity = income - totalMonthly;
        Float savingsRate = income > 0 ? (savingsCapacity / income) * 100f : null;

        return new ExpenseSummaryDto(
                monthlyNetIncome,
                incomeSource,
                totalMonthly,
                totalAnnual,
                savingsCapacity,
                savingsRate,
                byCategory,
                breakdownNetImposable,
                breakdownEstimatedTax,
                breakdownBenefits,
                breakdownMealVoucherEmployer,
                breakdownMonthlyBonuses,
                breakdownOtherIncome
        );
    }

    // ── Vérification propriété ─────────────────────────────────

    private RecurringExpense getExpenseWithOwnershipCheck(Long id, User currentUser) {
        RecurringExpense expense = recurringExpenseRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Dépense introuvable : " + id));

        boolean isOwner = expense.getUser().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole() == RoleEnum.ADMIN;

        if (!isOwner && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Accès non autorisé à cette dépense");
        }
        return expense;
    }
}
