package com.myfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.domain.PossessionCategoryEnum;
import com.myfinance.dto.*;
import com.myfinance.service.PossessionService;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PossessionController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class PossessionControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean PossessionService possessionService;

    PossessionDto dto;
    PossessionSummaryDto summaryDto;

    @BeforeEach
    void setUp() {
        dto = new PossessionDto(
                1L, PossessionCategoryEnum.VEHICULE, "Renault Clio",
                new BigDecimal("18500.00"), LocalDate.of(2022, 3, 15),
                null, new BigDecimal("13000.00"), new BigDecimal("13000.00"),
                false, new BigDecimal("5500.00"), new BigDecimal("29.73"),
                2.08, null, LocalDateTime.now()
        );

        summaryDto = new PossessionSummaryDto(
                new BigDecimal("18500.00"), new BigDecimal("13000.00"),
                new BigDecimal("5500.00"), new BigDecimal("29.73"),
                List.of(new PossessionCategorySummaryDto(
                        PossessionCategoryEnum.VEHICULE, 1,
                        new BigDecimal("18500.00"), new BigDecimal("13000.00"),
                        new BigDecimal("5500.00")
                ))
        );
    }

    // ── GET /api/possessions ───────────────────────────────────

    @Test
    @WithMockCustomUser
    void findAll_retourne200() throws Exception {
        when(possessionService.findAllByUser(any())).thenReturn(List.of(dto));

        mockMvc.perform(get("/api/possessions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].label").value("Renault Clio"));
    }

    @Test
    void findAll_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/possessions"))
                .andExpect(status().isUnauthorized());
    }

    // ── GET /api/possessions/{id} ──────────────────────────────

    @Test
    @WithMockCustomUser
    void findById_retourne200() throws Exception {
        when(possessionService.findById(eq(1L), any())).thenReturn(dto);

        mockMvc.perform(get("/api/possessions/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.category").value("VEHICULE"));
    }

    @Test
    @WithMockCustomUser
    void findById_retourne404() throws Exception {
        when(possessionService.findById(eq(99L), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));

        mockMvc.perform(get("/api/possessions/99"))
                .andExpect(status().isNotFound());
    }

    // ── GET /api/possessions/summary ──────────────────────────

    @Test
    @WithMockCustomUser
    void getSummary_retourne200() throws Exception {
        when(possessionService.getSummary(any())).thenReturn(summaryDto);

        mockMvc.perform(get("/api/possessions/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalPurchasePrice").value(18500.00))
                .andExpect(jsonPath("$.byCategory.length()").value(1));
    }

    // ── POST /api/possessions ──────────────────────────────────

    @Test
    @WithMockCustomUser
    void create_avecCorpsValide_retourne201() throws Exception {
        CreatePossessionRequest request = new CreatePossessionRequest(
                PossessionCategoryEnum.VEHICULE, "Renault Clio",
                new BigDecimal("18500.00"), LocalDate.of(2022, 3, 15),
                null, null);

        when(possessionService.create(any(), any())).thenReturn(dto);

        mockMvc.perform(post("/api/possessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.label").value("Renault Clio"));
    }

    @Test
    @WithMockCustomUser
    void create_avecLabelVide_retourne400() throws Exception {
        CreatePossessionRequest request = new CreatePossessionRequest(
                PossessionCategoryEnum.VEHICULE, "",
                new BigDecimal("18500.00"), LocalDate.of(2022, 3, 15),
                null, null);

        mockMvc.perform(post("/api/possessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockCustomUser
    void create_avecPrixNegatif_retourne400() throws Exception {
        CreatePossessionRequest request = new CreatePossessionRequest(
                PossessionCategoryEnum.VEHICULE, "Clio",
                new BigDecimal("-100.00"), LocalDate.of(2022, 3, 15),
                null, null);

        mockMvc.perform(post("/api/possessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_sansAuthentification_retourne401() throws Exception {
        CreatePossessionRequest request = new CreatePossessionRequest(
                PossessionCategoryEnum.VEHICULE, "Clio",
                new BigDecimal("18500.00"), LocalDate.of(2022, 3, 15),
                null, null);

        mockMvc.perform(post("/api/possessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    // ── PUT /api/possessions/{id} ──────────────────────────────

    @Test
    @WithMockCustomUser
    void update_retourne200() throws Exception {
        UpdatePossessionRequest request = new UpdatePossessionRequest(
                PossessionCategoryEnum.VEHICULE, "Clio modifiée",
                new BigDecimal("17000.00"), LocalDate.of(2022, 3, 15),
                null, null);

        when(possessionService.update(eq(1L), any(), any())).thenReturn(dto);

        mockMvc.perform(put("/api/possessions/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockCustomUser
    void update_retourne403() throws Exception {
        when(possessionService.update(eq(1L), any(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));

        UpdatePossessionRequest request = new UpdatePossessionRequest(
                PossessionCategoryEnum.VEHICULE, "X",
                new BigDecimal("1.00"), LocalDate.of(2022, 3, 15),
                null, null);

        mockMvc.perform(put("/api/possessions/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockCustomUser
    void update_retourne404() throws Exception {
        when(possessionService.update(eq(99L), any(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));

        UpdatePossessionRequest request = new UpdatePossessionRequest(
                PossessionCategoryEnum.VEHICULE, "X",
                new BigDecimal("1.00"), LocalDate.of(2022, 3, 15),
                null, null);

        mockMvc.perform(put("/api/possessions/99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    // ── DELETE /api/possessions/{id} ───────────────────────────

    @Test
    @WithMockCustomUser
    void delete_retourne204() throws Exception {
        mockMvc.perform(delete("/api/possessions/1"))
                .andExpect(status().isNoContent());

        verify(possessionService).delete(eq(1L), any());
    }

    @Test
    @WithMockCustomUser
    void delete_retourne403() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.FORBIDDEN))
                .when(possessionService).delete(eq(1L), any());

        mockMvc.perform(delete("/api/possessions/1"))
                .andExpect(status().isForbidden());
    }

    @Test
    void delete_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(delete("/api/possessions/1"))
                .andExpect(status().isUnauthorized());
    }
}
