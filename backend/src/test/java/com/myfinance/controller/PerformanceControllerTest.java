package com.myfinance.controller;

import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.dto.PerformanceDto;
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

import static org.mockito.ArgumentMatchers.any;
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
                List.of()
        );
    }

    // ── Nominal — ADMIN ───────────────────────────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void getPerformance_admin_retourne200() throws Exception {
        when(performanceService.computeGlobal(any())).thenReturn(sampleDto());

        mockMvc.perform(get("/api/patrimoine/performance"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.twrAnnualized").value(0.092))
                .andExpect(jsonPath("$.mwrAnnualized").value(0.078))
                .andExpect(jsonPath("$.currentValueEur").value(58900.00))
                .andExpect(jsonPath("$.warnings[0]").value("Avertissement test"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getPerformance_twrEtMwrNull_serialiseNulls() throws Exception {
        PerformanceDto dtoSansResultat = new PerformanceDto(
                Instant.now(), LocalDate.now(), LocalDate.now(), 0,
                null, null,
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                List.of("Aucune position éligible"), List.of()
        );
        when(performanceService.computeGlobal(any())).thenReturn(dtoSansResultat);

        mockMvc.perform(get("/api/patrimoine/performance"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.twrAnnualized").doesNotExist())
                .andExpect(jsonPath("$.mwrAnnualized").doesNotExist())
                .andExpect(jsonPath("$.warnings").isArray());
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
