package com.myfinance.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.service.RegistrationRateLimitService;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class RegistrationRateLimitFilterTest {

    private RegistrationRateLimitService rateLimitService;
    private RegistrationRateLimitFilter filter;
    private FilterChain chain;

    @BeforeEach
    void setUp() {
        rateLimitService = mock(RegistrationRateLimitService.class);
        chain = mock(FilterChain.class);

        filter = new RegistrationRateLimitFilter(new ObjectMapper());
        // @Autowired(required = false) field — injection manuelle pour les tests unitaires
        ReflectionTestUtils.setField(filter, "rateLimitService", rateLimitService);
    }

    private MockHttpServletRequest postRegister() {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/auth/register");
        req.setServletPath("/api/auth/register");
        req.setRemoteAddr("203.0.113.42");
        return req;
    }

    @Test
    void ipBloquee_retourne429AvecSecondesRestantes() throws Exception {
        when(rateLimitService.estBloque("203.0.113.42")).thenReturn(true);
        when(rateLimitService.secondesRestantes("203.0.113.42")).thenReturn(120L);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(postRegister(), response, chain);

        assertThat(response.getStatus()).isEqualTo(429);
        assertThat(response.getContentAsString())
                .contains("\"secondesRestantes\":120")
                .contains("Trop de demandes");
        verify(chain, never()).doFilter(any(), any());
        verify(rateLimitService, never()).enregistrerTentative(any());
    }

    @Test
    void ipNonBloquee_passeEtEnregistreLaTentative() throws Exception {
        when(rateLimitService.estBloque("203.0.113.42")).thenReturn(false);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(postRegister(), response, chain);

        verify(rateLimitService).enregistrerTentative("203.0.113.42");
        verify(chain).doFilter(any(), any());
    }

    @Test
    void requeteHorsScopeIgnoree_GET_register() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/auth/register");
        req.setServletPath("/api/auth/register");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(req, response, chain);

        // GET ignoré — chain appelée, rate-limit non sollicité
        verify(chain).doFilter(any(), any());
        verifyNoInteractions(rateLimitService);
    }

    @Test
    void requeteHorsScopeIgnoree_POST_autreEndpoint() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/auth/login");
        req.setServletPath("/api/auth/login");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(req, response, chain);

        verify(chain).doFilter(any(), any());
        verifyNoInteractions(rateLimitService);
    }

    @Test
    void serviceAbsent_passeSansBloquer() throws Exception {
        // Cas @WebMvcTest : le @Service n'est pas chargé, le champ est null
        ReflectionTestUtils.setField(filter, "rateLimitService", null);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(postRegister(), response, chain);

        verify(chain).doFilter(any(), any());
    }
}
