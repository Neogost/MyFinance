package com.myfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.dto.*;
import com.myfinance.service.UserDashboardService;
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
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserDashboardController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class UserDashboardControllerTest {

    @Autowired MockMvc        mockMvc;
    @Autowired ObjectMapper   objectMapper;
    @MockitoBean UserDashboardService dashboardService;

    UserDashboardDto dto = new UserDashboardDto(10L, "Principal", 0, true, LocalDateTime.now());

    UserDashboardWithLayoutDto withLayout = new UserDashboardWithLayoutDto(
            10L, "Principal", 0, true, "{\"v\":1}", 1, LocalDateTime.now());

    // ── GET /api/dashboards ───────────────────────────────────────────────────

    @Test
    @WithMockCustomUser
    void list_retourne_200_avec_liste() throws Exception {
        when(dashboardService.ensureDefaultDashboard(any())).thenReturn(null);
        when(dashboardService.listDashboards(any())).thenReturn(List.of(dto));

        mockMvc.perform(get("/api/dashboards"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Principal"))
                .andExpect(jsonPath("$[0].isDefault").value(true));
    }

    @Test
    void list_retourne_401_si_non_authentifié() throws Exception {
        mockMvc.perform(get("/api/dashboards"))
                .andExpect(status().isUnauthorized());
    }

    // ── GET /api/dashboards/{id} ──────────────────────────────────────────────

    @Test
    @WithMockCustomUser
    void get_retourne_200_avec_layout() throws Exception {
        when(dashboardService.getDashboard(eq(10L), any())).thenReturn(withLayout);

        mockMvc.perform(get("/api/dashboards/10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.layoutJson").value("{\"v\":1}"));
    }

    @Test
    @WithMockCustomUser
    void get_retourne_404_si_inconnu() throws Exception {
        when(dashboardService.getDashboard(eq(99L), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "introuvable"));

        mockMvc.perform(get("/api/dashboards/99"))
                .andExpect(status().isNotFound());
    }

    // ── POST /api/dashboards ──────────────────────────────────────────────────

    @Test
    @WithMockCustomUser
    void create_retourne_201() throws Exception {
        when(dashboardService.createDashboard(any(), any())).thenReturn(withLayout);

        mockMvc.perform(post("/api/dashboards")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateDashboardRequest("Famille"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Principal"));
    }

    @Test
    @WithMockCustomUser
    void create_retourne_409_si_limite_atteinte() throws Exception {
        when(dashboardService.createDashboard(any(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, "max 5"));

        mockMvc.perform(post("/api/dashboards")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateDashboardRequest("Extra"))))
                .andExpect(status().isConflict());
    }

    // ── PUT /api/dashboards/{id}/layout ───────────────────────────────────────

    @Test
    @WithMockCustomUser
    void saveLayout_retourne_200() throws Exception {
        when(dashboardService.saveLayout(eq(10L), any(), any())).thenReturn(withLayout);

        mockMvc.perform(put("/api/dashboards/10/layout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new SaveDashboardLayoutRequest("{\"v\":1}", 1))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.layoutJson").value("{\"v\":1}"));
    }

    // ── DELETE /api/dashboards/{id} ───────────────────────────────────────────

    @Test
    @WithMockCustomUser
    void delete_retourne_204() throws Exception {
        doNothing().when(dashboardService).deleteDashboard(eq(10L), any());

        mockMvc.perform(delete("/api/dashboards/10"))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockCustomUser
    void delete_retourne_400_si_seul_dashboard() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "seul dashboard"))
                .when(dashboardService).deleteDashboard(eq(10L), any());

        mockMvc.perform(delete("/api/dashboards/10"))
                .andExpect(status().isBadRequest());
    }
}
