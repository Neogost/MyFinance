package com.myfinance.service;

import com.myfinance.domain.ExpenseCategoryEnum;
import com.myfinance.domain.User;
import com.myfinance.domain.UserBudget;
import com.myfinance.dto.UpsertUserBudgetsRequest;
import com.myfinance.repository.UserBudgetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserBudgetService {

    private final UserBudgetRepository userBudgetRepository;

    public Map<ExpenseCategoryEnum, Float> getBudgets(User user) {
        Map<ExpenseCategoryEnum, Float> result = new EnumMap<>(ExpenseCategoryEnum.class);
        userBudgetRepository.findByUser(user)
                .forEach(b -> result.put(b.getCategory(), b.getMonthlyLimit()));
        return result;
    }

    @Transactional
    public Map<ExpenseCategoryEnum, Float> upsertAll(UpsertUserBudgetsRequest request, User user) {
        userBudgetRepository.deleteByUser(user);

        if (request.budgets() != null && !request.budgets().isEmpty()) {
            List<UserBudget> toSave = request.budgets().entrySet().stream()
                    .filter(e -> e.getValue() != null && e.getValue() > 0)
                    .map(e -> UserBudget.builder()
                            .user(user)
                            .category(e.getKey())
                            .monthlyLimit(e.getValue())
                            .build())
                    .toList();
            userBudgetRepository.saveAll(toSave);
        }

        return getBudgets(user);
    }
}
