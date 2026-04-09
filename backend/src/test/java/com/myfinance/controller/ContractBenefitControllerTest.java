package com.myfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.dto.ContractBenefitDto;
import com.myfinance.dto.CreateContractBenefitRequest;
import com.myfinance.dto.UpdateContractBenefitRequest;
import com.myfinance.service.ContractBenefitService;
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

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ContractBenefitController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class ContractBenefitControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean ContractBenefitService contractBenefitService;

    ContractBenefitDto teletravailDto;
    ContractBenefitDto telephoneDto;

    @BeforeEach
    void setUp() {
        teletravailDto = new ContractBenefitDto(10L, "Frais de télétravail", 50f);
        telephoneDto   = new ContractBenefitDto(11L, "Forfait téléphone", 30f);
    }

    // ── GET /api/salary-contracts/{contractId}/benefits ───────

    @Test
    @WithMockCustomUser
    void findAll_retourne200AvecLaListe() throws Exception {
        when(contractBenefitService.findAllByContract(eq(1L), any()))
                .thenReturn(List.of(teletravailDto, telephoneDto));

        mockMvc.perform(get("/api/salary-contracts/1/benefits"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].label").value("Frais de télétravail"))
                .andExpect(jsonPath("$[0].monthlyAmount").value(50.0))
                .andExpect(jsonPath("$[1].label").value("Forfait téléphone"));
    }

    @Test
    void findAll_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/salary-contracts/1/benefits"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockCustomUser
    void findAll_retourne403_siContratAppartientAAutrui() throws Exception {
        when(contractBenefitService.findAllByContract(eq(1L), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));

        mockMvc.perform(get("/api/salary-contracts/1/benefits"))
                .andExpect(status().isForbidden());
    }

    // ── POST /api/salary-contracts/{contractId}/benefits ──────

    @Test
    @WithMockCustomUser
    void create_retourne201() throws Exception {
        CreateContractBenefitRequest request = new CreateContractBenefitRequest(
                "Frais de télétravail", 50f);

        when(contractBenefitService.create(eq(1L), any(), any())).thenReturn(teletravailDto);

        mockMvc.perform(post("/api/salary-contracts/1/benefits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.label").value("Frais de télétravail"))
                .andExpect(jsonPath("$.monthlyAmount").value(50.0));
    }

    @Test
    @WithMockCustomUser
    void create_corpsInvalide_retourne400() throws Exception {
        // monthlyAmount négatif → violation @Positive
        CreateContractBenefitRequest request = new CreateContractBenefitRequest(
                "Frais de télétravail", -10f);

        mockMvc.perform(post("/api/salary-contracts/1/benefits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockCustomUser
    void create_retourne404_siContratIntrouvable() throws Exception {
        CreateContractBenefitRequest request = new CreateContractBenefitRequest(
                "Frais de télétravail", 50f);

        when(contractBenefitService.create(eq(99L), any(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));

        mockMvc.perform(post("/api/salary-contracts/99/benefits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    // ── PUT /api/salary-contracts/{contractId}/benefits/{id} ──

    @Test
    @WithMockCustomUser
    void update_avecCorpsValide_retourne200() throws Exception {
        UpdateContractBenefitRequest request = new UpdateContractBenefitRequest(
                "Frais de télétravail modifié", 60f);
        ContractBenefitDto updated = new ContractBenefitDto(10L, "Frais de télétravail modifié", 60f);

        when(contractBenefitService.update(eq(1L), eq(10L), any(), any())).thenReturn(updated);

        mockMvc.perform(put("/api/salary-contracts/1/benefits/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.label").value("Frais de télétravail modifié"))
                .andExpect(jsonPath("$.monthlyAmount").value(60.0));
    }

    @Test
    @WithMockCustomUser
    void update_retourne404_siAvantageIntrouvable() throws Exception {
        UpdateContractBenefitRequest request = new UpdateContractBenefitRequest("X", 10f);

        when(contractBenefitService.update(eq(1L), eq(99L), any(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));

        mockMvc.perform(put("/api/salary-contracts/1/benefits/99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    // ── DELETE /api/salary-contracts/{contractId}/benefits/{id} ─

    @Test
    @WithMockCustomUser
    void delete_retourne204() throws Exception {
        mockMvc.perform(delete("/api/salary-contracts/1/benefits/10"))
                .andExpect(status().isNoContent());

        verify(contractBenefitService).delete(eq(1L), eq(10L), any());
    }

    @Test
    @WithMockCustomUser
    void delete_retourne404_siAvantageIntrouvable() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.NOT_FOUND))
                .when(contractBenefitService).delete(eq(1L), eq(99L), any());

        mockMvc.perform(delete("/api/salary-contracts/1/benefits/99"))
                .andExpect(status().isNotFound());
    }
}
