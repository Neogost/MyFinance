package com.myfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.domain.AssetCategory;
import com.myfinance.dto.InstrumentDto;
import com.myfinance.dto.UpdateInstrumentPriceRequest;
import com.myfinance.service.InstrumentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(InstrumentController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class InstrumentControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean InstrumentService instrumentService;

    InstrumentDto etfDto;
    InstrumentDto bitcoinDto;

    @BeforeEach
    void setUp() {
        etfDto = new InstrumentDto(
                1L, AssetCategory.BOURSE, "FR0010315770", null,
                "Lyxor PEA Nasdaq-100", "EUR",
                new BigDecimal("88.44"), LocalDateTime.of(2026, 4, 1, 8, 0));

        bitcoinDto = new InstrumentDto(
                2L, AssetCategory.CRYPTO, null, "BTC",
                "Bitcoin", "USD",
                new BigDecimal("60000"), LocalDateTime.of(2026, 4, 1, 9, 0));
    }

    // ── GET /api/instruments ───────────────────────────────────

    @Test
    @WithMockUser
    void list_retourne200AvecLaListe() throws Exception {
        when(instrumentService.findAll(null, null)).thenReturn(List.of(etfDto, bitcoinDto));

        mockMvc.perform(get("/api/instruments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].isin").value("FR0010315770"))
                .andExpect(jsonPath("$[1].ticker").value("BTC"));
    }

    // ── GET /api/instruments/{id} ──────────────────────────────

    @Test
    @WithMockUser
    void getById_retourne200() throws Exception {
        when(instrumentService.findById(1L)).thenReturn(etfDto);

        mockMvc.perform(get("/api/instruments/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("Lyxor PEA Nasdaq-100"));
    }

    @Test
    @WithMockUser
    void getById_introuvable_retourne404() throws Exception {
        when(instrumentService.findById(99L))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));

        mockMvc.perform(get("/api/instruments/99"))
                .andExpect(status().isNotFound());
    }

    // ── GET /api/instruments/active ────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void listActive_asAdmin_retourne200AvecInstrumentsActifs() throws Exception {
        when(instrumentService.findActiveInstruments()).thenReturn(List.of(etfDto, bitcoinDto));

        mockMvc.perform(get("/api/instruments/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].category").value("BOURSE"))
                .andExpect(jsonPath("$[1].category").value("CRYPTO"));
    }

    @Test
    @WithMockUser(roles = "USER")
    void listActive_asUser_retourne403() throws Exception {
        mockMvc.perform(get("/api/instruments/active"))
                .andExpect(status().isForbidden());
    }

    @Test
    void listActive_nonAuthentifie_retourne401() throws Exception {
        mockMvc.perform(get("/api/instruments/active"))
                .andExpect(status().isUnauthorized());
    }

    // ── PUT /api/instruments/prices ────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void updatePrices_asAdmin_retourne200AvecInstrumentsMisAJour() throws Exception {
        InstrumentDto updated = new InstrumentDto(
                1L, AssetCategory.BOURSE, "FR0010315770", null,
                "Lyxor PEA Nasdaq-100", "EUR",
                new BigDecimal("95.00"), LocalDateTime.now());

        when(instrumentService.updatePrices(any())).thenReturn(List.of(updated));

        List<UpdateInstrumentPriceRequest> body = List.of(
                new UpdateInstrumentPriceRequest(1L, new BigDecimal("95.00")));

        mockMvc.perform(put("/api/instruments/prices")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].lastPrice").value(95.00));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void updatePrices_instrumentIntrouvable_retourne404() throws Exception {
        when(instrumentService.updatePrices(any()))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));

        List<UpdateInstrumentPriceRequest> body = List.of(
                new UpdateInstrumentPriceRequest(99L, new BigDecimal("10.00")));

        mockMvc.perform(put("/api/instruments/prices")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(roles = "USER")
    void updatePrices_asUser_retourne403() throws Exception {
        List<UpdateInstrumentPriceRequest> body = List.of(
                new UpdateInstrumentPriceRequest(1L, new BigDecimal("95.00")));

        mockMvc.perform(put("/api/instruments/prices")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isForbidden());
    }
}
