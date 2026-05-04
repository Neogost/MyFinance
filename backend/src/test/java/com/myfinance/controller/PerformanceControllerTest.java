package com.myfinance.controller;

import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.dto.CategoryPerformanceDto;
import com.myfinance.dto.PerformanceDto;
import com.myfinance.dto.PositionPerformanceDto;
import com.myfinance.service.PerformanceService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PerformanceController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class PerformanceControllerTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean PerformanceService performanceService;

    private PerformanceDto sampleDto() {
        CategoryPerformanceDto bourseCategory = new CategoryPerformanceDto(
                "BOURSE", 0.085, 0.072,
                new BigDecimal("40000.00"), new BigDecimal("32000.00"),
                new BigDecimal("8000.00"), new BigDecimal("500.00")
        );
        PositionPerformanceDto position = new PositionPerformanceDto(
                1L, "CW8 - Amundi MSCI World", "BOURSE", "Boursorama", "EUR",
                0.085, 0.072,
                new BigDecimal("40000.00"), new BigDecimal("32000.00"),
                new BigDecimal("8000.00"), new BigDecimal("500.00")
        );
        return new PerformanceDto(
                Instant.now(),
                LocalDate.of(2024, 2, 1),
                LocalDate.of(2025, 5, 1),
                1.25,
                0.092,
                0.078,
                new BigDecimal("45200.00"),
                new BigDecimal("58900.00"),
                new BigDecimal("13700.00"),
                new BigDecimal("1240.00"),
                List.of("Avertissement test"),
                List.of(),
                List.of(bourseCategory),
                List.of(position)
        );
    }

    // ── Nominal — ADMIN sans paramètres (Global) ──────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void getPerformance_admin_sansPeriode_retourne200() throws Exception {
        when(performanceService.computeGlobal(any(), isNull(), isNull())).thenReturn(sampleDto());

        mockMvc.perform(get("/api/patrimoine/performance"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.twrAnnualized").value(0.092))
                .andExpect(jsonPath("$.mwrAnnualized").value(0.078))
                .andExpect(jsonPath("$.currentValueEur").value(58900.00))
                .andExpect(jsonPath("$.warnings[0]").value("Avertissement test"));
    }

    // ── Nominal — ADMIN avec paramètre from (période restreinte) ─────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void getPerformance_admin_avecFrom_retourne200() throws Exception {
        when(performanceService.computeGlobal(any(), eq(LocalDate.of(2025, 1, 1)), isNull()))
                .thenReturn(sampleDto());

        mockMvc.perform(get("/api/patrimoine/performance?from=2025-01-01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.twrAnnualized").value(0.092));
    }

    // ── Nominal — ADMIN avec from et to (période personnalisée) ──────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void getPerformance_admin_avecFromEtTo_retourne200() throws Exception {
        when(performanceService.computeGlobal(
                any(),
                eq(LocalDate.of(2024, 1, 1)),
                eq(LocalDate.of(2024, 12, 31))))
                .thenReturn(sampleDto());

        mockMvc.perform(get("/api/patrimoine/performance?from=2024-01-01&to=2024-12-31"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.twrAnnualized").value(0.092));
    }

    // ── TWR et MWR null ───────────────────────────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void getPerformance_twrEtMwrNull_serialiseNulls() throws Exception {
        PerformanceDto dtoSansResultat = new PerformanceDto(
                Instant.now(), LocalDate.now(), LocalDate.now(), 0,
                null, null,
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                List.of("Aucune position éligible"), List.of(), List.of(), List.of()
        );
        when(performanceService.computeGlobal(any(), any(), any())).thenReturn(dtoSansResultat);

        mockMvc.perform(get("/api/patrimoine/performance"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.twrAnnualized").doesNotExist())
                .andExpect(jsonPath("$.mwrAnnualized").doesNotExist())
                .andExpect(jsonPath("$.warnings").isArray());
    }

    // ── byCategory sérialisé ─────────────────────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void getPerformance_byCategory_serialise() throws Exception {
        when(performanceService.computeGlobal(any(), any(), any())).thenReturn(sampleDto());

        mockMvc.perform(get("/api/patrimoine/performance"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.byCategory").isArray())
                .andExpect(jsonPath("$.byCategory[0].category").value("BOURSE"))
                .andExpect(jsonPath("$.byCategory[0].twrAnnualized").value(0.085));
    }

    // ── byPosition sérialisé ──────────────────────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void getPerformance_byPosition_serialise() throws Exception {
        when(performanceService.computeGlobal(any(), any(), any())).thenReturn(sampleDto());

        mockMvc.perform(get("/api/patrimoine/performance"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.byPosition").isArray())
                .andExpect(jsonPath("$.byPosition[0].label").value("CW8 - Amundi MSCI World"))
                .andExpect(jsonPath("$.byPosition[0].partner").value("Boursorama"))
                .andExpect(jsonPath("$.byPosition[0].twrAnnualized").value(0.085));
    }

    // ── Sécurité ──────────────────────────────────────────────────────────────

    @Test
    void getPerformance_nonAuthentifie_retourne401() throws Exception {
        mockMvc.perform(get("/api/patrimoine/performance"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "USER")
    void getPerformance_roleUser_retourne403() throws Exception {
        mockMvc.perform(get("/api/patrimoine/performance"))
                .andExpect(status().isForbidden());
    }
}
