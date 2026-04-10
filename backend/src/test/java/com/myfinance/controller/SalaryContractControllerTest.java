package com.myfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.dto.CreateSalaryContractRequest;
import com.myfinance.dto.SalaryContractDto;
import com.myfinance.dto.UpdateSalaryContractRequest;
import com.myfinance.service.SalaryContractService;
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

@WebMvcTest(SalaryContractController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class SalaryContractControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean SalaryContractService salaryContractService;

    SalaryContractDto contractDto;

    @BeforeEach
    void setUp() {
        contractDto = new SalaryContractDto(
                1L,
                LocalDate.of(2023, 1, 1), null,
                45000f, 12, 35f, 9.5f, 50f,
                false, null,
                // net imposable
                36904.05f, 3750f, 3075.34f, 1596f,
                28.20f, 23.12f, 197.37f, 161.86f,
                90.25f, 90.25f,
                // net d'impôt (null : profil fiscal non renseigné)
                null, null, null, null
        );
    }

    // ── GET /api/salary-contracts ──────────────────────────────

    @Test
    @WithMockCustomUser
    void findAll_retourne200AvecLaListe() throws Exception {
        when(salaryContractService.findAllByUser(any())).thenReturn(List.of(contractDto));

        mockMvc.perform(get("/api/salary-contracts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].annualGrossSalary").value(45000.0))
                .andExpect(jsonPath("$[0].annualNetImposable").value(36904.05));
    }

    @Test
    void findAll_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/salary-contracts"))
                .andExpect(status().isUnauthorized());
    }

    // ── GET /api/salary-contracts/{id} ────────────────────────

    @Test
    @WithMockCustomUser
    void findById_retourne200AvecProjections() throws Exception {
        when(salaryContractService.findById(eq(1L), any())).thenReturn(contractDto);

        mockMvc.perform(get("/api/salary-contracts/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.monthlyGrossSalary").value(3750.0))
                .andExpect(jsonPath("$.monthlyNetImposable").value(3075.34));
    }

    @Test
    @WithMockCustomUser
    void findById_retourne403_siAccesNonAutorise() throws Exception {
        when(salaryContractService.findById(eq(1L), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));

        mockMvc.perform(get("/api/salary-contracts/1"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockCustomUser
    void findById_retourne404_siIntrouvable() throws Exception {
        when(salaryContractService.findById(eq(99L), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));

        mockMvc.perform(get("/api/salary-contracts/99"))
                .andExpect(status().isNotFound());
    }

    // ── POST /api/salary-contracts ────────────────────────────

    @Test
    @WithMockCustomUser
    void create_avecCorpsValide_retourne201() throws Exception {
        CreateSalaryContractRequest request = new CreateSalaryContractRequest(
                LocalDate.of(2023, 1, 1), null, 45000f, 12, 35f, 9.5f, 50f, false, null);

        when(salaryContractService.create(any(), any())).thenReturn(contractDto);

        mockMvc.perform(post("/api/salary-contracts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.annualGrossSalary").value(45000.0));
    }

    @Test
    @WithMockCustomUser
    void create_avecCorpsInvalide_retourne400() throws Exception {
        // annualGrossSalary = -1 → violation @Positive
        CreateSalaryContractRequest request = new CreateSalaryContractRequest(
                LocalDate.of(2023, 1, 1), null, -1f, 12, 35f, 9.5f, 50f, false, null);

        mockMvc.perform(post("/api/salary-contracts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockCustomUser
    void create_retourne409_siContratActifExisteDeja() throws Exception {
        CreateSalaryContractRequest request = new CreateSalaryContractRequest(
                LocalDate.of(2023, 1, 1), null, 45000f, 12, 35f, 9.5f, 50f, false, null);

        when(salaryContractService.create(any(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT));

        mockMvc.perform(post("/api/salary-contracts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict());
    }

    // ── PUT /api/salary-contracts/{id} ────────────────────────

    @Test
    @WithMockCustomUser
    void update_avecCorpsValide_retourne200() throws Exception {
        UpdateSalaryContractRequest request = new UpdateSalaryContractRequest(
                LocalDate.of(2023, 1, 1), LocalDate.of(2023, 12, 31), 48000f, 13, 35f, 9.5f, 50f, false, null);
        SalaryContractDto updated = new SalaryContractDto(
                1L, LocalDate.of(2023, 1, 1), LocalDate.of(2023, 12, 31),
                48000f, 13, 35f, 9.5f, 50f, false, null,
                39375.03f, 3692.3f, 3028.85f, 1596f, 30.07f, 24.67f, 210.52f, 172.70f, 90.25f, 90.25f,
                null, null, null, null);

        when(salaryContractService.update(eq(1L), any(), any())).thenReturn(updated);

        mockMvc.perform(put("/api/salary-contracts/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.annualGrossSalary").value(48000.0));
    }

    // ── DELETE /api/salary-contracts/{id} ─────────────────────

    @Test
    @WithMockCustomUser
    void delete_retourne204() throws Exception {
        mockMvc.perform(delete("/api/salary-contracts/1"))
                .andExpect(status().isNoContent());

        verify(salaryContractService).delete(eq(1L), any());
    }

    @Test
    @WithMockCustomUser
    void delete_retourne404_siIntrouvable() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.NOT_FOUND))
                .when(salaryContractService).delete(eq(99L), any());

        mockMvc.perform(delete("/api/salary-contracts/99"))
                .andExpect(status().isNotFound());
    }
}
