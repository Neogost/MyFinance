package com.myfinance.controller;

import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.dto.TaxSimulationDto;
import com.myfinance.service.TaxSimulatorService;
import com.myfinance.service.UserService;
import com.myfinance.support.WithMockCustomUser;
import com.myfinance.domain.User;
import com.myfinance.domain.RoleEnum;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(TaxSimulatorController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class TaxSimulatorControllerTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean TaxSimulatorService taxSimulatorService;
    @MockitoBean UserService userService;

    TaxSimulationDto simulationDto;

    @BeforeEach
    void setUp() {
        simulationDto = new TaxSimulationDto(
                2025, TaxSimulatorService.SOURCE_PROJECTION,
                30000f, 0f, 0f, 0f,
                30000f, 3000f, "FORFAITAIRE_10_POURCENT",
                27000f, 1.0f, false, 1700f, 0f, 1700f, 1700f, 5.67f, null);

        // Le controller recharge l'utilisateur depuis la DB pour ne pas utiliser l'objet de session Spring Security.
        // On mocke ici pour que les stubs any(User.class) matchent un vrai objet (pas null).
        User mockUser = User.builder().id(1L).login("jean.dupont").role(RoleEnum.USER).build();
        when(userService.findEntityById(1L)).thenReturn(mockUser);
    }

    // ── GET /api/tax-simulator ─────────────────────────────────

    @Test
    @WithMockCustomUser
    void simulate_retourne200AvecLeResultat() throws Exception {
        when(taxSimulatorService.simulate(any(User.class), anyInt(), anyString(), isNull()))
                .thenReturn(simulationDto);

        mockMvc.perform(get("/api/tax-simulator"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.year").value(2025))
                .andExpect(jsonPath("$.salaryIncomeSource").value("PROJECTION_CONTRAT"))
                .andExpect(jsonPath("$.salaryIncome").value(30000.0))
                .andExpect(jsonPath("$.totalEstimatedTax").value(1700.0))
                .andExpect(jsonPath("$.effectiveTaxRate").value(5.67));
    }

    @Test
    @WithMockCustomUser
    void simulate_avecParametres_passeLesParametresAuService() throws Exception {
        when(taxSimulatorService.simulate(any(User.class), eq(2024), eq(TaxSimulatorService.SOURCE_BULLETINS), anyList()))
                .thenReturn(simulationDto);

        mockMvc.perform(get("/api/tax-simulator")
                        .param("year", "2024")
                        .param("salarySource", TaxSimulatorService.SOURCE_BULLETINS)
                        .param("includedIncomes", "1", "2"))
                .andExpect(status().isOk());
    }

    @Test
    void simulate_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/tax-simulator"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockCustomUser
    void simulate_leve400_siDonneesInsuffisantes() throws Exception {
        when(taxSimulatorService.simulate(any(User.class), anyInt(), anyString(), isNull()))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Aucun contrat salarial actif."));

        mockMvc.perform(get("/api/tax-simulator"))
                .andExpect(status().isBadRequest());
    }

    // ── GET /api/tax-simulator/users/{userId} ──────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void simulateForUser_asAdmin_retourne200() throws Exception {
        User targetUser = User.builder().id(2L).login("marie.martin").role(RoleEnum.USER).build();

        when(userService.findEntityById(2L)).thenReturn(targetUser);
        when(taxSimulatorService.simulate(eq(targetUser), anyInt(), anyString(), isNull()))
                .thenReturn(simulationDto);

        mockMvc.perform(get("/api/tax-simulator/users/2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.year").value(2025));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void simulateForUser_retourne404_siUtilisateurIntrouvable() throws Exception {
        when(userService.findEntityById(99L))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));

        mockMvc.perform(get("/api/tax-simulator/users/99"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(roles = "USER")
    void simulateForUser_avecRoleUser_retourne403() throws Exception {
        mockMvc.perform(get("/api/tax-simulator/users/2"))
                .andExpect(status().isForbidden());
    }

    @Test
    void simulateForUser_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/tax-simulator/users/2"))
                .andExpect(status().isUnauthorized());
    }
}
