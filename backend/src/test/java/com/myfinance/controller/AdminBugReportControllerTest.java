package com.myfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.domain.BugSeverity;
import com.myfinance.domain.BugStatus;
import com.myfinance.dto.*;
import com.myfinance.service.BugReportService;
import com.myfinance.service.LogExcerptService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminBugReportController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class AdminBugReportControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean BugReportService  bugReportService;
    @MockitoBean LogExcerptService logExcerptService;

    BugReportAdminSummaryDto adminSummary;
    BugReportAdminDetailDto adminDetail;

    @BeforeEach
    void setUp() {
        adminSummary = new BugReportAdminSummaryDto(
                1L, "Graphique vide", BugStatus.OPEN, BugSeverity.HIGH, null,
                1, 0, LocalDateTime.now(), "Alice", "alice.dupont", "sess-abc");

        adminDetail = new BugReportAdminDetailDto(
                1L, "Graphique vide", "Description.", null, null, null,
                BugSeverity.HIGH, null, BugStatus.OPEN, 1, 0, LocalDateTime.now(),
                "Alice", "alice.dupont", "sess-abc", null, List.of());
    }

    // ── GET /api/admin/bug-reports ─────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void findAll_asAdmin_retourne200() throws Exception {
        when(bugReportService.findAllAdmin(any(), any())).thenReturn(List.of(adminSummary));

        mockMvc.perform(get("/api/admin/bug-reports"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].reporterLogin").value("alice.dupont"))
                .andExpect(jsonPath("$[0].sessionId").value("sess-abc"));
    }

    @Test
    void findAll_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/admin/bug-reports")).andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "USER")
    void findAll_avecRoleUser_retourne403() throws Exception {
        mockMvc.perform(get("/api/admin/bug-reports")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void findAll_avecFiltres_passeLesParametres() throws Exception {
        when(bugReportService.findAllAdmin(eq(BugStatus.OPEN), eq(BugSeverity.HIGH)))
                .thenReturn(List.of(adminSummary));

        mockMvc.perform(get("/api/admin/bug-reports")
                        .param("status", "OPEN")
                        .param("priority", "HIGH"))
                .andExpect(status().isOk());
    }

    // ── GET /api/admin/bug-reports/{id} ───────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void findById_retourne200() throws Exception {
        when(bugReportService.findByIdAdmin(1L)).thenReturn(adminDetail);

        mockMvc.perform(get("/api/admin/bug-reports/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reporterLogin").value("alice.dupont"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void findById_retourne404() throws Exception {
        when(bugReportService.findByIdAdmin(99L))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));

        mockMvc.perform(get("/api/admin/bug-reports/99")).andExpect(status().isNotFound());
    }

    // ── PATCH /api/admin/bug-reports/{id} ─────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void patch_retourne200() throws Exception {
        when(bugReportService.patch(eq(1L), any())).thenReturn(adminDetail);

        mockMvc.perform(patch("/api/admin/bug-reports/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new PatchBugReportRequest(BugStatus.IN_PROGRESS, BugSeverity.HIGH))))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void patch_retourne400_siAucunChamp() throws Exception {
        when(bugReportService.patch(eq(1L), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST));

        mockMvc.perform(patch("/api/admin/bug-reports/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new PatchBugReportRequest(null, null))))
                .andExpect(status().isBadRequest());
    }

    // ── PUT /api/admin/bug-reports/{id} ───────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void update_retourne200() throws Exception {
        when(bugReportService.adminUpdate(eq(1L), any())).thenReturn(adminDetail);

        mockMvc.perform(put("/api/admin/bug-reports/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new UpdateBugReportAdminRequest(
                                        "Nouveau titre", "Description mise à jour.",
                                        null, null, null, BugSeverity.HIGH))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reporterLogin").value("alice.dupont"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void update_retourne400_siTitreVide() throws Exception {
        mockMvc.perform(put("/api/admin/bug-reports/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new UpdateBugReportAdminRequest(
                                        "", "Description.", null, null, null, BugSeverity.HIGH))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "USER")
    void update_avecRoleUser_retourne403() throws Exception {
        mockMvc.perform(put("/api/admin/bug-reports/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new UpdateBugReportAdminRequest(
                                        "Titre", "Description.", null, null, null, BugSeverity.HIGH))))
                .andExpect(status().isForbidden());
    }

    // ── DELETE /api/admin/bug-reports/{id} ────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void delete_retourne204() throws Exception {
        mockMvc.perform(delete("/api/admin/bug-reports/1"))
                .andExpect(status().isNoContent());

        verify(bugReportService).delete(1L);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void delete_retourne404() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.NOT_FOUND))
                .when(bugReportService).delete(99L);

        mockMvc.perform(delete("/api/admin/bug-reports/99"))
                .andExpect(status().isNotFound());
    }

    // ── GET /api/admin/bug-reports/{id}/logs?window=... ──────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void extractLogs_windowZero_retourne400() throws Exception {
        mockMvc.perform(get("/api/admin/bug-reports/1/logs").param("window", "0"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(logExcerptService);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void extractLogs_windowTropGrand_retourne400() throws Exception {
        mockMvc.perform(get("/api/admin/bug-reports/1/logs").param("window", "61"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(logExcerptService);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void extractLogs_windowMaxInt_retourne400() throws Exception {
        mockMvc.perform(get("/api/admin/bug-reports/1/logs").param("window", String.valueOf(Integer.MAX_VALUE)))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(logExcerptService);
    }
}
