package com.myfinance.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.domain.BugSeverity;
import com.myfinance.domain.BugStatus;
import com.myfinance.domain.RoleEnum;
import com.myfinance.dto.*;
import com.myfinance.repository.BugReportRepository;
import com.myfinance.repository.BugVoteRepository;
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

@SpringBootTest
@ActiveProfiles("integration")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class BugReportIntegrationTest {

    @Autowired WebApplicationContext context;
    @Autowired ObjectMapper objectMapper;
    @Autowired BugReportRepository bugReportRepository;
    @Autowired BugVoteRepository bugVoteRepository;

    MockMvc mockMvc;

    private MockMvc mvc() {
        if (mockMvc == null) {
            mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        }
        return mockMvc;
    }

    private MockHttpSession loginAs(String username, String password) throws Exception {
        MvcResult r = mvc().perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("username", username)
                        .param("password", password))
                .andExpect(status().isOk()).andReturn();
        return (MockHttpSession) r.getRequest().getSession(false);
    }

    @Test
    void scenario_crud_votes_commentaires_triageAdmin() throws Exception {

        // ── 1. 401 sans auth ────────────────────────────────────────
        mvc().perform(get("/api/bug-reports")).andExpect(status().isUnauthorized());
        mvc().perform(get("/api/admin/bug-reports")).andExpect(status().isUnauthorized());

        // ── 2. Créer un user alice via l'admin ──────────────────────
        MockHttpSession adminSession = loginAs("admin", "IntegrationTestAdminPass1!");
        mvc().perform(post("/api/users")
                        .session(adminSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateUserRequest(
                                "Alice", "Martin", null, "alice.bug",
                                "MotDePasse1!test", RoleEnum.USER, null, null, null))))
                .andExpect(status().isCreated());

        MockHttpSession aliceSession = loginAs("alice.bug", "MotDePasse1!test");

        // ── 3. 403 sur les endpoints admin ──────────────────────────
        mvc().perform(get("/api/admin/bug-reports").session(aliceSession))
                .andExpect(status().isForbidden());

        // ── 4. Alice signale un bug ─────────────────────────────────
        CreateBugReportRequest createReq = new CreateBugReportRequest(
                "Graphique patrimoine vide",
                "Après reconnexion rapide le graphique reste vide.",
                "Le graphique doit afficher les données.",
                "1. Se connecter\n2. Se déconnecter\n3. Se reconnecter",
                LocalDateTime.now().minusHours(1),
                BugSeverity.HIGH, "session-test-abc");

        MvcResult createResult = mvc().perform(post("/api/bug-reports")
                        .session(aliceSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.score").value(1))
                .andExpect(jsonPath("$.isReporter").value(true))
                .andExpect(jsonPath("$.userVote").value("UP"))
                .andReturn();

        Long bugId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("id").asLong();

        // Vote initial auto persisté en DB
        assertThat(bugVoteRepository.findAll()).hasSize(1);

        // ── 5. Alice ne peut pas voter sur son propre bug ────────────
        mvc().perform(put("/api/bug-reports/" + bugId + "/vote")
                        .session(aliceSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new VoteRequest(
                                com.myfinance.domain.VoteType.DOWN))))
                .andExpect(status().isForbidden());

        // ── 6. Liste : alice voit son bug avec isReporter=true ───────
        mvc().perform(get("/api/bug-reports").session(aliceSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].isReporter").value(true))
                .andExpect(jsonPath("$[0].userVote").value("UP"));

        // ── 7. Admin vote UP sur le bug d'Alice ─────────────────────
        mvc().perform(put("/api/bug-reports/" + bugId + "/vote")
                        .session(adminSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new VoteRequest(
                                com.myfinance.domain.VoteType.UP))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(2))
                .andExpect(jsonPath("$.userVote").value("UP"));

        // Admin voit son vote dans la liste
        mvc().perform(get("/api/bug-reports").session(adminSession))
                .andExpect(jsonPath("$[0].userVote").value("UP"))
                .andExpect(jsonPath("$[0].isReporter").value(false));

        // ── 8. Admin retire son vote ────────────────────────────────
        mvc().perform(delete("/api/bug-reports/" + bugId + "/vote").session(adminSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(1))
                .andExpect(jsonPath("$.userVote").isEmpty());

        // ── 9. Commentaire d'Alice ──────────────────────────────────
        mvc().perform(post("/api/bug-reports/" + bugId + "/comments")
                        .session(aliceSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateBugCommentRequest("Je confirme sur Safari."))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.authorDisplay").value("Alice"));

        // ── 10. Commentaire admin → login [ADMIN] affiché via admin endpoint
        mvc().perform(post("/api/bug-reports/" + bugId + "/comments")
                        .session(adminSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateBugCommentRequest("Pris en charge."))))
                .andExpect(status().isCreated());

        mvc().perform(get("/api/admin/bug-reports/" + bugId).session(adminSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.comments[1].authorDisplay").value(
                        org.hamcrest.Matchers.containsString("ADMIN")));

        // ── 11. Triage admin : statut + priorité ────────────────────
        mvc().perform(patch("/api/admin/bug-reports/" + bugId)
                        .session(adminSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new PatchBugReportRequest(BugStatus.IN_PROGRESS, BugSeverity.HIGH))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.priority").value("HIGH"));

        // Vérification en DB
        assertThat(bugReportRepository.findById(bugId))
                .hasValueSatisfying(b -> {
                    assertThat(b.getStatus()).isEqualTo(BugStatus.IN_PROGRESS);
                    assertThat(b.getPriority()).isEqualTo(BugSeverity.HIGH);
                });

        // ── 12. Validation Bean Validation (400) ────────────────────
        mvc().perform(post("/api/bug-reports")
                        .session(aliceSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateBugReportRequest(
                                "", "Desc.", null, null, null, BugSeverity.LOW, null))))
                .andExpect(status().isBadRequest());

        // ── 13. PATCH sans champ → 400 ──────────────────────────────
        mvc().perform(patch("/api/admin/bug-reports/" + bugId)
                        .session(adminSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new PatchBugReportRequest(null, null))))
                .andExpect(status().isBadRequest());

        // ── 14. Suppression ─────────────────────────────────────────
        mvc().perform(delete("/api/admin/bug-reports/" + bugId).session(adminSession))
                .andExpect(status().isNoContent());

        assertThat(bugReportRepository.findById(bugId)).as("bug supprimé").isEmpty();
        assertThat(bugVoteRepository.count()).as("votes cascade-supprimés").isZero();

        // ── 15. Logout ───────────────────────────────────────────────
        mvc().perform(post("/api/auth/logout").session(adminSession))
                .andExpect(status().isOk());
    }
}
