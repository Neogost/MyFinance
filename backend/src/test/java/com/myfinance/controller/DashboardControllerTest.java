package com.myfinance.controller;

import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.dto.SalaryEvolutionPointDto;
import com.myfinance.service.DashboardService;
import com.myfinance.support.WithMockCustomUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DashboardController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class DashboardControllerTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean DashboardService dashboardService;

    SalaryEvolutionPointDto point1;
    SalaryEvolutionPointDto point2;

    @BeforeEach
    void setUp() {
        point1 = new SalaryEvolutionPointDto(
                LocalDate.of(2024, 1, 1), "Conserto",
                3750f, 3082f, 2857f, 225f);
        point2 = new SalaryEvolutionPointDto(
                LocalDate.of(2025, 3, 1), "Milhertech",
                3916f, 3220f, 2980f, 240f);
    }

    // ── GET /api/dashboard/salary-evolution ───────────────────

    @Test
    @WithMockCustomUser
    void getSalaryEvolution_retourne200AvecLaListe() throws Exception {
        when(dashboardService.getSalaryEvolution(any())).thenReturn(List.of(point1, point2));

        mockMvc.perform(get("/api/dashboard/salary-evolution"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].period").value("2024-01-01"))
                .andExpect(jsonPath("$[0].companyName").value("Conserto"))
                .andExpect(jsonPath("$[0].grossSalary").value(3750.0))
                .andExpect(jsonPath("$[0].taxableNetSalary").value(3082.0))
                .andExpect(jsonPath("$[0].netSalary").value(2857.0))
                .andExpect(jsonPath("$[0].incomeTaxWithholding").value(225.0))
                .andExpect(jsonPath("$[1].companyName").value("Milhertech"));
    }

    @Test
    @WithMockCustomUser
    void getSalaryEvolution_retourne200AvecListeVide_siAucunBulletin() throws Exception {
        when(dashboardService.getSalaryEvolution(any())).thenReturn(List.of());

        mockMvc.perform(get("/api/dashboard/salary-evolution"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void getSalaryEvolution_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/dashboard/salary-evolution"))
                .andExpect(status().isUnauthorized());
    }
}
