package com.myfinance.controller;

import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.PositionStatus;
import com.myfinance.dto.CategoryPerformanceDto;
import com.myfinance.dto.PerformanceDto;
import com.myfinance.dto.PositionPerformanceDto;
import com.myfinance.service.PerformanceService;
import com.myfinance.support.WithMockCustomUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
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

    PerformanceDto globalDto;

    @BeforeEach
    void setUp() {
        globalDto = new PerformanceDto(
                LocalDate.of(2024, 1, 1), LocalDate.now(), 1.3,
                LocalDate.of(2024, 1, 1), null,
                0.092, 0.078,
                new BigDecimal("45200"), new BigDecimal("58900"), new BigDecimal("13700"),
                new BigDecimal("1240"),
                8.0, 0.012, null, List.of(),
                List.of(new CategoryPerformanceDto(AssetCategory.BOURSE, 0.113, 0.098,
                        new BigDecimal("28400"), new BigDecimal("38200"), new BigDecimal("9800"),
                        new BigDecimal("620")))
        );
    }

    // ── GET /api/patrimoine/performance ────────────────────────────────

    @Test
    @WithMockCustomUser(role = "ADMIN")
    void getGlobal_retourne200() throws Exception {
        when(performanceService.computeGlobal(any(), any(), any(), any())).thenReturn(globalDto);

        mockMvc.perform(get("/api/patrimoine/performance"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.twrAnnualized").value(0.092))
                .andExpect(jsonPath("$.mwrAnnualized").value(0.078))
                .andExpect(jsonPath("$.benchmarkRate").value(8.0))
                .andExpect(jsonPath("$.categories.length()").value(1))
                .andExpect(jsonPath("$.categories[0].category").value("BOURSE"));
    }

    @Test
    @WithMockCustomUser(role = "ADMIN")
    void getGlobal_avecParametres_retourne200() throws Exception {
        when(performanceService.computeGlobal(any(), any(), any(), any())).thenReturn(globalDto);

        mockMvc.perform(get("/api/patrimoine/performance")
                        .param("from", "2024-01-01")
                        .param("to", "2025-01-01")
                        .param("benchmarkRate", "8.0"))
                .andExpect(status().isOk());
    }

    @Test
    void getGlobal_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/patrimoine/performance"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockCustomUser  // role USER par défaut
    void getGlobal_userNonAdmin_retourne403() throws Exception {
        mockMvc.perform(get("/api/patrimoine/performance"))
                .andExpect(status().isForbidden());
    }

    // ── GET /api/patrimoine/performance/positions ───────────────────────

    @Test
    @WithMockCustomUser(role = "ADMIN")
    void getPositions_retourne200() throws Exception {
        PositionPerformanceDto pos = new PositionPerformanceDto(
                10L, "CW8", AssetCategory.BOURSE, PositionStatus.ACTIVE,
                0.113, 0.098, new BigDecimal("28400"), new BigDecimal("38200"), new BigDecimal("9800"));
        when(performanceService.computePositions(any(), any(), any())).thenReturn(List.of(pos));

        mockMvc.perform(get("/api/patrimoine/performance/positions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].label").value("CW8"))
                .andExpect(jsonPath("$[0].twrAnnualized").value(0.113));
    }

    @Test
    void getPositions_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/patrimoine/performance/positions"))
                .andExpect(status().isUnauthorized());
    }

    // ── GET /api/patrimoine/performance/positions/{id} ──────────────────

    @Test
    @WithMockCustomUser(role = "ADMIN")
    void getPosition_retourne200() throws Exception {
        PositionPerformanceDto pos = new PositionPerformanceDto(
                10L, "CW8", AssetCategory.BOURSE, PositionStatus.ACTIVE,
                0.113, 0.098, new BigDecimal("28400"), new BigDecimal("38200"), new BigDecimal("9800"));
        when(performanceService.computePosition(eq(10L), any(), any(), any())).thenReturn(pos);

        mockMvc.perform(get("/api/patrimoine/performance/positions/10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.positionId").value(10))
                .andExpect(jsonPath("$.category").value("BOURSE"));
    }

    @Test
    @WithMockCustomUser(role = "ADMIN")
    void getPosition_retourne404_siIntrouvable() throws Exception {
        when(performanceService.computePosition(eq(99L), any(), any(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));

        mockMvc.perform(get("/api/patrimoine/performance/positions/99"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockCustomUser(role = "ADMIN")
    void getPosition_retourne403_siAutreUtilisateur() throws Exception {
        when(performanceService.computePosition(eq(10L), any(), any(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));

        mockMvc.perform(get("/api/patrimoine/performance/positions/10"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockCustomUser(role = "ADMIN")
    void getPosition_retourne400_siCategorieNonEligible() throws Exception {
        when(performanceService.computePosition(eq(11L), any(), any(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST));

        mockMvc.perform(get("/api/patrimoine/performance/positions/11"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getPosition_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/patrimoine/performance/positions/10"))
                .andExpect(status().isUnauthorized());
    }
}
