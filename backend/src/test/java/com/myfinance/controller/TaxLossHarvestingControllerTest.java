package com.myfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.dto.BasketAnalysisDto;
import com.myfinance.dto.TaxLossSummaryDto;
import com.myfinance.service.CryptoTaxService;
import com.myfinance.service.TaxLossHarvestingService;
import com.myfinance.support.WithMockCustomUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(TaxLossHarvestingController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class TaxLossHarvestingControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean TaxLossHarvestingService taxLossHarvestingService;
    @MockitoBean CryptoTaxService cryptoTaxService;

    TaxLossSummaryDto dto;

    @BeforeEach
    void setUp() {
        BasketAnalysisDto emptyBasket = new BasketAnalysisDto(
                "Compte-titres ordinaire",
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                List.of()
        );
        BasketAnalysisDto cryptoBasket = new BasketAnalysisDto(
                "Crypto-monnaies",
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                List.of()
        );
        dto = new TaxLossSummaryDto(emptyBasket, cryptoBasket, 2026, "PFU", null,
                BigDecimal.ZERO, BigDecimal.ZERO);
    }

    // ── GET nominal ────────────────────────────────────────────

    @Test
    @WithMockCustomUser
    void getSummary_retourne200_avecAnneeCourante() throws Exception {
        when(taxLossHarvestingService.computeSummary(any(), anyInt(), any(), any(), any(), any())).thenReturn(dto);

        mockMvc.perform(get("/api/tax-loss-harvesting"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.year").value(dto.year()))
                .andExpect(jsonPath("$.cto.basketLabel").value("Compte-titres ordinaire"))
                .andExpect(jsonPath("$.crypto.basketLabel").value("Crypto-monnaies"));
    }

    @Test
    @WithMockCustomUser
    void getSummary_retourne200_avecAnneePersonnalisee() throws Exception {
        when(taxLossHarvestingService.computeSummary(any(), eq(2024), any(), any(), any(), any())).thenReturn(dto);

        mockMvc.perform(get("/api/tax-loss-harvesting?year=2024"))
                .andExpect(status().isOk());

        verify(taxLossHarvestingService).computeSummary(any(), eq(2024), any(), any(), any(), any());
    }

    // ── Sécurité ───────────────────────────────────────────────

    @Test
    void getSummary_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/tax-loss-harvesting"))
                .andExpect(status().isUnauthorized());
    }
}
