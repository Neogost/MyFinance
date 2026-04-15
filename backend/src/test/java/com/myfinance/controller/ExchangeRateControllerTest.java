package com.myfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.dto.ExchangeRateDto;
import com.myfinance.dto.UpdateExchangeRateRequest;
import com.myfinance.service.ExchangeRateService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ExchangeRateController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class ExchangeRateControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean ExchangeRateService exchangeRateService;

    ExchangeRateDto usdDto;
    ExchangeRateDto gbpDto;

    @BeforeEach
    void setUp() {
        usdDto = new ExchangeRateDto(1L, "USD", new BigDecimal("1.08"),
                LocalDateTime.of(2026, 4, 10, 12, 0));
        gbpDto = new ExchangeRateDto(2L, "GBP", new BigDecimal("0.86"),
                LocalDateTime.of(2026, 4, 10, 12, 0));
    }

    // ── GET /api/exchange-rates ────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void list_asAdmin_retourne200AvecLesTaux() throws Exception {
        when(exchangeRateService.findAll()).thenReturn(List.of(gbpDto, usdDto));

        mockMvc.perform(get("/api/exchange-rates"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].currency").value("GBP"))
                .andExpect(jsonPath("$[1].currency").value("USD"))
                .andExpect(jsonPath("$[0].rate").value(0.86))
                .andExpect(jsonPath("$[1].rate").value(1.08));
    }

    @Test
    @WithMockUser(roles = "USER")
    void list_asUser_retourne403() throws Exception {
        mockMvc.perform(get("/api/exchange-rates"))
                .andExpect(status().isForbidden());
    }

    @Test
    void list_nonAuthentifie_retourne401() throws Exception {
        mockMvc.perform(get("/api/exchange-rates"))
                .andExpect(status().isUnauthorized());
    }

    // ── PUT /api/exchange-rates ────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void updateRates_asAdmin_retourne200AvecTauxMisAJour() throws Exception {
        ExchangeRateDto updated = new ExchangeRateDto(1L, "USD", new BigDecimal("1.10"),
                LocalDateTime.now());
        when(exchangeRateService.updateRates(any())).thenReturn(List.of(updated));

        List<UpdateExchangeRateRequest> body = List.of(
                new UpdateExchangeRateRequest("USD", new BigDecimal("1.10")));

        mockMvc.perform(put("/api/exchange-rates")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].currency").value("USD"))
                .andExpect(jsonPath("$[0].rate").value(1.10));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void updateRates_tauxNegatif_retourne400() throws Exception {
        List<UpdateExchangeRateRequest> body = List.of(
                new UpdateExchangeRateRequest("USD", new BigDecimal("-1.00")));

        mockMvc.perform(put("/api/exchange-rates")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "USER")
    void updateRates_asUser_retourne403() throws Exception {
        List<UpdateExchangeRateRequest> body = List.of(
                new UpdateExchangeRateRequest("USD", new BigDecimal("1.10")));

        mockMvc.perform(put("/api/exchange-rates")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isForbidden());
    }

    @Test
    void updateRates_nonAuthentifie_retourne401() throws Exception {
        List<UpdateExchangeRateRequest> body = List.of(
                new UpdateExchangeRateRequest("USD", new BigDecimal("1.10")));

        mockMvc.perform(put("/api/exchange-rates")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isUnauthorized());
    }
}
