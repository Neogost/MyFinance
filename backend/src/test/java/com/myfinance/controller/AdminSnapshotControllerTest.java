package com.myfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.PositionStatus;
import com.myfinance.dto.*;
import com.myfinance.service.AdminSnapshotService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminSnapshotController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class AdminSnapshotControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean AdminSnapshotService adminSnapshotService;

    AdminSnapshotDetailDto summary;
    AdminSnapshotDetailDto detail;

    @BeforeEach
    void setUp() {
        AdminSnapshotDetailDto.PositionEntry entry = new AdminSnapshotDetailDto.PositionEntry(
                1L, 10L, "Livret A", null, AssetCategory.LIVRET,
                new BigDecimal("3000"), new BigDecimal("3200"), new BigDecimal("200"),
                null, null
        );

        summary = new AdminSnapshotDetailDto(5L, LocalDate.of(2026, 4, 1),
                new BigDecimal("3000"), new BigDecimal("3200"), new BigDecimal("200"),
                1L, "Alice Dupont", null);

        detail = new AdminSnapshotDetailDto(5L, LocalDate.of(2026, 4, 1),
                new BigDecimal("3000"), new BigDecimal("3200"), new BigDecimal("200"),
                1L, "Alice Dupont", List.of(entry));
    }

    // ── GET /api/admin/snapshots?userId=1 ─────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void findAll_asAdmin_retourne200AvecListe() throws Exception {
        when(adminSnapshotService.findAllByUser(1L)).thenReturn(List.of(summary));

        mockMvc.perform(get("/api/admin/snapshots").param("userId", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(5))
                .andExpect(jsonPath("$[0].userFullName").value("Alice Dupont"));
    }

    @Test
    @WithMockUser(roles = "USER")
    void findAll_asUser_retourne403() throws Exception {
        mockMvc.perform(get("/api/admin/snapshots").param("userId", "1"))
                .andExpect(status().isForbidden());
    }

    @Test
    void findAll_nonAuthentifie_retourne401() throws Exception {
        mockMvc.perform(get("/api/admin/snapshots").param("userId", "1"))
                .andExpect(status().isUnauthorized());
    }

    // ── GET /api/admin/snapshots/{id} ─────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void findById_asAdmin_retourne200AvecDetail() throws Exception {
        when(adminSnapshotService.findById(5L)).thenReturn(detail);

        mockMvc.perform(get("/api/admin/snapshots/5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(5))
                .andExpect(jsonPath("$.positions.length()").value(1))
                .andExpect(jsonPath("$.positions[0].positionLabel").value("Livret A"));
    }

    // ── POST /api/admin/snapshots ─────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void create_asAdmin_retourne201() throws Exception {
        ManualSnapshotRequest request = new ManualSnapshotRequest(
                1L, LocalDate.of(2026, 4, 1),
                List.of(new ManualPositionSnapshotRequest(10L,
                        new BigDecimal("3000"), new BigDecimal("3200"), null, null))
        );

        when(adminSnapshotService.create(any())).thenReturn(detail);

        mockMvc.perform(post("/api/admin/snapshots")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(5));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void create_requeteInvalide_retourne400() throws Exception {
        // userId null → validation échoue
        String invalidBody = "{\"snapshotDate\":\"2026-04-01\",\"positions\":[]}";

        mockMvc.perform(post("/api/admin/snapshots")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidBody))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "USER")
    void create_asUser_retourne403() throws Exception {
        ManualSnapshotRequest request = new ManualSnapshotRequest(
                1L, LocalDate.of(2026, 4, 1), List.of());

        mockMvc.perform(post("/api/admin/snapshots")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    // ── PUT /api/admin/snapshots/{id} ─────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void update_asAdmin_retourne200() throws Exception {
        ManualSnapshotRequest request = new ManualSnapshotRequest(
                1L, LocalDate.of(2026, 4, 1),
                List.of(new ManualPositionSnapshotRequest(10L,
                        new BigDecimal("3100"), new BigDecimal("3300"), null, null))
        );

        when(adminSnapshotService.update(eq(5L), any())).thenReturn(detail);

        mockMvc.perform(put("/api/admin/snapshots/5")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(5));
    }

    // ── DELETE /api/admin/snapshots/{id} ──────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void delete_asAdmin_retourne204() throws Exception {
        doNothing().when(adminSnapshotService).delete(5L);

        mockMvc.perform(delete("/api/admin/snapshots/5"))
                .andExpect(status().isNoContent());

        verify(adminSnapshotService).delete(5L);
    }

    @Test
    @WithMockUser(roles = "USER")
    void delete_asUser_retourne403() throws Exception {
        mockMvc.perform(delete("/api/admin/snapshots/5"))
                .andExpect(status().isForbidden());
    }

    // ── GET /api/admin/users/{userId}/positions ───────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void findActivePositions_asAdmin_retourne200() throws Exception {
        PositionAdminRefDto pos = new PositionAdminRefDto(10L, "Livret A", "BNP", AssetCategory.LIVRET, PositionStatus.ACTIVE);
        when(adminSnapshotService.findAllPositionsByUser(1L)).thenReturn(List.of(pos));

        mockMvc.perform(get("/api/admin/users/1/positions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].label").value("Livret A"));
    }

    @Test
    @WithMockUser(roles = "USER")
    void findActivePositions_asUser_retourne403() throws Exception {
        mockMvc.perform(get("/api/admin/users/1/positions"))
                .andExpect(status().isForbidden());
    }
}
