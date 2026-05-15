package com.myfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.domain.EventType;
import com.myfinance.dto.TrackErrorRequest;
import com.myfinance.dto.TrackEventRequest;
import com.myfinance.service.AnalyticsService;
import com.myfinance.support.WithMockCustomUser;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AnalyticsController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class AnalyticsControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean AnalyticsService analyticsService;

    // ── POST /api/analytics/track ──────────────────────────────

    @Test
    @WithMockCustomUser
    void track_avecCorpsValide_retourne204() throws Exception {
        TrackEventRequest request = new TrackEventRequest(
                EventType.FEATURE_USE, "patrimoine.position.create", "patrimoine", null);

        mockMvc.perform(post("/api/analytics/track")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockCustomUser
    void track_nomInvalide_retourne400() throws Exception {
        TrackEventRequest request = new TrackEventRequest(
                EventType.FEATURE_USE, "mauvais-format", null, null);

        mockMvc.perform(post("/api/analytics/track")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void track_sansAuthentification_retourne204() throws Exception {
        // Endpoint public — accessible en mode anonyme (simulateurs publics)
        TrackEventRequest request = new TrackEventRequest(
                EventType.FEATURE_USE, "patrimoine.position.create", null, null);

        mockMvc.perform(post("/api/analytics/track")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());
    }

    // ── POST /api/analytics/error ──────────────────────────────

    @Test
    @WithMockCustomUser
    void trackError_avecCorpsValide_retourne204() throws Exception {
        TrackErrorRequest request = new TrackErrorRequest(
                "TypeError", "Cannot read properties of undefined",
                "at PatrimoinePage.jsx:42", "/patrimoine", null);

        mockMvc.perform(post("/api/analytics/error")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockCustomUser
    void trackError_sanMessage_retourne400() throws Exception {
        TrackErrorRequest request = new TrackErrorRequest(
                "TypeError", "", null, null, null);

        mockMvc.perform(post("/api/analytics/error")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void trackError_sansAuthentification_retourne204() throws Exception {
        // Endpoint public — accessible en mode anonyme
        TrackErrorRequest request = new TrackErrorRequest(
                "TypeError", "msg", null, null, null);

        mockMvc.perform(post("/api/analytics/error")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());
    }

    // ── Protection DoS storage : bornes @Size sur les champs libres ──

    @Test
    void trackError_messageTropLong_retourne400() throws Exception {
        TrackErrorRequest request = new TrackErrorRequest(
                "TypeError", "x".repeat(2001), null, null, null);

        mockMvc.perform(post("/api/analytics/error")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void trackError_stackTropLongue_retourne400() throws Exception {
        TrackErrorRequest request = new TrackErrorRequest(
                "TypeError", "msg", "x".repeat(4097), null, null);

        mockMvc.perform(post("/api/analytics/error")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void trackError_metadataTropLongue_retourne400() throws Exception {
        TrackErrorRequest request = new TrackErrorRequest(
                "TypeError", "msg", null, null, "x".repeat(2001));

        mockMvc.perform(post("/api/analytics/error")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void track_metadataTropLongue_retourne400() throws Exception {
        TrackEventRequest request = new TrackEventRequest(
                EventType.FEATURE_USE, "patrimoine.position.create", null, "x".repeat(2001));

        mockMvc.perform(post("/api/analytics/track")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}
