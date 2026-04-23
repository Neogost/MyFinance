package com.myfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.dto.ContractOnCallDto;
import com.myfinance.dto.CreateContractOnCallRequest;
import com.myfinance.dto.UpdateContractOnCallRequest;
import com.myfinance.service.ContractOnCallService;
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

@WebMvcTest(ContractOnCallController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class ContractOnCallControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean ContractOnCallService contractOnCallService;

    ContractOnCallDto onCallDto;

    @BeforeEach
    void setUp() {
        onCallDto = new ContractOnCallDto(10L, 500f, 5, 2500f);
    }

    // ── GET /api/salary-contracts/{contractId}/on-calls ───────

    @Test
    @WithMockCustomUser
    void findAll_retourne200AvecLaListe() throws Exception {
        when(contractOnCallService.findAllByContract(eq(1L), any())).thenReturn(List.of(onCallDto));

        mockMvc.perform(get("/api/salary-contracts/1/on-calls"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].weeklyFlatRate").value(500.0))
                .andExpect(jsonPath("$[0].estimatedWeeksPerYear").value(5))
                .andExpect(jsonPath("$[0].annualOnCallIncome").value(2500.0));
    }

    @Test
    void findAll_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/salary-contracts/1/on-calls"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockCustomUser
    void findAll_retourne403_siContratAppartientAAutrui() throws Exception {
        when(contractOnCallService.findAllByContract(eq(1L), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));

        mockMvc.perform(get("/api/salary-contracts/1/on-calls"))
                .andExpect(status().isForbidden());
    }

    // ── POST /api/salary-contracts/{contractId}/on-calls ──────

    @Test
    @WithMockCustomUser
    void create_avecCorpsValide_retourne201() throws Exception {
        CreateContractOnCallRequest request = new CreateContractOnCallRequest(500f, 5);

        when(contractOnCallService.create(eq(1L), any(), any())).thenReturn(onCallDto);

        mockMvc.perform(post("/api/salary-contracts/1/on-calls")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.weeklyFlatRate").value(500.0))
                .andExpect(jsonPath("$.estimatedWeeksPerYear").value(5))
                .andExpect(jsonPath("$.annualOnCallIncome").value(2500.0));
    }

    @Test
    @WithMockCustomUser
    void create_corpsInvalide_retourne400() throws Exception {
        // weeklyFlatRate négatif → violation @Positive
        CreateContractOnCallRequest request = new CreateContractOnCallRequest(-100f, 5);

        mockMvc.perform(post("/api/salary-contracts/1/on-calls")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockCustomUser
    void create_estimatedWeeksHorsLimite_retourne400() throws Exception {
        // estimatedWeeksPerYear > 52 → violation @Max(52)
        CreateContractOnCallRequest request = new CreateContractOnCallRequest(500f, 53);

        mockMvc.perform(post("/api/salary-contracts/1/on-calls")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    // ── PUT /api/salary-contracts/{contractId}/on-calls/{id} ──

    @Test
    @WithMockCustomUser
    void update_avecCorpsValide_retourne200() throws Exception {
        UpdateContractOnCallRequest request = new UpdateContractOnCallRequest(600f, 10);
        ContractOnCallDto updated = new ContractOnCallDto(10L, 600f, 10, 6000f);

        when(contractOnCallService.update(eq(1L), eq(10L), any(), any())).thenReturn(updated);

        mockMvc.perform(put("/api/salary-contracts/1/on-calls/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.weeklyFlatRate").value(600.0))
                .andExpect(jsonPath("$.estimatedWeeksPerYear").value(10))
                .andExpect(jsonPath("$.annualOnCallIncome").value(6000.0));
    }

    @Test
    @WithMockCustomUser
    void update_retourne404_siAstreinteIntrouvable() throws Exception {
        UpdateContractOnCallRequest request = new UpdateContractOnCallRequest(500f, 5);

        when(contractOnCallService.update(eq(1L), eq(99L), any(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));

        mockMvc.perform(put("/api/salary-contracts/1/on-calls/99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    // ── DELETE /api/salary-contracts/{contractId}/on-calls/{id} ─

    @Test
    @WithMockCustomUser
    void delete_retourne204() throws Exception {
        mockMvc.perform(delete("/api/salary-contracts/1/on-calls/10"))
                .andExpect(status().isNoContent());

        verify(contractOnCallService).delete(eq(1L), eq(10L), any());
    }

    @Test
    @WithMockCustomUser
    void delete_retourne404_siAstreinteIntrouvable() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.NOT_FOUND))
                .when(contractOnCallService).delete(eq(1L), eq(99L), any());

        mockMvc.perform(delete("/api/salary-contracts/1/on-calls/99"))
                .andExpect(status().isNotFound());
    }
}
