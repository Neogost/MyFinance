package com.myfinance.controller;

import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.domain.ErrorLevel;
import com.myfinance.domain.ErrorSource;
import com.myfinance.dto.AnalyticsHealthDto;
import com.myfinance.dto.ErrorGroupDto;
import com.myfinance.dto.PurgeResultDto;
import com.myfinance.service.AnalyticsRetentionService;
import com.myfinance.service.AnalyticsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;

import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AnalyticsAdminController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class AnalyticsAdminControllerTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean AnalyticsService analyticsService;
    @MockitoBean AnalyticsRetentionService retentionService;

    private static final String FROM = "2026-04-01T00:00:00";
    private static final String TO   = "2026-04-30T23:59:59";

    AnalyticsService.TopEventDto topEvent;
    ErrorGroupDto errorGroup;

    @BeforeEach
    void setUp() {
        topEvent = new AnalyticsService.TopEventDto("patrimoine.position.create", 42L);
        errorGroup = new ErrorGroupDto("abc123", "NullPointerException",
                ErrorSource.BACKEND, ErrorLevel.ERROR, "null ref",
                LocalDateTime.now().minusDays(3), LocalDateTime.now(), 7L);
    }

    // ── top-events ─────────────────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void topEvents_admin_retourne200() throws Exception {
        when(analyticsService.getTopEvents(any(), any(), any(), anyInt()))
                .thenReturn(List.of(topEvent));

        mockMvc.perform(get("/api/admin/analytics/top-events")
                        .param("from", FROM).param("to", TO))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].eventName").value("patrimoine.position.create"))
                .andExpect(jsonPath("$[0].count").value(42));
    }

    @Test
    @WithMockUser(roles = "USER")
    void topEvents_user_retourne403() throws Exception {
        mockMvc.perform(get("/api/admin/analytics/top-events")
                        .param("from", FROM).param("to", TO))
                .andExpect(status().isForbidden());
    }

    @Test
    void topEvents_sansAuth_retourne401() throws Exception {
        mockMvc.perform(get("/api/admin/analytics/top-events")
                        .param("from", FROM).param("to", TO))
                .andExpect(status().isUnauthorized());
    }

    // ── errors ─────────────────────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void errors_admin_retourne200() throws Exception {
        when(analyticsService.getErrorGroups(any(), any(), any(), any()))
                .thenReturn(List.of(errorGroup));

        mockMvc.perform(get("/api/admin/analytics/errors")
                        .param("from", FROM).param("to", TO))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].fingerprint").value("abc123"))
                .andExpect(jsonPath("$[0].count").value(7));
    }

    // ── health ─────────────────────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void health_admin_retourne200() throws Exception {
        AnalyticsHealthDto health = new AnalyticsHealthDto(
                200L, 10L, 8L, 2L, 5.0, List.of(), List.of());
        when(analyticsService.getHealth(any(), any())).thenReturn(health);

        mockMvc.perform(get("/api/admin/analytics/health")
                        .param("from", FROM).param("to", TO))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalEvents7d").value(200))
                .andExpect(jsonPath("$.errorRatePercent").value(5.0));
    }

    // ── journey ────────────────────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void journey_admin_retourne200() throws Exception {
        when(analyticsService.getJourney("sess-1")).thenReturn(List.of());

        mockMvc.perform(get("/api/admin/analytics/journey/sess-1"))
                .andExpect(status().isOk());
    }

    // ── error occurrences ──────────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void errorOccurrences_admin_retourne200() throws Exception {
        when(analyticsService.getErrorOccurrences(anyString(), any()))
                .thenReturn(Page.empty());

        mockMvc.perform(get("/api/admin/analytics/errors/abc123"))
                .andExpect(status().isOk());
    }

    // ── purge ──────────────────────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void purge_admin_retourne200() throws Exception {
        when(retentionService.purgeOlderThan(90, 180))
                .thenReturn(new PurgeResultDto(15, 3, 90));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/api/admin/analytics/purge")
                        .param("eventsDays", "90").param("errorsDays", "180"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deletedEvents").value(15))
                .andExpect(jsonPath("$.deletedErrors").value(3));
    }

    @Test
    @WithMockUser(roles = "USER")
    void purge_user_retourne403() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/api/admin/analytics/purge"))
                .andExpect(status().isForbidden());
    }
}
