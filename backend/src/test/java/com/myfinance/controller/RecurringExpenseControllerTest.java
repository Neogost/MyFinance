package com.myfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.domain.ExpenseCategoryEnum;
import com.myfinance.domain.FrequencyEnum;
import com.myfinance.dto.*;
import com.myfinance.service.RecurringExpenseService;
import com.myfinance.support.WithMockCustomUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(RecurringExpenseController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class RecurringExpenseControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean RecurringExpenseService recurringExpenseService;

    RecurringExpenseDto expenseDto;

    @BeforeEach
    void setUp() {
        expenseDto = new RecurringExpenseDto(
                1L, ExpenseCategoryEnum.LOGEMENT, "Loyer Paris",
                1000f, FrequencyEnum.MONTHLY, 50f,
                500f, 6000f, null, null, null);
    }

    // ── GET /api/recurring-expenses ────────────────────────────

    @Test
    @WithMockCustomUser
    void findAll_retourne200AvecLaListe() throws Exception {
        when(recurringExpenseService.findAllByUser(any())).thenReturn(List.of(expenseDto));

        mockMvc.perform(get("/api/recurring-expenses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].category").value("LOGEMENT"))
                .andExpect(jsonPath("$[0].monthlyAmount").value(500.0));
    }

    @Test
    void findAll_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/recurring-expenses"))
                .andExpect(status().isUnauthorized());
    }

    // ── GET /api/recurring-expenses/summary ───────────────────

    @Test
    @WithMockCustomUser
    void getSummary_retourne200() throws Exception {
        ExpenseSummaryDto summary = new ExpenseSummaryDto(
                3000f, "NET_AFTER_TAX", 500f, 6000f, 2500f, 83.33f, List.of());
        when(recurringExpenseService.getSummary(any())).thenReturn(summary);

        mockMvc.perform(get("/api/recurring-expenses/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.monthlyNetIncome").value(3000.0))
                .andExpect(jsonPath("$.savingsCapacity").value(2500.0))
                .andExpect(jsonPath("$.incomeSource").value("NET_AFTER_TAX"));
    }

    @Test
    void getSummary_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/recurring-expenses/summary"))
                .andExpect(status().isUnauthorized());
    }

    // ── POST /api/recurring-expenses ──────────────────────────

    @Test
    @WithMockCustomUser
    void create_avecCorpsValide_retourne201() throws Exception {
        CreateRecurringExpenseRequest request = new CreateRecurringExpenseRequest(
                ExpenseCategoryEnum.LOGEMENT, "Loyer Paris",
                1000f, FrequencyEnum.MONTHLY, 50f, null, null, null);

        when(recurringExpenseService.create(any(), any())).thenReturn(expenseDto);

        mockMvc.perform(post("/api/recurring-expenses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.label").value("Loyer Paris"))
                .andExpect(jsonPath("$.category").value("LOGEMENT"));
    }

    @Test
    @WithMockCustomUser
    void create_avecMontantNegatif_retourne400() throws Exception {
        CreateRecurringExpenseRequest request = new CreateRecurringExpenseRequest(
                ExpenseCategoryEnum.LOGEMENT, "Loyer", -500f, FrequencyEnum.MONTHLY, 100f, null, null, null);

        mockMvc.perform(post("/api/recurring-expenses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockCustomUser
    void create_avecLabelVide_retourne400() throws Exception {
        CreateRecurringExpenseRequest request = new CreateRecurringExpenseRequest(
                ExpenseCategoryEnum.ABONNEMENTS, "", 17.99f, FrequencyEnum.MONTHLY, 100f, null, null, null);

        mockMvc.perform(post("/api/recurring-expenses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    // ── PUT /api/recurring-expenses/{id} ──────────────────────

    @Test
    @WithMockCustomUser
    void update_avecCorpsValide_retourne200() throws Exception {
        UpdateRecurringExpenseRequest request = new UpdateRecurringExpenseRequest(
                ExpenseCategoryEnum.LOGEMENT, "Loyer révisé", 1100f,
                FrequencyEnum.MONTHLY, 50f, null, null, null);
        RecurringExpenseDto updated = new RecurringExpenseDto(
                1L, ExpenseCategoryEnum.LOGEMENT, "Loyer révisé",
                1100f, FrequencyEnum.MONTHLY, 50f,
                550f, 6600f, null, null, null);

        when(recurringExpenseService.update(eq(1L), any(), any())).thenReturn(updated);

        mockMvc.perform(put("/api/recurring-expenses/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.label").value("Loyer révisé"))
                .andExpect(jsonPath("$.monthlyAmount").value(550.0));
    }

    @Test
    @WithMockCustomUser
    void update_retourne403_siAccesNonAutorise() throws Exception {
        UpdateRecurringExpenseRequest request = new UpdateRecurringExpenseRequest(
                ExpenseCategoryEnum.LOGEMENT, "Loyer", 1000f, FrequencyEnum.MONTHLY, 50f, null, null, null);

        when(recurringExpenseService.update(eq(1L), any(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));

        mockMvc.perform(put("/api/recurring-expenses/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockCustomUser
    void update_retourne404_siIntrouvable() throws Exception {
        UpdateRecurringExpenseRequest request = new UpdateRecurringExpenseRequest(
                ExpenseCategoryEnum.AUTRE, "Test", 100f, FrequencyEnum.MONTHLY, 100f, null, null, null);

        when(recurringExpenseService.update(eq(99L), any(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));

        mockMvc.perform(put("/api/recurring-expenses/99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    // ── DELETE /api/recurring-expenses/{id} ───────────────────

    @Test
    @WithMockCustomUser
    void delete_retourne204() throws Exception {
        mockMvc.perform(delete("/api/recurring-expenses/1"))
                .andExpect(status().isNoContent());

        verify(recurringExpenseService).delete(eq(1L), any());
    }

    @Test
    @WithMockCustomUser
    void delete_retourne403_siAccesNonAutorise() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.FORBIDDEN))
                .when(recurringExpenseService).delete(eq(1L), any());

        mockMvc.perform(delete("/api/recurring-expenses/1"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockCustomUser
    void delete_retourne404_siIntrouvable() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.NOT_FOUND))
                .when(recurringExpenseService).delete(eq(99L), any());

        mockMvc.perform(delete("/api/recurring-expenses/99"))
                .andExpect(status().isNotFound());
    }
}
