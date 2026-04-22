package com.myfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.service.PatrimoineTargetService;
import com.myfinance.support.WithMockCustomUser;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PatrimoineTargetController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class PatrimoineTargetControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean PatrimoineTargetService patrimoineTargetService;

    // ── GET ────────────────────────────────────────────────────

    @Test
    @WithMockCustomUser
    void getTargets_retourne200AvecLaMap() throws Exception {
        when(patrimoineTargetService.getTargets(any()))
                .thenReturn(Map.of("BOURSE", 50000.0, "LIVRET", 20000.0));

        mockMvc.perform(get("/api/patrimoine/targets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.BOURSE").value(50000.0))
                .andExpect(jsonPath("$.LIVRET").value(20000.0));
    }

    @Test
    @WithMockCustomUser
    void getTargets_retourne200AvecMapVide_siAucunObjectif() throws Exception {
        when(patrimoineTargetService.getTargets(any())).thenReturn(Map.of());

        mockMvc.perform(get("/api/patrimoine/targets"))
                .andExpect(status().isOk())
                .andExpect(content().json("{}"));
    }

    @Test
    void getTargets_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/patrimoine/targets"))
                .andExpect(status().isUnauthorized());
    }

    // ── PUT ────────────────────────────────────────────────────

    @Test
    @WithMockCustomUser
    void saveTargets_retourne200AvecLaMapMiseAJour() throws Exception {
        Map<String, Double> targets = Map.of("BOURSE", 50000.0, "CRYPTO", 5000.0);
        when(patrimoineTargetService.saveTargets(any(), any())).thenReturn(targets);

        mockMvc.perform(put("/api/patrimoine/targets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(targets)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.BOURSE").value(50000.0))
                .andExpect(jsonPath("$.CRYPTO").value(5000.0));

        verify(patrimoineTargetService).saveTargets(any(), any());
    }

    @Test
    void saveTargets_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(put("/api/patrimoine/targets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }
}
