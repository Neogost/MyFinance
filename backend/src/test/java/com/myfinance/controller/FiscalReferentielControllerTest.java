package com.myfinance.controller;

import com.myfinance.config.BaremeKilometriqueProperties;
import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(FiscalReferentielController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class FiscalReferentielControllerTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean BaremeKilometriqueProperties baremeProps;

    @BeforeEach
    void setUp() {
        BaremeKilometriqueProperties.Tranche t1 = new BaremeKilometriqueProperties.Tranche();
        t1.setKmMax(3000); t1.setTaux(0.529); t1.setForfait(0.0);
        BaremeKilometriqueProperties.Tranche t2 = new BaremeKilometriqueProperties.Tranche();
        t2.setKmMax(6000); t2.setTaux(0.316); t2.setForfait(643.0);
        BaremeKilometriqueProperties.Tranche t3 = new BaremeKilometriqueProperties.Tranche();
        t3.setKmMax(null); t3.setTaux(0.423); t3.setForfait(0.0);

        BaremeKilometriqueProperties.VoitureBareme voiture = new BaremeKilometriqueProperties.VoitureBareme();
        voiture.setCvMax(3); voiture.setLabel("3 CV et moins");
        voiture.setTranches(List.of(t1, t2, t3));

        when(baremeProps.getAnnee()).thenReturn(2024);
        when(baremeProps.getAvertissement()).thenReturn("Barème 2024.");
        when(baremeProps.getMultiplicateurElectrique()).thenReturn(1.20);
        when(baremeProps.getVoitures()).thenReturn(List.of(voiture));
    }

    // ── GET /api/fiscal/bareme-kilometrique ────────────────────

    @Test
    @WithMockUser
    void getBareme_avecAuthentification_retourne200AvecLeBareme() throws Exception {
        mockMvc.perform(get("/api/fiscal/bareme-kilometrique"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.annee").value(2024))
                .andExpect(jsonPath("$.multiplicateurElectrique").value(1.20))
                .andExpect(jsonPath("$.avertissement").isString())
                .andExpect(jsonPath("$.voitures").isArray())
                .andExpect(jsonPath("$.voitures[0].cvMax").value(3))
                .andExpect(jsonPath("$.voitures[0].tranches").isArray())
                .andExpect(jsonPath("$.voitures[0].tranches[0].taux").value(0.529));
    }

    @Test
    void getBareme_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/fiscal/bareme-kilometrique"))
                .andExpect(status().isUnauthorized());
    }
}
