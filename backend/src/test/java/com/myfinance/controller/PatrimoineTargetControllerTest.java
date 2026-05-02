package com.myfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.domain.BreakdownDimension;
import com.myfinance.dto.PatrimoineTargetsDto;
import com.myfinance.dto.SaveTargetsRequest;
import com.myfinance.dto.TargetBreakdownDto;
import com.myfinance.dto.TargetBreakdownInput;
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

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
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
    void getTargets_retourne200AvecTargetsEtBreakdowns() throws Exception {
        PatrimoineTargetsDto dto = new PatrimoineTargetsDto(
                Map.of("BOURSE", 50000.0, "LIVRET", 20000.0),
                Map.of(),
                Map.of("BOURSE", List.of(
                        new TargetBreakdownDto(BreakdownDimension.SECTOR, "Technology", BigDecimal.valueOf(30))
                )));
        when(patrimoineTargetService.getTargets(any())).thenReturn(dto);

        mockMvc.perform(get("/api/patrimoine/targets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.targets.BOURSE").value(50000.0))
                .andExpect(jsonPath("$.targets.LIVRET").value(20000.0))
                .andExpect(jsonPath("$.breakdowns.BOURSE[0].dimension").value("SECTOR"))
                .andExpect(jsonPath("$.breakdowns.BOURSE[0].key").value("Technology"))
                .andExpect(jsonPath("$.breakdowns.BOURSE[0].targetPercentage").value(30));
    }

    @Test
    @WithMockCustomUser
    void getTargets_retourne200AvecObjetVide() throws Exception {
        when(patrimoineTargetService.getTargets(any()))
                .thenReturn(new PatrimoineTargetsDto(Map.of(), Map.of(), Map.of()));

        mockMvc.perform(get("/api/patrimoine/targets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.targets").exists())
                .andExpect(jsonPath("$.breakdowns").exists());
    }

    @Test
    void getTargets_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/patrimoine/targets"))
                .andExpect(status().isUnauthorized());
    }

    // ── PUT ────────────────────────────────────────────────────

    @Test
    @WithMockCustomUser
    void saveTargets_retourne200() throws Exception {
        SaveTargetsRequest request = new SaveTargetsRequest(
                Map.of("BOURSE", 50000.0),
                Map.of(),
                Map.of("BOURSE", List.of(
                        new TargetBreakdownInput(BreakdownDimension.SECTOR, "Technology", BigDecimal.valueOf(30))
                )));
        when(patrimoineTargetService.saveTargets(any(), any()))
                .thenReturn(new PatrimoineTargetsDto(
                        Map.of("BOURSE", 50000.0),
                        Map.of(),
                        Map.of("BOURSE", List.of(
                                new TargetBreakdownDto(BreakdownDimension.SECTOR, "Technology", BigDecimal.valueOf(30))))));

        mockMvc.perform(put("/api/patrimoine/targets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.targets.BOURSE").value(50000.0));

        verify(patrimoineTargetService).saveTargets(any(), any());
    }

    @Test
    void saveTargets_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(put("/api/patrimoine/targets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockCustomUser
    void saveTargets_montantNegatif_retourne400() throws Exception {
        SaveTargetsRequest request = new SaveTargetsRequest(
                Map.of("BOURSE", -100.0), Map.of(), Map.of());

        mockMvc.perform(put("/api/patrimoine/targets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockCustomUser
    void saveTargets_montantTropEleve_retourne400() throws Exception {
        SaveTargetsRequest request = new SaveTargetsRequest(
                Map.of("BOURSE", 1_000_000_001.0), Map.of(), Map.of());

        mockMvc.perform(put("/api/patrimoine/targets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockCustomUser
    void saveTargets_pourcentageHorsBornes_retourne400() throws Exception {
        SaveTargetsRequest request = new SaveTargetsRequest(
                Map.of("BOURSE", 50000.0),
                Map.of(),
                Map.of("BOURSE", List.of(
                        new TargetBreakdownInput(BreakdownDimension.SECTOR, "Technology", BigDecimal.valueOf(150))
                )));

        mockMvc.perform(put("/api/patrimoine/targets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockCustomUser
    void saveTargets_cleVide_retourne400() throws Exception {
        SaveTargetsRequest request = new SaveTargetsRequest(
                Map.of("BOURSE", 50000.0),
                Map.of(),
                Map.of("BOURSE", List.of(
                        new TargetBreakdownInput(BreakdownDimension.SECTOR, "", BigDecimal.valueOf(30))
                )));

        mockMvc.perform(put("/api/patrimoine/targets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockCustomUser
    void saveTargets_plusDe20Categories_retourne400() throws Exception {
        Map<String, Double> trop = new HashMap<>();
        for (int i = 0; i < 21; i++) trop.put("CAT_" + i, 1000.0);
        SaveTargetsRequest request = new SaveTargetsRequest(trop, Map.of(), Map.of());

        mockMvc.perform(put("/api/patrimoine/targets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}
