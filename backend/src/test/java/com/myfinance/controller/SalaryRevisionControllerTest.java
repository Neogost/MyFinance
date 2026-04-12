package com.myfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.dto.CreateSalaryRevisionRequest;
import com.myfinance.dto.SalaryRevisionDto;
import com.myfinance.dto.UpdateSalaryRevisionRequest;
import com.myfinance.service.SalaryRevisionService;
import com.myfinance.support.WithMockCustomUser;
import org.junit.jupiter.api.BeforeEach;
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

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SalaryRevisionController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class SalaryRevisionControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean SalaryRevisionService salaryRevisionService;

    SalaryRevisionDto revision2024;
    SalaryRevisionDto revision2025;

    @BeforeEach
    void setUp() {
        revision2024 = new SalaryRevisionDto(1L, LocalDate.of(2024, 1, 1), 45000f, "Augmentation 2024");
        revision2025 = new SalaryRevisionDto(2L, LocalDate.of(2025, 1, 1), 47000f, "Augmentation 2025");
    }

    // ── GET /api/salary-contracts/{contractId}/revisions ──────

    @Test
    @WithMockCustomUser
    void findAll_retourne200AvecLaListe() throws Exception {
        when(salaryRevisionService.findAllByContract(eq(1L), any()))
                .thenReturn(List.of(revision2025, revision2024));

        mockMvc.perform(get("/api/salary-contracts/1/revisions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].annualGrossSalary").value(47000.0))
                .andExpect(jsonPath("$[0].label").value("Augmentation 2025"))
                .andExpect(jsonPath("$[1].annualGrossSalary").value(45000.0));
    }

    @Test
    void findAll_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/salary-contracts/1/revisions"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockCustomUser
    void findAll_retourne403_siContratAppartientAAutrui() throws Exception {
        when(salaryRevisionService.findAllByContract(eq(1L), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));

        mockMvc.perform(get("/api/salary-contracts/1/revisions"))
                .andExpect(status().isForbidden());
    }

    // ── POST /api/salary-contracts/{contractId}/revisions ─────

    @Test
    @WithMockCustomUser
    void create_retourne201() throws Exception {
        CreateSalaryRevisionRequest request = new CreateSalaryRevisionRequest(
                LocalDate.of(2025, 1, 1), 47000f, "Augmentation 2025");

        when(salaryRevisionService.create(eq(1L), any(), any())).thenReturn(revision2025);

        mockMvc.perform(post("/api/salary-contracts/1/revisions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.annualGrossSalary").value(47000.0))
                .andExpect(jsonPath("$.label").value("Augmentation 2025"));
    }

    @Test
    @WithMockCustomUser
    void create_corpsInvalide_retourne400() throws Exception {
        // annualGrossSalary négatif → violation @Positive
        CreateSalaryRevisionRequest request = new CreateSalaryRevisionRequest(
                LocalDate.of(2025, 1, 1), -1f, null);

        mockMvc.perform(post("/api/salary-contracts/1/revisions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockCustomUser
    void create_retourne409_siDateDejaExistante() throws Exception {
        CreateSalaryRevisionRequest request = new CreateSalaryRevisionRequest(
                LocalDate.of(2024, 1, 1), 46000f, null);

        when(salaryRevisionService.create(eq(1L), any(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT));

        mockMvc.perform(post("/api/salary-contracts/1/revisions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict());
    }

    // ── PUT /api/salary-contracts/{contractId}/revisions/{id} ─

    @Test
    @WithMockCustomUser
    void update_avecCorpsValide_retourne200() throws Exception {
        UpdateSalaryRevisionRequest request = new UpdateSalaryRevisionRequest(
                LocalDate.of(2025, 1, 1), 48000f, "Augmentation 2025 corrigée");
        SalaryRevisionDto updated = new SalaryRevisionDto(2L, LocalDate.of(2025, 1, 1), 48000f, "Augmentation 2025 corrigée");

        when(salaryRevisionService.update(eq(1L), eq(2L), any(), any())).thenReturn(updated);

        mockMvc.perform(put("/api/salary-contracts/1/revisions/2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.annualGrossSalary").value(48000.0));
    }

    @Test
    @WithMockCustomUser
    void update_retourne404_siRevisionIntrouvable() throws Exception {
        UpdateSalaryRevisionRequest request = new UpdateSalaryRevisionRequest(
                LocalDate.of(2025, 1, 1), 48000f, null);

        when(salaryRevisionService.update(eq(1L), eq(99L), any(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));

        mockMvc.perform(put("/api/salary-contracts/1/revisions/99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    // ── DELETE /api/salary-contracts/{contractId}/revisions/{id}

    @Test
    @WithMockCustomUser
    void delete_retourne204() throws Exception {
        mockMvc.perform(delete("/api/salary-contracts/1/revisions/1"))
                .andExpect(status().isNoContent());

        verify(salaryRevisionService).delete(eq(1L), eq(1L), any());
    }

    @Test
    @WithMockCustomUser
    void delete_retourne404_siRevisionIntrouvable() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.NOT_FOUND))
                .when(salaryRevisionService).delete(eq(1L), eq(99L), any());

        mockMvc.perform(delete("/api/salary-contracts/1/revisions/99"))
                .andExpect(status().isNotFound());
    }
}
