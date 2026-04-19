package com.myfinance.service;

import com.myfinance.domain.*;
import com.myfinance.dto.UpsertUserBudgetsRequest;
import com.myfinance.repository.UserBudgetRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserBudgetServiceTest {

    @Mock UserBudgetRepository userBudgetRepository;
    @InjectMocks UserBudgetService userBudgetService;

    User owner;

    @BeforeEach
    void setUp() {
        owner = User.builder().id(1L).login("owner").role(RoleEnum.USER).build();
    }

    @Test
    void getBudgets_retourneLaMap() {
        UserBudget b1 = UserBudget.builder().id(1L).user(owner)
                .category(ExpenseCategoryEnum.LOGEMENT).monthlyLimit(900f).build();
        UserBudget b2 = UserBudget.builder().id(2L).user(owner)
                .category(ExpenseCategoryEnum.TRANSPORT).monthlyLimit(200f).build();

        when(userBudgetRepository.findByUser(owner)).thenReturn(List.of(b1, b2));

        Map<ExpenseCategoryEnum, Float> result = userBudgetService.getBudgets(owner);

        assertThat(result).hasSize(2);
        assertThat(result.get(ExpenseCategoryEnum.LOGEMENT)).isEqualTo(900f);
        assertThat(result.get(ExpenseCategoryEnum.TRANSPORT)).isEqualTo(200f);
    }

    @Test
    void getBudgets_sansEntrees_retourneMapVide() {
        when(userBudgetRepository.findByUser(owner)).thenReturn(List.of());

        assertThat(userBudgetService.getBudgets(owner)).isEmpty();
    }

    @Test
    void upsertAll_supprimePuisSauvegarde() {
        Map<ExpenseCategoryEnum, Float> budgets = Map.of(
                ExpenseCategoryEnum.LOGEMENT, 900f,
                ExpenseCategoryEnum.TRANSPORT, 200f
        );
        when(userBudgetRepository.findByUser(owner)).thenReturn(List.of(
                UserBudget.builder().user(owner).category(ExpenseCategoryEnum.LOGEMENT).monthlyLimit(900f).build(),
                UserBudget.builder().user(owner).category(ExpenseCategoryEnum.TRANSPORT).monthlyLimit(200f).build()
        ));

        Map<ExpenseCategoryEnum, Float> result = userBudgetService.upsertAll(
                new UpsertUserBudgetsRequest(budgets), owner);

        verify(userBudgetRepository).deleteByUser(owner);
        verify(userBudgetRepository).saveAll(any());
        assertThat(result).hasSize(2);
    }

    @Test
    void upsertAll_avecMapVide_supprimeTout() {
        when(userBudgetRepository.findByUser(owner)).thenReturn(List.of());

        userBudgetService.upsertAll(new UpsertUserBudgetsRequest(Map.of()), owner);

        verify(userBudgetRepository).deleteByUser(owner);
        verify(userBudgetRepository, never()).saveAll(any());
    }

    @Test
    void upsertAll_ignoreLesValeursNegativesOuNulles() {
        Map<ExpenseCategoryEnum, Float> budgets = Map.of(
                ExpenseCategoryEnum.LOGEMENT, 900f,
                ExpenseCategoryEnum.TRANSPORT, 0f
        );
        when(userBudgetRepository.findByUser(owner)).thenReturn(List.of(
                UserBudget.builder().user(owner).category(ExpenseCategoryEnum.LOGEMENT).monthlyLimit(900f).build()
        ));

        Map<ExpenseCategoryEnum, Float> result = userBudgetService.upsertAll(
                new UpsertUserBudgetsRequest(budgets), owner);

        assertThat(result).hasSize(1);
        assertThat(result).containsKey(ExpenseCategoryEnum.LOGEMENT);
        assertThat(result).doesNotContainKey(ExpenseCategoryEnum.TRANSPORT);
    }
}
