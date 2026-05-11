package com.myfinance.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.dto.CreateRegistrationRequest;
import com.myfinance.repository.UserRepository;
import com.myfinance.repository.UserRegistrationRequestRepository;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Test d'intégration de la chaîne d'authentification : Spring Security + UserService + UserRegistrationService.
 *
 * Couvre login (succès / échec), session (me / logout) et soumission de demande d'inscription.
 * La brute-force protection est désactivée par configuration (cf. application-integration.properties)
 * pour éviter le verrouillage entre tests qui enchaînent des login.
 */
@SpringBootTest
@ActiveProfiles("integration")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class AuthIntegrationTest {

    @Autowired WebApplicationContext context;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired UserRegistrationRequestRepository registrationRequestRepository;

    private static final String ADMIN_LOGIN = "admin";
    private static final String ADMIN_PASSWORD = "IntegrationTestAdminPass1!";

    private MockMvc buildMockMvc() {
        return MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    // ── Login ─────────────────────────────────────────────────────────────────

    @Test
    void login_avecCredentialsValides_retourne200EtSession() throws Exception {
        MockMvc mvc = buildMockMvc();

        MvcResult result = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("username", ADMIN_LOGIN)
                        .param("password", ADMIN_PASSWORD))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.login").value(ADMIN_LOGIN))
                .andExpect(jsonPath("$.role").value("ADMIN"))
                .andReturn();

        MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);
        assertThat(session).as("session HTTP créée après login").isNotNull();
    }

    @Test
    void login_avecMauvaisMotDePasse_retourne401() throws Exception {
        buildMockMvc().perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("username", ADMIN_LOGIN)
                        .param("password", "MotDePasseIncorrect!"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void login_avecLoginInexistant_retourne401() throws Exception {
        buildMockMvc().perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("username", "utilisateur-inexistant")
                        .param("password", ADMIN_PASSWORD))
                .andExpect(status().isUnauthorized());
    }

    // ── Session : /api/auth/me ────────────────────────────────────────────────

    @Test
    void me_sansAuthentification_retourne401() throws Exception {
        buildMockMvc().perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void me_avecSessionValide_retourneLUtilisateurConnecte() throws Exception {
        MockMvc mvc = buildMockMvc();
        MockHttpSession session = login(mvc);

        mvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.login").value(ADMIN_LOGIN))
                .andExpect(jsonPath("$.role").value("ADMIN"));
    }

    // ── Logout ────────────────────────────────────────────────────────────────

    @Test
    void logout_invalideLaSession() throws Exception {
        MockMvc mvc = buildMockMvc();
        MockHttpSession session = login(mvc);

        // Vérification préalable : la session est bien active
        mvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk());

        // Logout
        mvc.perform(post("/api/auth/logout").session(session))
                .andExpect(status().isOk());

        // La session est invalidée — /me doit échouer même avec l'ancienne session
        mvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isUnauthorized());
    }

    // ── Inscription publique ──────────────────────────────────────────────────

    @Test
    void register_avecDonneesValides_retourne202EtCreeLaDemandeEnDb() throws Exception {
        CreateRegistrationRequest req = new CreateRegistrationRequest(
                "nouveau-user", "Nouveau", "Utilisateur", "MonPass2026Secure!");

        long before = registrationRequestRepository.count();

        buildMockMvc().perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.message").exists());

        // Vérif en DB : la demande est bien persistée
        assertThat(registrationRequestRepository.count())
                .as("demande d'inscription créée en DB")
                .isEqualTo(before + 1);
        // Aucun compte utilisateur n'est créé tant que l'admin n'a pas approuvé
        assertThat(userRepository.findByLogin("nouveau-user"))
                .as("aucun User créé tant que l'admin n'a pas approuvé")
                .isEmpty();
    }

    @Test
    void register_avecMotDePasseTropFaible_retourne400() throws Exception {
        CreateRegistrationRequest req = new CreateRegistrationRequest(
                "user-faible", "User", "Faible", "azerty");  // < 12 chars + pas de classe spéciale

        buildMockMvc().perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void register_avecLoginExistant_retourne202_pasDEnumeration() throws Exception {
        // Sécurité : on ne doit JAMAIS révéler qu'un login existe déjà
        // (sinon attaquant peut énumérer les comptes par sondage)
        CreateRegistrationRequest req = new CreateRegistrationRequest(
                ADMIN_LOGIN, "Admin", "Admin", "MonNouveauPass2026!");

        buildMockMvc().perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isAccepted())  // 202 même si le login existe
                .andExpect(jsonPath("$.message").exists());
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private MockHttpSession login(MockMvc mvc) throws Exception {
        MvcResult result = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("username", ADMIN_LOGIN)
                        .param("password", ADMIN_PASSWORD))
                .andExpect(status().isOk())
                .andReturn();
        return (MockHttpSession) result.getRequest().getSession(false);
    }
}
