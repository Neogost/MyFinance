package com.myfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.dto.DashboardLayoutDto;
import com.myfinance.dto.SaveDashboardLayoutRequest;
import com.myfinance.service.DashboardLayoutService;
import com.myfinance.support.WithMockCustomUser;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(DashboardLayoutController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class DashboardLayoutControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean DashboardLayoutService dashboardLayoutService;

    // ── GET /api/dashboard/layout ─────────────────────────────

    @Test
    @WithMockCustomUser
    void getLayout_retourne200AvecLayout() throws Exception {
        DashboardLayoutDto dto = new DashboardLayoutDto("{\"version\":1}", 1, LocalDateTime.now());
        when(dashboardLayoutService.getLayout(any())).thenReturn(dto);

        mockMvc.perform(get("/api/dashboard/layout"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.layoutJson").value("{\"version\":1}"));
    }

    @Test
    @WithMockCustomUser
    void getLayout_retourne200NullSiAucunLayout() throws Exception {
        when(dashboardLayoutService.getLayout(any())).thenReturn(null);

        mockMvc.perform(get("/api/dashboard/layout"))
                .andExpect(status().isOk());
    }

    @Test
    void getLayout_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/dashboard/layout"))
                .andExpect(status().isUnauthorized());
    }

    // ── PUT /api/dashboard/layout ─────────────────────────────

    @Test
    @WithMockCustomUser
    void saveLayout_retourne200() throws Exception {
        DashboardLayoutDto dto = new DashboardLayoutDto("{\"version\":1}", 1, LocalDateTime.now());
        when(dashboardLayoutService.saveLayout(any(), any())).thenReturn(dto);

        SaveDashboardLayoutRequest request = new SaveDashboardLayoutRequest("{\"version\":1}", 1);
        mockMvc.perform(put("/api/dashboard/layout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(1));
    }

    @Test
    @WithMockCustomUser
    void saveLayout_jsonVideRetourne400() throws Exception {
        SaveDashboardLayoutRequest request = new SaveDashboardLayoutRequest("", 1);
        mockMvc.perform(put("/api/dashboard/layout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockCustomUser
    void saveLayout_jsonTropLongRetourne413() throws Exception {
        when(dashboardLayoutService.saveLayout(any(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Layout JSON dépasse 32 kB"));

        SaveDashboardLayoutRequest request = new SaveDashboardLayoutRequest("x".repeat(100), 1);
        mockMvc.perform(put("/api/dashboard/layout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isPayloadTooLarge());
    }

    @Test
    void saveLayout_sansAuthentification_retourne401() throws Exception {
        SaveDashboardLayoutRequest request = new SaveDashboardLayoutRequest("{}", 1);
        mockMvc.perform(put("/api/dashboard/layout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }
}
