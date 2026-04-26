package com.myfinance.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.service.LoginAttemptService;
import com.myfinance.service.LoginHistoryService;
import com.myfinance.service.LoginIpAttemptService;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class LoginRateLimitFilterTest {

    private LoginAttemptService loginAttemptService;
    private LoginIpAttemptService loginIpAttemptService;
    private LoginHistoryService loginHistoryService;
    private LoginRateLimitFilter filter;
    private FilterChain chain;

    @BeforeEach
    void setUp() {
        loginAttemptService = mock(LoginAttemptService.class);
        loginIpAttemptService = mock(LoginIpAttemptService.class);
        loginHistoryService = mock(LoginHistoryService.class);
        chain = mock(FilterChain.class);

        filter = new LoginRateLimitFilter(new ObjectMapper());
        ReflectionTestUtils.setField(filter, "loginAttemptService", loginAttemptService);
        ReflectionTestUtils.setField(filter, "loginIpAttemptService", loginIpAttemptService);
        ReflectionTestUtils.setField(filter, "loginHistoryService", loginHistoryService);
    }

    private MockHttpServletRequest postLogin(String username) {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/auth/login");
        req.setServletPath("/api/auth/login");
        req.setRemoteAddr("203.0.113.42");
        if (username != null) req.setParameter("username", username);
        return req;
    }

    // ── Rate-limit IP ──────────────────────────────────────────

    @Test
    void ipBloquee_retourne429AvecSecondesRestantes() throws Exception {
        when(loginIpAttemptService.estBloque("203.0.113.42")).thenReturn(true);
        when(loginIpAttemptService.secondesRestantes("203.0.113.42")).thenReturn(900L);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(postLogin("alice"), response, chain);

        assertThat(response.getStatus()).isEqualTo(429);
        assertThat(response.getContentAsString())
                .contains("\"secondesRestantes\":900")
                .contains("Trop de tentatives");
        verify(chain, never()).doFilter(any(), any());
        verify(loginHistoryService).logBlocked(eq("alice"), eq("203.0.113.42"), any());
    }

    // ── Verrou par-login : 401 silencieux (anti-énumération) ──

    @Test
    void loginVerrouille_retourne401_sansReveler429() throws Exception {
        when(loginIpAttemptService.estBloque("203.0.113.42")).thenReturn(false);
        when(loginAttemptService.estBloque("alice")).thenReturn(true);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(postLogin("alice"), response, chain);

        // 401 et non 429 — le client ne peut pas distinguer « compte verrouillé »
        // de « identifiants incorrects »
        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentAsString())
                .contains("Identifiants incorrects")
                .doesNotContain("secondesRestantes")
                .doesNotContain("verrouillé")
                .doesNotContain("Trop de tentatives");
        verify(chain, never()).doFilter(any(), any());
        verify(loginHistoryService).logBlocked(eq("alice"), eq("203.0.113.42"), any());
    }

    // ── Cas normal : passe au filtre suivant ──────────────────

    @Test
    void aucunBlocage_passeAuFiltreSuivant() throws Exception {
        when(loginIpAttemptService.estBloque(any())).thenReturn(false);
        when(loginAttemptService.estBloque(any())).thenReturn(false);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(postLogin("alice"), response, chain);

        verify(chain).doFilter(any(), any());
        verifyNoInteractions(loginHistoryService);
    }

    // ── Hors scope : GET et autres endpoints ──────────────────

    @Test
    void requeteGet_ignoree() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/auth/login");
        req.setServletPath("/api/auth/login");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(req, response, chain);

        verify(chain).doFilter(any(), any());
        verifyNoInteractions(loginAttemptService, loginIpAttemptService);
    }

    @Test
    void autreEndpoint_ignore() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/auth/register");
        req.setServletPath("/api/auth/register");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(req, response, chain);

        verify(chain).doFilter(any(), any());
        verifyNoInteractions(loginAttemptService, loginIpAttemptService);
    }

    // ── Compatibilité : services absents (cas @WebMvcTest) ────

    @Test
    void servicesAbsents_passeSansBloquer() throws Exception {
        ReflectionTestUtils.setField(filter, "loginAttemptService", null);
        ReflectionTestUtils.setField(filter, "loginIpAttemptService", null);
        ReflectionTestUtils.setField(filter, "loginHistoryService", null);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(postLogin("alice"), response, chain);

        verify(chain).doFilter(any(), any());
    }

    // ── Priorité : IP bloquée prime sur login verrouillé ──────

    @Test
    void ipEtLoginBloques_retourne429_pasdeAccesAuVerrouLogin() throws Exception {
        when(loginIpAttemptService.estBloque("203.0.113.42")).thenReturn(true);
        when(loginIpAttemptService.secondesRestantes("203.0.113.42")).thenReturn(60L);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(postLogin("alice"), response, chain);

        assertThat(response.getStatus()).isEqualTo(429);
        // estBloque(login) NE DOIT PAS être appelé : la sortie 429 est immédiate
        verify(loginAttemptService, never()).estBloque(any());
    }
}
