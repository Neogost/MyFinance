package com.myfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.dto.CreateLoanSimulationRequest;
import com.myfinance.dto.LoanSimulationDto;
import com.myfinance.service.LoanSimulationService;
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
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(LoanSimulationController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class LoanSimulationControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean LoanSimulationService loanSimulationService;

    LoanSimulationDto dto;

    @BeforeEach
    void setUp() {
        dto = new LoanSimulationDto(1L, "Appartement Paris", "2026-04-26T10:00:00",
                Map.of("propertyPrice", 250000, "loanDuration", 20));
    }

    // ── GET ────────────────────────────────────────────────────

    @Test
    @WithMockCustomUser
    void findAll_retourne200AvecListe() throws Exception {
        when(loanSimulationService.findAllByUser(any())).thenReturn(List.of(dto));

        mockMvc.perform(get("/api/loan-simulations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Appartement Paris"))
                .andExpect(jsonPath("$[0].id").value(1));
    }

    @Test
    void findAll_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/loan-simulations"))
                .andExpect(status().isUnauthorized());
    }

    // ── POST ───────────────────────────────────────────────────

    @Test
    @WithMockCustomUser
    void create_avecCorpsValide_retourne201() throws Exception {
        CreateLoanSimulationRequest request = new CreateLoanSimulationRequest(
                "Appartement Paris", Map.of("propertyPrice", 250000));
        when(loanSimulationService.create(any(), any())).thenReturn(dto);

        mockMvc.perform(post("/api/loan-simulations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Appartement Paris"));
    }

    @Test
    @WithMockCustomUser
    void create_avecNomVide_retourne400() throws Exception {
        CreateLoanSimulationRequest request = new CreateLoanSimulationRequest(
                "", Map.of("propertyPrice", 250000));

        mockMvc.perform(post("/api/loan-simulations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockCustomUser
    void create_avecParametresNull_retourne400() throws Exception {
        String body = "{\"name\":\"Test\",\"parameters\":null}";

        mockMvc.perform(post("/api/loan-simulations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    // ── DELETE ─────────────────────────────────────────────────

    @Test
    @WithMockCustomUser
    void delete_retourne204() throws Exception {
        mockMvc.perform(delete("/api/loan-simulations/1"))
                .andExpect(status().isNoContent());

        verify(loanSimulationService).delete(eq(1L), any());
    }

    @Test
    @WithMockCustomUser
    void delete_retourne403_siPasLeProprietaire() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.FORBIDDEN))
                .when(loanSimulationService).delete(eq(1L), any());

        mockMvc.perform(delete("/api/loan-simulations/1"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockCustomUser
    void delete_retourne404_siIntrouvable() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.NOT_FOUND))
                .when(loanSimulationService).delete(eq(99L), any());

        mockMvc.perform(delete("/api/loan-simulations/99"))
                .andExpect(status().isNotFound());
    }

    @Test
    void delete_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(delete("/api/loan-simulations/1"))
                .andExpect(status().isUnauthorized());
    }
}
