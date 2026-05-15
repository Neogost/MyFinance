package com.myfinance.service;

import com.myfinance.domain.*;
import com.myfinance.dto.*;
import com.myfinance.repository.OtherIncomeRepository;
import com.myfinance.repository.RecurringExpenseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RecurringExpenseServiceTest {

    @Mock RecurringExpenseRepository recurringExpenseRepository;
    @Mock SalaryContractService salaryContractService;
    @Mock OtherIncomeRepository otherIncomeRepository;
    @InjectMocks RecurringExpenseService recurringExpenseService;

    User owner;
    User otherUser;
    User admin;
    RecurringExpense expense;

    @BeforeEach
    void setUp() {
        owner     = User.builder().id(1L).login("owner").role(RoleEnum.USER).build();
        otherUser = User.builder().id(2L).login("other").role(RoleEnum.USER).build();
        admin     = User.builder().id(3L).login("admin").role(RoleEnum.ADMIN).build();

        expense = RecurringExpense.builder()
                .id(1L)
                .user(owner)
                .category(ExpenseCategoryEnum.LOGEMENT)
                .label("Loyer Paris")
                .amount(1000f)
                .frequency(FrequencyEnum.MONTHLY)
                .sharePercentage(50f)
                .build();

        // Par défaut : aucun OtherIncome récurrent (les tests qui en ont besoin override).
        lenient().when(otherIncomeRepository.findByUserOrderByDateDesc(any())).thenReturn(List.of());
    }

    // ── findAllByUser ──────────────────────────────────────────

    @Test
    void findAllByUser_retourneLaListeAvecMontantsCalcules() {
        when(recurringExpenseRepository.findByUserOrderByCategoryAscLabelAsc(owner))
                .thenReturn(List.of(expense));

        List<RecurringExpenseDto> result = recurringExpenseService.findAllByUser(owner);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).label()).isEqualTo("Loyer Paris");
        // 1000 × 50% = 500 mensuel
        assertThat(result.get(0).monthlyAmount()).isEqualTo(500f);
        assertThat(result.get(0).annualAmount()).isEqualTo(6000f);
    }

    @Test
    void findAllByUser_retourneListeVide_siAucuneDependance() {
        when(recurringExpenseRepository.findByUserOrderByCategoryAscLabelAsc(owner))
                .thenReturn(List.of());

        assertThat(recurringExpenseService.findAllByUser(owner)).isEmpty();
    }

    // ── create ─────────────────────────────────────────────────

    @Test
    void create_sauvegardeEtRetourneLDto() {
        CreateRecurringExpenseRequest request = new CreateRecurringExpenseRequest(
                ExpenseCategoryEnum.ABONNEMENTS, "Netflix", 17.99f,
                FrequencyEnum.MONTHLY, 100f, null, null, null, null);

        when(recurringExpenseRepository.save(any(RecurringExpense.class))).thenAnswer(inv -> {
            RecurringExpense e = inv.getArgument(0);
            return RecurringExpense.builder()
                    .id(2L).user(owner)
                    .category(e.getCategory()).label(e.getLabel())
                    .amount(e.getAmount()).frequency(e.getFrequency())
                    .sharePercentage(e.getSharePercentage())
                    .build();
        });

        RecurringExpenseDto result = recurringExpenseService.create(request, owner);

        assertThat(result.id()).isEqualTo(2L);
        assertThat(result.category()).isEqualTo(ExpenseCategoryEnum.ABONNEMENTS);
        assertThat(result.monthlyAmount()).isEqualTo(17.99f);
        verify(recurringExpenseRepository).save(any(RecurringExpense.class));
    }

    // ── projection mensuel / annuel ────────────────────────────

    @Test
    void create_calculeMontantMensuel_pourDepenseAnnuelle() {
        CreateRecurringExpenseRequest request = new CreateRecurringExpenseRequest(
                ExpenseCategoryEnum.ASSURANCES, "Assurance auto", 600f,
                FrequencyEnum.ANNUAL, 100f, null, null, null, null);

        when(recurringExpenseRepository.save(any(RecurringExpense.class))).thenAnswer(inv -> {
            RecurringExpense e = inv.getArgument(0);
            return RecurringExpense.builder()
                    .id(3L).user(owner)
                    .category(e.getCategory()).label(e.getLabel())
                    .amount(e.getAmount()).frequency(e.getFrequency())
                    .sharePercentage(e.getSharePercentage())
                    .build();
        });

        RecurringExpenseDto result = recurringExpenseService.create(request, owner);

        assertThat(result.annualAmount()).isEqualTo(600f);
        assertThat(result.monthlyAmount()).isEqualTo(50f); // 600 / 12
    }

    // ── update ─────────────────────────────────────────────────

    @Test
    void update_modifieLaDependance() {
        UpdateRecurringExpenseRequest request = new UpdateRecurringExpenseRequest(
                ExpenseCategoryEnum.LOGEMENT, "Loyer révisé", 1100f,
                FrequencyEnum.MONTHLY, 50f, null, null, null, null);

        when(recurringExpenseRepository.findById(1L)).thenReturn(Optional.of(expense));
        when(recurringExpenseRepository.save(any(RecurringExpense.class))).thenAnswer(inv -> inv.getArgument(0));

        RecurringExpenseDto result = recurringExpenseService.update(1L, request, owner);

        assertThat(result.label()).isEqualTo("Loyer révisé");
        assertThat(result.amount()).isEqualTo(1100f);
        assertThat(result.monthlyAmount()).isEqualTo(550f); // 1100 × 50%
    }

    @Test
    void update_leve404_siIntrouvable() {
        when(recurringExpenseRepository.findById(99L)).thenReturn(Optional.empty());

        UpdateRecurringExpenseRequest request = new UpdateRecurringExpenseRequest(
                ExpenseCategoryEnum.AUTRE, "Test", 100f, FrequencyEnum.MONTHLY, 100f, null, null, null, null);

        assertThatThrownBy(() -> recurringExpenseService.update(99L, request, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void update_leve403_siAutreUtilisateurNonAdmin() {
        when(recurringExpenseRepository.findById(1L)).thenReturn(Optional.of(expense));

        UpdateRecurringExpenseRequest request = new UpdateRecurringExpenseRequest(
                ExpenseCategoryEnum.LOGEMENT, "Loyer", 1000f, FrequencyEnum.MONTHLY, 50f, null, null, null, null);

        assertThatThrownBy(() -> recurringExpenseService.update(1L, request, otherUser))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(recurringExpenseRepository, never()).save(any());
    }

    @Test
    void update_autorisePourAdmin() {
        when(recurringExpenseRepository.findById(1L)).thenReturn(Optional.of(expense));
        when(recurringExpenseRepository.save(any(RecurringExpense.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateRecurringExpenseRequest request = new UpdateRecurringExpenseRequest(
                ExpenseCategoryEnum.LOGEMENT, "Loyer admin", 1000f, FrequencyEnum.MONTHLY, 50f, null, null, null, null);

        assertThatNoException().isThrownBy(() -> recurringExpenseService.update(1L, request, admin));
    }

    // ── delete ─────────────────────────────────────────────────

    @Test
    void delete_supprimeLaDependance() {
        when(recurringExpenseRepository.findById(1L)).thenReturn(Optional.of(expense));

        recurringExpenseService.delete(1L, owner);

        verify(recurringExpenseRepository).deleteById(1L);
    }

    @Test
    void delete_leve403_siPasLeProprietaire() {
        when(recurringExpenseRepository.findById(1L)).thenReturn(Optional.of(expense));

        assertThatThrownBy(() -> recurringExpenseService.delete(1L, otherUser))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(recurringExpenseRepository, never()).deleteById(any());
    }

    @Test
    void delete_autorisePourAdmin() {
        when(recurringExpenseRepository.findById(1L)).thenReturn(Optional.of(expense));

        recurringExpenseService.delete(1L, admin);

        verify(recurringExpenseRepository).deleteById(1L);
    }

    // ── paymentDay ─────────────────────────────────────────────

    @Test
    void create_persistePaymentDay_pourDepenseMensuelle() {
        CreateRecurringExpenseRequest request = new CreateRecurringExpenseRequest(
                ExpenseCategoryEnum.ABONNEMENTS, "Spotify", 10f,
                FrequencyEnum.MONTHLY, 100f, null, null, null, 8);

        when(recurringExpenseRepository.save(any(RecurringExpense.class))).thenAnswer(inv -> {
            RecurringExpense e = inv.getArgument(0);
            assertThat(e.getPaymentDay()).isEqualTo(8);
            return RecurringExpense.builder()
                    .id(5L).user(owner)
                    .category(e.getCategory()).label(e.getLabel())
                    .amount(e.getAmount()).frequency(e.getFrequency())
                    .sharePercentage(e.getSharePercentage())
                    .paymentDay(e.getPaymentDay())
                    .build();
        });

        RecurringExpenseDto result = recurringExpenseService.create(request, owner);
        assertThat(result.paymentDay()).isEqualTo(8);
    }

    @Test
    void create_ignorePaysmentDay_pourDepenseAnnuelle() {
        CreateRecurringExpenseRequest request = new CreateRecurringExpenseRequest(
                ExpenseCategoryEnum.ASSURANCES, "Assurance vie", 500f,
                FrequencyEnum.ANNUAL, 100f, null, null, null, 15);

        when(recurringExpenseRepository.save(any(RecurringExpense.class))).thenAnswer(inv -> {
            RecurringExpense e = inv.getArgument(0);
            // Pour ANNUAL, paymentDay doit être forcé à null côté service
            assertThat(e.getPaymentDay()).isNull();
            return RecurringExpense.builder()
                    .id(6L).user(owner)
                    .category(e.getCategory()).label(e.getLabel())
                    .amount(e.getAmount()).frequency(e.getFrequency())
                    .sharePercentage(e.getSharePercentage())
                    .build();
        });

        recurringExpenseService.create(request, owner);
        verify(recurringExpenseRepository).save(argThat(e -> e.getPaymentDay() == null));
    }

    @Test
    void update_miseAJourPaymentDay() {
        UpdateRecurringExpenseRequest request = new UpdateRecurringExpenseRequest(
                ExpenseCategoryEnum.LOGEMENT, "Loyer Paris", 1000f,
                FrequencyEnum.MONTHLY, 50f, null, null, null, 5);

        when(recurringExpenseRepository.findById(1L)).thenReturn(Optional.of(expense));
        when(recurringExpenseRepository.save(any(RecurringExpense.class))).thenAnswer(inv -> inv.getArgument(0));

        RecurringExpenseDto result = recurringExpenseService.update(1L, request, owner);
        assertThat(result.paymentDay()).isEqualTo(5);
    }

    // ── getSummary ─────────────────────────────────────────────

    @Test
    void getSummary_calculeSavingsCapacity_avecContratActif() {
        when(recurringExpenseRepository.findByUserOrderByCategoryAscLabelAsc(owner))
                .thenReturn(List.of(expense)); // 500€/mois après répartition

        SalaryContractDto activeContract = buildContractDto(null, 3000f, null);
        when(salaryContractService.findAllByUser(owner)).thenReturn(List.of(activeContract));

        ExpenseSummaryDto summary = recurringExpenseService.getSummary(owner);

        assertThat(summary.monthlyNetIncome()).isEqualTo(3000f);
        assertThat(summary.incomeSource()).isEqualTo("NET_AFTER_TAX");
        assertThat(summary.totalMonthlyExpenses()).isEqualTo(500f);
        assertThat(summary.savingsCapacity()).isEqualTo(2500f);
        assertThat(summary.savingsRate()).isCloseTo(83.33f, within(0.1f));
    }

    @Test
    void getSummary_fallbackNetImposable_siNetAfterTaxNull() {
        when(recurringExpenseRepository.findByUserOrderByCategoryAscLabelAsc(owner))
                .thenReturn(List.of());

        SalaryContractDto activeContract = buildContractDto(null, null, 3500f);
        when(salaryContractService.findAllByUser(owner)).thenReturn(List.of(activeContract));

        ExpenseSummaryDto summary = recurringExpenseService.getSummary(owner);

        assertThat(summary.incomeSource()).isEqualTo("NET_IMPOSABLE");
        assertThat(summary.monthlyNetIncome()).isEqualTo(3500f);
    }

    @Test
    void getSummary_incomeNone_siAucunContratActif() {
        when(recurringExpenseRepository.findByUserOrderByCategoryAscLabelAsc(owner))
                .thenReturn(List.of());

        // Contrat avec endDate = passé → pas actif
        SalaryContractDto closedContract = buildContractDtoWithEndDate(
                LocalDate.of(2024, 12, 31), 3000f, null);
        when(salaryContractService.findAllByUser(owner)).thenReturn(List.of(closedContract));

        ExpenseSummaryDto summary = recurringExpenseService.getSummary(owner);

        assertThat(summary.incomeSource()).isEqualTo("NONE");
        assertThat(summary.monthlyNetIncome()).isNull();
        assertThat(summary.savingsCapacity()).isEqualTo(0f);
        assertThat(summary.savingsRate()).isNull();
    }

    @Test
    void getSummary_exclutDepensesTerminees() {
        RecurringExpense terminee = RecurringExpense.builder()
                .id(2L).user(owner)
                .category(ExpenseCategoryEnum.ABONNEMENTS)
                .label("Abonnement terminé").amount(50f)
                .frequency(FrequencyEnum.MONTHLY).sharePercentage(100f)
                .endDate(LocalDate.now().minusDays(1))
                .build();

        when(recurringExpenseRepository.findByUserOrderByCategoryAscLabelAsc(owner))
                .thenReturn(List.of(expense, terminee));
        when(salaryContractService.findAllByUser(owner)).thenReturn(List.of());

        ExpenseSummaryDto summary = recurringExpenseService.getSummary(owner);

        // Seule expense (500€) est active, terminee est exclue
        assertThat(summary.totalMonthlyExpenses()).isEqualTo(500f);
    }

    @Test
    void getSummary_groupeParCategorie() {
        RecurringExpense abonnement = RecurringExpense.builder()
                .id(2L).user(owner)
                .category(ExpenseCategoryEnum.ABONNEMENTS)
                .label("Netflix").amount(17.99f)
                .frequency(FrequencyEnum.MONTHLY).sharePercentage(100f)
                .build();

        when(recurringExpenseRepository.findByUserOrderByCategoryAscLabelAsc(owner))
                .thenReturn(List.of(expense, abonnement));
        when(salaryContractService.findAllByUser(owner)).thenReturn(List.of());

        ExpenseSummaryDto summary = recurringExpenseService.getSummary(owner);

        assertThat(summary.byCategory()).hasSize(2);
        assertThat(summary.byCategory()).anySatisfy(c ->
                assertThat(c.category()).isEqualTo(ExpenseCategoryEnum.LOGEMENT));
        assertThat(summary.byCategory()).anySatisfy(c ->
                assertThat(c.category()).isEqualTo(ExpenseCategoryEnum.ABONNEMENTS));
    }

    // ── helpers ────────────────────────────────────────────────

    private SalaryContractDto buildContractDto(LocalDate endDate, Float monthlyNetAfterTax, Float monthlyNetImposable) {
        return new SalaryContractDto(
                1L, null, null, null, null,
                "Entreprise", LocalDate.of(2023, 1, 1), endDate,
                36000f, null, 100f, null, 12, 35f, 0f, 0f, false, null,
                monthlyNetImposable != null ? monthlyNetImposable * 12 : 28000f,
                3000f,
                monthlyNetImposable != null ? monthlyNetImposable : 2333f,
                1820f, 19.78f, 12.83f, 151.67f, 116.67f, 0f, 0f,
                monthlyNetAfterTax != null ? monthlyNetAfterTax * 12 : null,
                monthlyNetAfterTax,
                monthlyNetAfterTax != null ? monthlyNetAfterTax / 20f : null,
                monthlyNetAfterTax != null ? monthlyNetAfterTax / 151.67f : null,
                null, 0f,
                46800f, 3900f, 195f, 30f, 0f
        );
    }

    private SalaryContractDto buildContractDtoWithEndDate(LocalDate endDate, Float monthlyNetAfterTax, Float monthlyNetImposable) {
        return buildContractDto(endDate, monthlyNetAfterTax, monthlyNetImposable);
    }
}
