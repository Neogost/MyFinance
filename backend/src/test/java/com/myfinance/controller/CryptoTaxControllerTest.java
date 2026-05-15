package com.myfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.dto.ConfirmCryptoHistoryRequest;
import com.myfinance.dto.CryptoCessionDto;
import com.myfinance.dto.CryptoTaxStateDto;
import com.myfinance.dto.CryptoTaxSummaryDto;
import com.myfinance.service.CryptoTaxService;
import com.myfinance.support.WithMockCustomUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CryptoTaxController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class CryptoTaxControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean CryptoTaxService cryptoTaxService;

    CryptoTaxStateDto stateDto;
    CryptoTaxSummaryDto summaryDto;
    CryptoCessionDto cessionDto;

    @BeforeEach
    void setUp() {
        stateDto = new CryptoTaxStateDto(
                new BigDecimal("8000.00"), new BigDecimal("12000.00"),
                LocalDate.of(2020, 1, 1), 3, false);

        summaryDto = new CryptoTaxSummaryDto(
                2024, new BigDecimal("8000.00"), new BigDecimal("4000.00"),
                new BigDecimal("12000.00"), new BigDecimal("8000.00"), BigDecimal.ZERO,
                new BigDecimal("8000.00"), false, true, "PFU", null,
                new BigDecimal("2400.00"), 1, List.of());

        cessionDto = new CryptoCessionDto(
                1L, LocalDate.of(2024, 6, 1), "Bitcoin",
                new BigDecimal("0.5"), new BigDecimal("12000.00"),
                new BigDecimal("8000.00"), new BigDecimal("24000.00"),
                false, new BigDecimal("8000.00"), new BigDecimal("4000.00"), null);
    }

    // ── GET /state ─────────────────────────────────────────────

    @Test
    @WithMockCustomUser
    void getState_retourne200() throws Exception {
        when(cryptoTaxService.getState(any())).thenReturn(stateDto);

        mockMvc.perform(get("/api/crypto-tax/state"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.historicalDataConfirmed").value(false))
                .andExpect(jsonPath("$.currentPta").value(8000.00));
    }

    @Test
    void getState_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/crypto-tax/state"))
                .andExpect(status().isUnauthorized());
    }

    // ── GET /summary ───────────────────────────────────────────

    @Test
    @WithMockCustomUser
    void getSummary_retourne200() throws Exception {
        when(cryptoTaxService.getSummary(any(), anyInt(), anyString(), any()))
                .thenReturn(summaryDto);

        mockMvc.perform(get("/api/crypto-tax/summary").param("year", "2024"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.year").value(2024))
                .andExpect(jsonPath("$.taxOption").value("PFU"))
                .andExpect(jsonPath("$.declarationRequired").value(true));
    }

    @Test
    @WithMockCustomUser
    void getSummary_avecOptionBareme_passeLeTmi() throws Exception {
        when(cryptoTaxService.getSummary(any(), anyInt(), eq("BAREME"), eq(30f)))
                .thenReturn(summaryDto);

        mockMvc.perform(get("/api/crypto-tax/summary")
                        .param("year", "2024")
                        .param("taxOption", "BAREME")
                        .param("tmi", "30.0"))
                .andExpect(status().isOk());

        verify(cryptoTaxService).getSummary(any(), eq(2024), eq("BAREME"), eq(30f));
    }

    // ── GET /cessions ──────────────────────────────────────────

    @Test
    @WithMockCustomUser
    void getCessions_retourne200AvecListe() throws Exception {
        when(cryptoTaxService.getCessions(any(), anyInt())).thenReturn(List.of(cessionDto));

        mockMvc.perform(get("/api/crypto-tax/cessions").param("year", "2024"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].instrumentLabel").value("Bitcoin"));
    }

    // ── GET /form-2086.csv ─────────────────────────────────────

    @Test
    @WithMockCustomUser
    void exportCsv_retourne200AvecCsv() throws Exception {
        when(cryptoTaxService.exportCsv(any(), anyInt()))
                .thenReturn("N°,Date de cession,...\n1,2024-06-01,...\nTOTAL,...\n");

        mockMvc.perform(get("/api/crypto-tax/form-2086.csv").param("year", "2024"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition",
                        "attachment; filename=\"fiscalite-crypto-2086-2024.csv\""))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("N°")));
    }

    // ── PUT /historical-data-confirmation ──────────────────────

    @Test
    @WithMockCustomUser
    void confirmHistoricalData_retourne204() throws Exception {
        mockMvc.perform(put("/api/crypto-tax/historical-data-confirmation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ConfirmCryptoHistoryRequest(true))))
                .andExpect(status().isNoContent());

        verify(cryptoTaxService).confirmHistoricalData(any(), any());
    }

    @Test
    @WithMockCustomUser
    void confirmHistoricalData_avecCorpsInvalide_retourne400() throws Exception {
        mockMvc.perform(put("/api/crypto-tax/historical-data-confirmation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"confirmed\": null}"))
                .andExpect(status().isBadRequest());
    }

    // ── Validation des @RequestParam ─────────────────────────────

    @Test
    @WithMockCustomUser
    void getSummary_yearHorsBornes_retourne400() throws Exception {
        mockMvc.perform(get("/api/crypto-tax/summary").param("year", "1500"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/crypto-tax/summary").param("year", "9999"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(cryptoTaxService);
    }

    @Test
    @WithMockCustomUser
    void getSummary_taxOptionInvalide_retourne400() throws Exception {
        mockMvc.perform(get("/api/crypto-tax/summary").param("taxOption", "OTHER"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(cryptoTaxService);
    }

    @Test
    @WithMockCustomUser
    void getSummary_tmiNegatifOuTropGrand_retourne400() throws Exception {
        mockMvc.perform(get("/api/crypto-tax/summary").param("tmi", "-1"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/crypto-tax/summary").param("tmi", "150"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockCustomUser
    void getCessions_yearHorsBornes_retourne400() throws Exception {
        mockMvc.perform(get("/api/crypto-tax/cessions").param("year", "0"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(cryptoTaxService);
    }
}
