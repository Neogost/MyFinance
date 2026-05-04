package com.myfinance.controller;

import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.Instrument;
import com.myfinance.dto.BenchmarkDto;
import com.myfinance.repository.InstrumentRepository;
import com.myfinance.service.BenchmarkService;
import com.myfinance.service.PerformanceService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PerformanceController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class BenchmarkControllerTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean PerformanceService  performanceService;
    @MockitoBean BenchmarkService    benchmarkService;
    @MockitoBean InstrumentRepository instrumentRepository;

    private Instrument cw8() {
        Instrument i = new Instrument();
        i.setId(42L);
        i.setName("Amundi MSCI World");
        i.setTicker("CW8");
        i.setCurrency("EUR");
        i.setCategory(AssetCategory.BOURSE);
        return i;
    }

    private BenchmarkDto sampleBenchmark() {
        return new BenchmarkDto(42L, "Amundi MSCI World (CW8)", "EUR",
                LocalDate.of(2024, 1, 1), LocalDate.of(2025, 1, 1),
                0.112,
                List.of(
                        new BenchmarkDto.BenchmarkMonthDto("2023-12", 100.0),
                        new BenchmarkDto.BenchmarkMonthDto("2024-01", 102.5)
                ));
    }

    // ── Nominal ───────────────────────────────────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void getBenchmark_instrumentExistant_retourne200() throws Exception {
        when(instrumentRepository.findById(42L)).thenReturn(Optional.of(cw8()));
        when(benchmarkService.compute(any(), any(), any())).thenReturn(sampleBenchmark());

        mockMvc.perform(get("/api/patrimoine/performance/benchmark?instrumentId=42&from=2024-01-01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.instrumentId").value(42))
                .andExpect(jsonPath("$.label").value("Amundi MSCI World (CW8)"))
                .andExpect(jsonPath("$.twrAnnualized").value(0.112))
                .andExpect(jsonPath("$.series").isArray())
                .andExpect(jsonPath("$.series[0].month").value("2023-12"))
                .andExpect(jsonPath("$.series[0].value").value(100.0));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getBenchmark_instrumentInexistant_retourne404() throws Exception {
        when(instrumentRepository.findById(999L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/patrimoine/performance/benchmark?instrumentId=999&from=2024-01-01"))
                .andExpect(status().isNotFound());
    }

    // ── Sécurité ──────────────────────────────────────────────────────────────

    @Test
    void getBenchmark_nonAuthentifie_retourne401() throws Exception {
        mockMvc.perform(get("/api/patrimoine/performance/benchmark?instrumentId=42"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "USER")
    void getBenchmark_roleUser_retourne403() throws Exception {
        mockMvc.perform(get("/api/patrimoine/performance/benchmark?instrumentId=42"))
                .andExpect(status().isForbidden());
    }
}
