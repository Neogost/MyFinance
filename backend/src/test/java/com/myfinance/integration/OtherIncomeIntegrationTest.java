package com.myfinance.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.domain.OtherIncomeTypeEnum;
import com.myfinance.dto.CreateOtherIncomeRequest;
import com.myfinance.dto.UpdateOtherIncomeRequest;
import com.myfinance.repository.OtherIncomeRepository;
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
 * Test d'intégration end-to-end : security + JPA + service + controller en chaîne réelle.
 *
 * Scénario : login admin → CRUD complet sur /api/other-incomes → vérification en DB via repository.
 * Aucun mock — toute la stack tourne pour de vrai (SQLite in-memory).
 *
 * Démontre le pattern documenté en section 9.7 de PATTERNS-backend.md.
 */
@SpringBootTest
@ActiveProfiles("integration")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class OtherIncomeIntegrationTest {

    @Autowired WebApplicationContext context;
    @Autowired ObjectMapper objectMapper;
    @Autowired OtherIncomeRepository otherIncomeRepository;

    MockMvc mockMvc;

    /**
     * Build manuel du MockMvc avec springSecurity() — sans cela, les filtres Spring Security
     * ne sont pas appliqués et le login (POST /api/auth/login) ne fonctionne pas.
     */
    private MockMvc buildMockMvc() {
        if (mockMvc == null) {
            mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        }
        return mockMvc;
    }

    @Test
    void scenario_completCrud_chaineReelleSecuriteEtJpa() throws Exception {
        MockMvc mvc = buildMockMvc();

        // ── 1. Sans authentification → 401 ──────────────────────────────────
        mvc.perform(get("/api/other-incomes"))
                .andExpect(status().isUnauthorized());

        // ── 2. Login admin (DataInitializer créé via le profile) ────────────
        MvcResult loginResult = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("username", "admin")
                        .param("password", "IntegrationTestPass1!"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.login").value("admin"))
                .andExpect(jsonPath("$.role").value("ADMIN"))
                .andReturn();

        // MockMvc ne fait pas suivre le cookie JSESSIONID automatiquement —
        // on récupère la MockHttpSession créée par Spring Security pour la passer
        // aux requêtes suivantes (équivalent du cookie de session côté navigateur).
        MockHttpSession session = (MockHttpSession) loginResult.getRequest().getSession(false);
        assertThat(session).as("session HTTP créée après login").isNotNull();

        // ── 3. Liste vide au démarrage ──────────────────────────────────────
        mvc.perform(get("/api/other-incomes").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        // ── 4. Création d'un revenu ─────────────────────────────────────────
        CreateOtherIncomeRequest createReq = new CreateOtherIncomeRequest(
                OtherIncomeTypeEnum.LOCATIF, "Loyer T2 Lyon", 850f,
                LocalDate.of(2026, 5, 1), true, null, null, null, null, null);

        MvcResult createResult = mvc.perform(post("/api/other-incomes")
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.label").value("Loyer T2 Lyon"))
                .andExpect(jsonPath("$.amount").value(850f))
                .andExpect(jsonPath("$.type").value("LOCATIF"))
                .andReturn();

        Long createdId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("id").asLong();

        // Vérification directe en base via le repository (pas un mock)
        assertThat(otherIncomeRepository.findById(createdId))
                .as("revenu persisté en DB après POST")
                .isPresent()
                .hasValueSatisfying(income -> {
                    assertThat(income.getLabel()).isEqualTo("Loyer T2 Lyon");
                    assertThat(income.getAmount()).isEqualTo(850f);
                });

        // ── 5. Liste après création — 1 élément ─────────────────────────────
        mvc.perform(get("/api/other-incomes").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(createdId));

        // ── 6. Modification ─────────────────────────────────────────────────
        UpdateOtherIncomeRequest updateReq = new UpdateOtherIncomeRequest(
                OtherIncomeTypeEnum.LOCATIF, "Loyer T2 Lyon (révisé)", 900f,
                LocalDate.of(2026, 5, 1), true, null, null, null, null, null);

        mvc.perform(put("/api/other-incomes/" + createdId)
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.label").value("Loyer T2 Lyon (révisé)"))
                .andExpect(jsonPath("$.amount").value(900f));

        // ── 7. Validation rejetée (Bean Validation réelle) ──────────────────
        CreateOtherIncomeRequest invalidReq = new CreateOtherIncomeRequest(
                OtherIncomeTypeEnum.LOCATIF, "", -100f,
                LocalDate.of(2026, 5, 1), true, null, null, null, null, null);

        mvc.perform(post("/api/other-incomes")
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidReq)))
                .andExpect(status().isBadRequest());

        // ── 8. Suppression ──────────────────────────────────────────────────
        mvc.perform(delete("/api/other-incomes/" + createdId).session(session))
                .andExpect(status().isNoContent());

        assertThat(otherIncomeRepository.findById(createdId))
                .as("revenu supprimé en DB après DELETE")
                .isEmpty();

        // ── 9. Logout ───────────────────────────────────────────────────────
        mvc.perform(post("/api/auth/logout").session(session))
                .andExpect(status().isOk());
    }
}
