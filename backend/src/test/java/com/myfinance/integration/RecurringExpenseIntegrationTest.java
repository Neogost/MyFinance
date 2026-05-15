package com.myfinance.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.domain.ExpenseCategoryEnum;
import com.myfinance.domain.FrequencyEnum;
import com.myfinance.dto.CreateRecurringExpenseRequest;
import com.myfinance.dto.UpdateRecurringExpenseRequest;
import com.myfinance.repository.RecurringExpenseRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Test d'intégration du module Dépenses récurrentes : security + JPA + service + controller.
 * Couvre le CRUD complet ainsi que l'endpoint /summary qui calcule la répartition par catégorie.
 */
@SpringBootTest
@ActiveProfiles("integration")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class RecurringExpenseIntegrationTest {

    @Autowired WebApplicationContext context;
    @Autowired ObjectMapper objectMapper;
    @Autowired RecurringExpenseRepository expenseRepository;

    private MockMvc buildMockMvc() {
        return MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @Test
    void scenario_completCrud_etSummary() throws Exception {
        MockMvc mvc = buildMockMvc();
        MockHttpSession session = login(mvc);

        // ── Liste vide ──────────────────────────────────────────────────────
        mvc.perform(get("/api/recurring-expenses").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        // ── Création d'une dépense ──────────────────────────────────────────
        CreateRecurringExpenseRequest createReq = new CreateRecurringExpenseRequest(
                ExpenseCategoryEnum.LOGEMENT, "Loyer mensuel", 800f,
                FrequencyEnum.MONTHLY, 100f,
                LocalDate.of(2026, 1, 1), null,
                "Loyer + charges", 5);

        MvcResult createResult = mvc.perform(post("/api/recurring-expenses")
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.label").value("Loyer mensuel"))
                .andExpect(jsonPath("$.category").value("LOGEMENT"))
                .andExpect(jsonPath("$.monthlyAmount").value(800f))
                .andReturn();

        Long createdId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("id").asLong();

        // Vérif en DB
        assertThat(expenseRepository.findById(createdId))
                .as("dépense persistée en DB")
                .isPresent()
                .hasValueSatisfying(e -> {
                    assertThat(e.getLabel()).isEqualTo("Loyer mensuel");
                    assertThat(e.getAmount()).isEqualTo(800f);
                    assertThat(e.getPaymentDay()).isEqualTo(5);
                });

        // ── Endpoint /summary : répartition par catégorie ───────────────────
        mvc.perform(get("/api/recurring-expenses/summary").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalMonthlyExpenses").value(800f));

        // ── Modification ────────────────────────────────────────────────────
        UpdateRecurringExpenseRequest updateReq = new UpdateRecurringExpenseRequest(
                ExpenseCategoryEnum.LOGEMENT, "Loyer mensuel (révisé)", 850f,
                FrequencyEnum.MONTHLY, 100f,
                LocalDate.of(2026, 1, 1), null,
                "Loyer + charges + augmentation", 5);

        mvc.perform(put("/api/recurring-expenses/" + createdId)
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.amount").value(850f));

        // ── Validation Bean Validation : sharePercentage hors bornes ────────
        CreateRecurringExpenseRequest invalid = new CreateRecurringExpenseRequest(
                ExpenseCategoryEnum.ALIMENTATION, "Test invalide", 100f,
                FrequencyEnum.MONTHLY, 150f,  // > 100% : viole @DecimalMax
                null, null, null, null);

        mvc.perform(post("/api/recurring-expenses")
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest());

        // ── Suppression ─────────────────────────────────────────────────────
        mvc.perform(delete("/api/recurring-expenses/" + createdId).session(session))
                .andExpect(status().isNoContent());

        assertThat(expenseRepository.findById(createdId))
                .as("dépense supprimée en DB")
                .isEmpty();
    }

    @Test
    void operations_sansAuthentification_retournent401() throws Exception {
        MockMvc mvc = buildMockMvc();
        mvc.perform(get("/api/recurring-expenses")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/recurring-expenses/summary")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/recurring-expenses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    private MockHttpSession login(MockMvc mvc) throws Exception {
        MvcResult result = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("username", "admin")
                        .param("password", "IntegrationTestPass1!"))
                .andExpect(status().isOk())
                .andReturn();
        return (MockHttpSession) result.getRequest().getSession(false);
    }
}
