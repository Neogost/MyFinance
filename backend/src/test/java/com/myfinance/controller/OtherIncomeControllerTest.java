package com.myfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.domain.OtherIncomeTypeEnum;
import com.myfinance.dto.CreateOtherIncomeRequest;
import com.myfinance.dto.OtherIncomeDto;
import com.myfinance.dto.UpdateOtherIncomeRequest;
import com.myfinance.service.OtherIncomeService;
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

@WebMvcTest(OtherIncomeController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class OtherIncomeControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean OtherIncomeService otherIncomeService;

    OtherIncomeDto incomeDto;

    @BeforeEach
    void setUp() {
        incomeDto = new OtherIncomeDto(
                1L, OtherIncomeTypeEnum.LOCATIF, "Loyer appartement Lyon",
                750f, LocalDate.of(2025, 3, 1));
    }

    // ── GET /api/other-incomes ─────────────────────────────────

    @Test
    @WithMockCustomUser
    void findAll_retourne200AvecLaListe() throws Exception {
        when(otherIncomeService.findAllByUser(any())).thenReturn(List.of(incomeDto));

        mockMvc.perform(get("/api/other-incomes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].type").value("LOCATIF"))
                .andExpect(jsonPath("$[0].amount").value(750.0));
    }

    @Test
    void findAll_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/other-incomes"))
                .andExpect(status().isUnauthorized());
    }

    // ── POST /api/other-incomes ────────────────────────────────

    @Test
    @WithMockCustomUser
    void create_avecCorpsValide_retourne201() throws Exception {
        CreateOtherIncomeRequest request = new CreateOtherIncomeRequest(
                OtherIncomeTypeEnum.LOCATIF, "Loyer appartement Lyon",
                750f, LocalDate.of(2025, 3, 1));

        when(otherIncomeService.create(any(), any())).thenReturn(incomeDto);

        mockMvc.perform(post("/api/other-incomes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.label").value("Loyer appartement Lyon"))
                .andExpect(jsonPath("$.type").value("LOCATIF"));
    }

    @Test
    @WithMockCustomUser
    void create_avecCorpsInvalide_retourne400() throws Exception {
        // amount négatif → violation @Positive
        CreateOtherIncomeRequest request = new CreateOtherIncomeRequest(
                OtherIncomeTypeEnum.LOCATIF, "Test", -100f, LocalDate.of(2025, 3, 1));

        mockMvc.perform(post("/api/other-incomes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockCustomUser
    void create_avecLabelVide_retourne400() throws Exception {
        CreateOtherIncomeRequest request = new CreateOtherIncomeRequest(
                OtherIncomeTypeEnum.AUTRE, "", 100f, LocalDate.of(2025, 3, 1));

        mockMvc.perform(post("/api/other-incomes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    // ── PUT /api/other-incomes/{id} ────────────────────────────

    @Test
    @WithMockCustomUser
    void update_avecCorpsValide_retourne200() throws Exception {
        UpdateOtherIncomeRequest request = new UpdateOtherIncomeRequest(
                OtherIncomeTypeEnum.LOCATIF, "Loyer révisé", 780f, LocalDate.of(2025, 4, 1));
        OtherIncomeDto updated = new OtherIncomeDto(
                1L, OtherIncomeTypeEnum.LOCATIF, "Loyer révisé", 780f, LocalDate.of(2025, 4, 1));

        when(otherIncomeService.update(eq(1L), any(), any())).thenReturn(updated);

        mockMvc.perform(put("/api/other-incomes/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.amount").value(780.0))
                .andExpect(jsonPath("$.label").value("Loyer révisé"));
    }

    @Test
    @WithMockCustomUser
    void update_retourne403_siAccesNonAutorise() throws Exception {
        UpdateOtherIncomeRequest request = new UpdateOtherIncomeRequest(
                OtherIncomeTypeEnum.LOCATIF, "Loyer", 750f, LocalDate.of(2025, 3, 1));

        when(otherIncomeService.update(eq(1L), any(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));

        mockMvc.perform(put("/api/other-incomes/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockCustomUser
    void update_retourne404_siIntrouvable() throws Exception {
        UpdateOtherIncomeRequest request = new UpdateOtherIncomeRequest(
                OtherIncomeTypeEnum.AUTRE, "Test", 100f, LocalDate.now());

        when(otherIncomeService.update(eq(99L), any(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));

        mockMvc.perform(put("/api/other-incomes/99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    // ── DELETE /api/other-incomes/{id} ────────────────────────

    @Test
    @WithMockCustomUser
    void delete_retourne204() throws Exception {
        mockMvc.perform(delete("/api/other-incomes/1"))
                .andExpect(status().isNoContent());

        verify(otherIncomeService).delete(eq(1L), any());
    }

    @Test
    @WithMockCustomUser
    void delete_retourne403_siAccesNonAutorise() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.FORBIDDEN))
                .when(otherIncomeService).delete(eq(1L), any());

        mockMvc.perform(delete("/api/other-incomes/1"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockCustomUser
    void delete_retourne404_siIntrouvable() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.NOT_FOUND))
                .when(otherIncomeService).delete(eq(99L), any());

        mockMvc.perform(delete("/api/other-incomes/99"))
                .andExpect(status().isNotFound());
    }
}
