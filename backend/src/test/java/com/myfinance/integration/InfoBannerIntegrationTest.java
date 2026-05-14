package com.myfinance.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.domain.InfoBannerAudience;
import com.myfinance.domain.InfoBannerType;
import com.myfinance.domain.RoleEnum;
import com.myfinance.dto.CreateInfoBannerRequest;
import com.myfinance.dto.CreateUserRequest;
import com.myfinance.dto.UpdateInfoBannerRequest;
import com.myfinance.repository.InfoBannerRepository;
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

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Test d'intégration end-to-end des bannières d'information.
 * Couvre : sécurité, filtre audience, CRUD complet, validation Bean Validation, JPA SQLite.
 * Aucun mock — toute la stack tourne sur SQLite in-memory.
 */
@SpringBootTest
@ActiveProfiles("integration")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class InfoBannerIntegrationTest {

    @Autowired WebApplicationContext context;
    @Autowired ObjectMapper objectMapper;
    @Autowired InfoBannerRepository infoBannerRepository;

    MockMvc mockMvc;

    private MockMvc mvc() {
        if (mockMvc == null) {
            mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        }
        return mockMvc;
    }

    private MockHttpSession loginAs(String username, String password) throws Exception {
        MvcResult result = mvc().perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("username", username)
                        .param("password", password))
                .andExpect(status().isOk())
                .andReturn();
        return (MockHttpSession) result.getRequest().getSession(false);
    }

    @Test
    void scenario_crud_securite_filtrageAudience() throws Exception {

        // ── 1. Sans authentification → 401 ──────────────────────────────────
        mvc().perform(get("/api/info-banners/active")).andExpect(status().isUnauthorized());
        mvc().perform(get("/api/admin/info-banners")).andExpect(status().isUnauthorized());

        // ── 2. Login admin ───────────────────────────────────────────────────
        MockHttpSession adminSession = loginAs("admin", "IntegrationTestAdminPass1!");
        assertThat(adminSession).as("session admin créée").isNotNull();

        // ── 3. Créer un compte USER pour tester le filtrage audience ─────────
        CreateUserRequest newUser = new CreateUserRequest(
                "Alice", "Dupont", null, "alice",
                "MotDePasse1!test", RoleEnum.USER, null, null, null);

        mvc().perform(post("/api/users")
                        .session(adminSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newUser)))
                .andExpect(status().isCreated());

        MockHttpSession userSession = loginAs("alice", "MotDePasse1!test");
        assertThat(userSession).as("session user créée").isNotNull();

        // ── 4. Aucune bannière au départ ─────────────────────────────────────
        mvc().perform(get("/api/info-banners/active").session(adminSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        mvc().perform(get("/api/admin/info-banners").session(adminSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        // ── 5. Endpoints admin refusés au rôle USER → 403 ───────────────────
        mvc().perform(get("/api/admin/info-banners").session(userSession))
                .andExpect(status().isForbidden());

        mvc().perform(post("/api/admin/info-banners")
                        .session(userSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateInfoBannerRequest(
                                null, "Msg", InfoBannerType.INFO, InfoBannerAudience.ALL,
                                LocalDateTime.now().minusHours(1), null))))
                .andExpect(status().isForbidden());

        // ── 6. Création bannière ALL (active) ────────────────────────────────
        CreateInfoBannerRequest createReq = new CreateInfoBannerRequest(
                "Maintenance planifiée",
                "Le service sera indisponible **ce soir de 22h à 23h**.",
                InfoBannerType.MAINTENANCE,
                InfoBannerAudience.ALL,
                LocalDateTime.now().minusMinutes(10),
                null);

        MvcResult createResult = mvc().perform(post("/api/admin/info-banners")
                        .session(adminSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.type").value("MAINTENANCE"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.createdByLogin").value("admin"))
                .andReturn();

        Long bannerId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("id").asLong();

        // Vérification directe en base (pas un mock)
        assertThat(infoBannerRepository.findById(bannerId))
                .as("bannière persistée en DB")
                .isPresent()
                .hasValueSatisfying(b -> {
                    assertThat(b.getTitle()).isEqualTo("Maintenance planifiée");
                    assertThat(b.getType()).isEqualTo(InfoBannerType.MAINTENANCE);
                    assertThat(b.getAudience()).isEqualTo(InfoBannerAudience.ALL);
                    assertThat(b.getEndAt()).isNull();
                });

        // ── 7. Bannière visible par l'admin ET par le user (audience ALL) ────
        mvc().perform(get("/api/info-banners/active").session(adminSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(bannerId))
                .andExpect(jsonPath("$[0].title").value("Maintenance planifiée"));

        mvc().perform(get("/api/info-banners/active").session(userSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        // ── 8. Création bannière ADMIN_ONLY ──────────────────────────────────
        CreateInfoBannerRequest adminOnlyReq = new CreateInfoBannerRequest(
                null,
                "Message interne admin uniquement.",
                InfoBannerType.INFO,
                InfoBannerAudience.ADMIN_ONLY,
                LocalDateTime.now().minusMinutes(5),
                null);

        MvcResult adminOnlyResult = mvc().perform(post("/api/admin/info-banners")
                        .session(adminSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(adminOnlyReq)))
                .andExpect(status().isCreated())
                .andReturn();

        Long adminOnlyId = objectMapper.readTree(adminOnlyResult.getResponse().getContentAsString())
                .get("id").asLong();

        // Admin voit ses 2 bannières actives, USER n'en voit qu'1 (ADMIN_ONLY filtrée)
        mvc().perform(get("/api/info-banners/active").session(adminSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));

        mvc().perform(get("/api/info-banners/active").session(userSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(bannerId)); // seule la bannière ALL

        // ── 9. Bannière programmée (startAt futur) non visible dans /active ──
        CreateInfoBannerRequest futureReq = new CreateInfoBannerRequest(
                null, "Annonce future.", InfoBannerType.INFO, InfoBannerAudience.ALL,
                LocalDateTime.now().plusDays(1), null);

        mvc().perform(post("/api/admin/info-banners")
                        .session(adminSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(futureReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("SCHEDULED"));

        // /active ne retourne toujours que les 2 bannières actives (pas la future)
        mvc().perform(get("/api/info-banners/active").session(adminSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));

        // ── 10. Validation Bean Validation (400) ─────────────────────────────
        CreateInfoBannerRequest invalid = new CreateInfoBannerRequest(
                null, "", InfoBannerType.INFO, InfoBannerAudience.ALL,
                LocalDateTime.now(), null);

        mvc().perform(post("/api/admin/info-banners")
                        .session(adminSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest());

        // ── 11. endAt ≤ startAt → 400 (validation service) ──────────────────
        CreateInfoBannerRequest badDates = new CreateInfoBannerRequest(
                null, "Dates invalides.", InfoBannerType.ALERT, InfoBannerAudience.ALL,
                LocalDateTime.now().plusHours(2), LocalDateTime.now().plusHours(1));

        mvc().perform(post("/api/admin/info-banners")
                        .session(adminSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badDates)))
                .andExpect(status().isBadRequest());

        // ── 12. Modification ─────────────────────────────────────────────────
        UpdateInfoBannerRequest updateReq = new UpdateInfoBannerRequest(
                "Maintenance terminée", "Le service est de nouveau disponible.",
                InfoBannerType.SUCCESS, InfoBannerAudience.ALL,
                LocalDateTime.now().minusMinutes(10), null);

        mvc().perform(put("/api/admin/info-banners/" + bannerId)
                        .session(adminSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("SUCCESS"))
                .andExpect(jsonPath("$.title").value("Maintenance terminée"));

        assertThat(infoBannerRepository.findById(bannerId))
                .hasValueSatisfying(b -> assertThat(b.getType()).isEqualTo(InfoBannerType.SUCCESS));

        // ── 13. Suppression ──────────────────────────────────────────────────
        mvc().perform(delete("/api/admin/info-banners/" + bannerId).session(adminSession))
                .andExpect(status().isNoContent());

        assertThat(infoBannerRepository.findById(bannerId))
                .as("bannière supprimée en DB")
                .isEmpty();

        mvc().perform(delete("/api/admin/info-banners/" + adminOnlyId).session(adminSession))
                .andExpect(status().isNoContent());

        // ── 14. 404 sur une bannière inexistante ─────────────────────────────
        mvc().perform(get("/api/admin/info-banners/99999").session(adminSession))
                .andExpect(status().isNotFound());

        mvc().perform(delete("/api/admin/info-banners/99999").session(adminSession))
                .andExpect(status().isNotFound());

        // ── 15. Logout ───────────────────────────────────────────────────────
        mvc().perform(post("/api/auth/logout").session(adminSession))
                .andExpect(status().isOk());
    }
}
