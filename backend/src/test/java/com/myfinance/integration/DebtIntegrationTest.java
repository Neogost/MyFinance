package com.myfinance.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.domain.DebtTypeEnum;
import com.myfinance.dto.CreateDebtBalanceEntryRequest;
import com.myfinance.dto.CreateDebtRequest;
import com.myfinance.repository.DebtBalanceEntryRepository;
import com.myfinance.repository.DebtRepository;
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

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Test d'intégration du module Dettes : security + JPA + service + controller.
 *
 * Couvre :
 * - le CRUD principal sur /api/debts
 * - les sous-ressources /api/debts/{id}/balance-entries (cascade attendue à la suppression du parent)
 * - le tableau d'amortissement calculé (nextMonthsSchedule)
 */
@SpringBootTest
@ActiveProfiles("integration")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class DebtIntegrationTest {

    @Autowired WebApplicationContext context;
    @Autowired ObjectMapper objectMapper;
    @Autowired DebtRepository debtRepository;
    @Autowired DebtBalanceEntryRepository balanceEntryRepository;

    private MockMvc buildMockMvc() {
        return MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @Test
    void scenario_completCrud_avecAmortissement() throws Exception {
        MockMvc mvc = buildMockMvc();
        MockHttpSession session = login(mvc);

        // ── Création d'une dette immobilier ─────────────────────────────────
        CreateDebtRequest createReq = new CreateDebtRequest(
                DebtTypeEnum.IMMOBILIER,
                "Crédit appartement",
                "BNP Paribas",
                LocalDate.of(2020, 1, 1),
                LocalDate.of(2045, 1, 1),
                new BigDecimal("200000"),
                new BigDecimal("0.035"),     // 3.5 % annuel
                new BigDecimal("0.003"),     // 0.3 % assurance
                new BigDecimal("950"),       // mensualité
                null,
                "EUR",
                null
        );

        MvcResult createResult = mvc.perform(post("/api/debts")
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.label").value("Crédit appartement"))
                .andExpect(jsonPath("$.type").value("IMMOBILIER"))
                .andReturn();

        Long debtId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("id").asLong();

        assertThat(debtRepository.findById(debtId)).isPresent();

        // ── GET détail : doit retourner le tableau d'amortissement calculé ──
        mvc.perform(get("/api/debts/" + debtId).session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nextMonthsSchedule").isArray())
                .andExpect(jsonPath("$.nextMonthsSchedule.length()").value(12));  // 12 mois projetés

        // ── Endpoint /summary ───────────────────────────────────────────────
        mvc.perform(get("/api/debts/summary").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCount").value(1));
    }

    @Test
    void balanceEntries_souRessources_creationEtCascadeAuDelete() throws Exception {
        MockMvc mvc = buildMockMvc();
        MockHttpSession session = login(mvc);

        // Création de la dette parent
        Long debtId = createDebt(mvc, session);

        // ── Ajout d'une balance entry manuelle ──────────────────────────────
        CreateDebtBalanceEntryRequest entryReq = new CreateDebtBalanceEntryRequest(
                LocalDate.of(2026, 4, 15),
                new BigDecimal("180000"),
                "Relevé bancaire avril 2026"
        );

        mvc.perform(post("/api/debts/" + debtId + "/balance-entries")
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(entryReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.balance").value(180000))
                .andExpect(jsonPath("$.note").value("Relevé bancaire avril 2026"));

        // ── Liste : 1 entry ─────────────────────────────────────────────────
        mvc.perform(get("/api/debts/" + debtId + "/balance-entries").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        assertThat(balanceEntryRepository.findAll())
                .as("balance entry persistée en DB")
                .hasSize(1);

        // ── Cascade : suppression de la dette → suppression des entries ─────
        mvc.perform(delete("/api/debts/" + debtId).session(session))
                .andExpect(status().isNoContent());

        assertThat(debtRepository.findById(debtId)).as("dette supprimée").isEmpty();
        assertThat(balanceEntryRepository.findAll())
                .as("balance entries supprimées en cascade")
                .isEmpty();
    }

    @Test
    void operations_sansAuthentification_retournent401() throws Exception {
        MockMvc mvc = buildMockMvc();
        mvc.perform(get("/api/debts")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/debts/summary")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/debts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Long createDebt(MockMvc mvc, MockHttpSession session) throws Exception {
        CreateDebtRequest req = new CreateDebtRequest(
                DebtTypeEnum.VEHICULE, "Crédit voiture", "Cetelem",
                LocalDate.of(2022, 6, 1), LocalDate.of(2027, 6, 1),
                new BigDecimal("15000"), new BigDecimal("0.045"),
                null, new BigDecimal("300"), null, "EUR", null);

        MvcResult result = mvc.perform(post("/api/debts")
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .get("id").asLong();
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
