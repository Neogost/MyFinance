package com.myfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.domain.DebtTypeEnum;
import com.myfinance.dto.*;
import com.myfinance.service.DebtService;
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
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(DebtController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class DebtControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean DebtService debtService;

    DebtDto debtDto;
    DebtBalanceEntryDto entryDto;

    @BeforeEach
    void setUp() {
        debtDto = new DebtDto(
                1L, DebtTypeEnum.IMMOBILIER, "Crédit appart", "BNP",
                LocalDate.of(2020, 1, 1), null,
                new BigDecimal("200000.00"), new BigDecimal("0.03250"),
                new BigDecimal("0.00350"), new BigDecimal("900.00"),
                new BigDecimal("185000.00"), true,
                new BigDecimal("58.33"), new BigDecimal("958.33"),
                new BigDecimal("7.50"), null, "EUR", null, List.of());

        entryDto = new DebtBalanceEntryDto(
                1L, LocalDate.of(2024, 6, 1),
                new BigDecimal("185000.00"), "Relevé juin", null);
    }

    // ── GET /api/debts ─────────────────────────────────────────

    @Test
    @WithMockCustomUser
    void findAll_retourne200() throws Exception {
        when(debtService.findAllByUser(any())).thenReturn(List.of(debtDto));

        mockMvc.perform(get("/api/debts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].label").value("Crédit appart"));
    }

    @Test
    void findAll_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/debts"))
                .andExpect(status().isUnauthorized());
    }

    // ── GET /api/debts/{id} ────────────────────────────────────

    @Test
    @WithMockCustomUser
    void findById_retourne200() throws Exception {
        when(debtService.findById(eq(1L), any())).thenReturn(debtDto);

        mockMvc.perform(get("/api/debts/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("IMMOBILIER"));
    }

    @Test
    @WithMockCustomUser
    void findById_retourne404() throws Exception {
        when(debtService.findById(eq(99L), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));

        mockMvc.perform(get("/api/debts/99"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockCustomUser
    void findById_retourne403() throws Exception {
        when(debtService.findById(eq(1L), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));

        mockMvc.perform(get("/api/debts/1"))
                .andExpect(status().isForbidden());
    }

    // ── GET /api/debts/summary ─────────────────────────────────

    @Test
    @WithMockCustomUser
    void getSummary_retourne200() throws Exception {
        DebtSummaryDto summary = new DebtSummaryDto(1,
                new BigDecimal("185000.00"), new BigDecimal("900.00"),
                new BigDecimal("58.33"), new BigDecimal("958.33"), List.of());
        when(debtService.getSummary(any())).thenReturn(summary);

        mockMvc.perform(get("/api/debts/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCount").value(1));
    }

    // ── POST /api/debts ────────────────────────────────────────

    @Test
    @WithMockCustomUser
    void create_avecCorpsValide_retourne201() throws Exception {
        CreateDebtRequest request = new CreateDebtRequest(
                DebtTypeEnum.IMMOBILIER, "Crédit appart", "BNP",
                LocalDate.of(2020, 1, 1), null,
                new BigDecimal("200000.00"), new BigDecimal("0.03250"),
                null, new BigDecimal("900.00"), null, "EUR", null);

        when(debtService.create(any(), any())).thenReturn(debtDto);

        mockMvc.perform(post("/api/debts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.label").value("Crédit appart"));
    }

    @Test
    @WithMockCustomUser
    void create_avecCorpsInvalide_retourne400() throws Exception {
        // label vide + initialCapital null → validation échoue
        CreateDebtRequest request = new CreateDebtRequest(
                null, "", null, null, null,
                null, null, null, null, null, null, null);

        mockMvc.perform(post("/api/debts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    // ── PUT /api/debts/{id} ────────────────────────────────────

    @Test
    @WithMockCustomUser
    void update_retourne200() throws Exception {
        UpdateDebtRequest request = new UpdateDebtRequest(
                DebtTypeEnum.IMMOBILIER, "Modifié", null, null, null,
                new BigDecimal("200000.00"), new BigDecimal("0.03250"),
                null, new BigDecimal("900.00"), null, "EUR", null);

        when(debtService.update(eq(1L), any(), any())).thenReturn(debtDto);

        mockMvc.perform(put("/api/debts/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockCustomUser
    void update_retourne403() throws Exception {
        UpdateDebtRequest request = new UpdateDebtRequest(
                DebtTypeEnum.IMMOBILIER, "Test", null, null, null,
                new BigDecimal("200000.00"), new BigDecimal("0.03250"),
                null, null, null, "EUR", null);

        when(debtService.update(eq(1L), any(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));

        mockMvc.perform(put("/api/debts/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    // ── DELETE /api/debts/{id} ─────────────────────────────────

    @Test
    @WithMockCustomUser
    void delete_retourne204() throws Exception {
        mockMvc.perform(delete("/api/debts/1"))
                .andExpect(status().isNoContent());

        verify(debtService).delete(eq(1L), any());
    }

    // ── GET /api/debts/{id}/balance-entries ───────────────────

    @Test
    @WithMockCustomUser
    void getBalanceEntries_retourne200() throws Exception {
        when(debtService.getBalanceEntries(eq(1L), any())).thenReturn(List.of(entryDto));

        mockMvc.perform(get("/api/debts/1/balance-entries"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    // ── POST /api/debts/{id}/balance-entries ──────────────────

    @Test
    @WithMockCustomUser
    void addBalanceEntry_retourne201() throws Exception {
        CreateDebtBalanceEntryRequest request = new CreateDebtBalanceEntryRequest(
                LocalDate.of(2024, 6, 1), new BigDecimal("185000.00"), "Relevé");

        when(debtService.addBalanceEntry(eq(1L), any(), any())).thenReturn(entryDto);

        mockMvc.perform(post("/api/debts/1/balance-entries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.balance").value(185000.00));
    }

    @Test
    @WithMockCustomUser
    void addBalanceEntry_avecCorpsInvalide_retourne400() throws Exception {
        // balance null → validation échoue
        CreateDebtBalanceEntryRequest request = new CreateDebtBalanceEntryRequest(
                null, null, null);

        mockMvc.perform(post("/api/debts/1/balance-entries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    // ── DELETE /api/debts/{id}/balance-entries/{entryId} ──────

    @Test
    @WithMockCustomUser
    void deleteBalanceEntry_retourne204() throws Exception {
        mockMvc.perform(delete("/api/debts/1/balance-entries/1"))
                .andExpect(status().isNoContent());

        verify(debtService).deleteBalanceEntry(eq(1L), eq(1L), any());
    }
}
