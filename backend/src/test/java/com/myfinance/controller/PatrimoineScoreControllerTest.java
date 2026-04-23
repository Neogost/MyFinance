package com.myfinance.controller;

import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.dto.PatrimoineScoreDto;
import com.myfinance.service.PatrimoineScoreService;
import com.myfinance.support.WithMockCustomUser;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PatrimoineScoreController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class PatrimoineScoreControllerTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean PatrimoineScoreService patrimoineScoreService;

    @Test
    @WithMockCustomUser
    void getScore_retourne200AvecLeScore() throws Exception {
        PatrimoineScoreDto dto = new PatrimoineScoreDto(
                68, 105, "EQUILIBRE", "EPARGNE",
                "Augmentez votre taux d'épargne mensuel.",
                List.of(
                        new PatrimoineScoreDto.AxeScoreDto("DIVERSIFICATION", "Diversification", 13, 20, "3 catégories actives.", false),
                        new PatrimoineScoreDto.AxeScoreDto("MATELAS", "Matelas de sécurité", 15, 15, "Couverture : 100%.", false),
                        new PatrimoineScoreDto.AxeScoreDto("ENDETTEMENT", "Endettement", 14, 20, "Taux d'endettement : 25%.", false),
                        new PatrimoineScoreDto.AxeScoreDto("EPARGNE", "Capacité d'épargne", 8, 20, "Taux d'épargne : 8%.", false),
                        new PatrimoineScoreDto.AxeScoreDto("AGE_RISQUE", "Cohérence âge/risque", 10, 15, "35 ans → cible : 75%.", false),
                        new PatrimoineScoreDto.AxeScoreDto("PROGRESSION", "Progression", 8, 10, "Évolution : +3%.", false)
                )
        );
        when(patrimoineScoreService.computeScore(any())).thenReturn(dto);

        mockMvc.perform(get("/api/patrimoine/score"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalScore").value(68))
                .andExpect(jsonPath("$.maxScore").value(105))
                .andExpect(jsonPath("$.profile").value("EQUILIBRE"))
                .andExpect(jsonPath("$.axes.length()").value(6))
                .andExpect(jsonPath("$.weakestAxisId").value("EPARGNE"));
    }

    @Test
    void getScore_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/patrimoine/score"))
                .andExpect(status().isUnauthorized());
    }
}
