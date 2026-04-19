package com.myfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.domain.ExpenseCategoryEnum;
import com.myfinance.dto.UpsertUserBudgetsRequest;
import com.myfinance.service.UserBudgetService;
import com.myfinance.support.WithMockCustomUser;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserBudgetController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class UserBudgetControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean UserBudgetService userBudgetService;

    @Test
    @WithMockCustomUser
    void getBudgets_retourne200() throws Exception {
        when(userBudgetService.getBudgets(any())).thenReturn(
                Map.of(ExpenseCategoryEnum.LOGEMENT, 900f));

        mockMvc.perform(get("/api/expense-budgets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.LOGEMENT").value(900.0));
    }

    @Test
    void getBudgets_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/expense-budgets"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockCustomUser
    void upsertAll_retourne200() throws Exception {
        Map<ExpenseCategoryEnum, Float> budgets = Map.of(
                ExpenseCategoryEnum.LOGEMENT, 900f,
                ExpenseCategoryEnum.TRANSPORT, 200f
        );
        when(userBudgetService.upsertAll(any(), any())).thenReturn(budgets);

        mockMvc.perform(put("/api/expense-budgets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpsertUserBudgetsRequest(budgets))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.LOGEMENT").value(900.0));
    }

    @Test
    void upsertAll_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(put("/api/expense-budgets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockCustomUser
    void upsertAll_avecCorpsInvalide_retourne400() throws Exception {
        mockMvc.perform(put("/api/expense-budgets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"budgets\": null}"))
                .andExpect(status().isBadRequest());
    }
}
