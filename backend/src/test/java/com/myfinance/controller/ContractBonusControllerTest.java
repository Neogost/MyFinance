package com.myfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.domain.BonusTypeEnum;
import com.myfinance.dto.ContractBonusDto;
import com.myfinance.dto.CreateContractBonusRequest;
import com.myfinance.dto.UpdateContractBonusRequest;
import com.myfinance.service.ContractBonusService;
import com.myfinance.support.WithMockCustomUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ContractBonusController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class ContractBonusControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean ContractBonusService contractBonusService;

    ContractBonusDto bonusAnnuelDto;
    ContractBonusDto bonusExceptionnelDto;
    ContractBonusDto bonusMensuelDto;

    @BeforeEach
    void setUp() {
        bonusAnnuelDto = new ContractBonusDto(10L, "13ème mois", 3750f,
                BonusTypeEnum.ANNUELLE, null, 12, null, null);
        bonusExceptionnelDto = new ContractBonusDto(11L, "Prime Macron", 1000f,
                BonusTypeEnum.EXCEPTIONNELLE, LocalDate.of(2025, 6, 1), null, null, null);
        bonusMensuelDto = new ContractBonusDto(12L, "Prime transport", 50f,
                BonusTypeEnum.MENSUELLE, null, null, LocalDate.of(2024, 1, 1), null);
    }

    // ── GET /api/salary-contracts/{contractId}/bonuses ────────

    @Test
    @WithMockCustomUser
    void findAll_retourne200AvecLaListe() throws Exception {
        when(contractBonusService.findAllByContract(eq(1L), any()))
                .thenReturn(List.of(bonusAnnuelDto, bonusExceptionnelDto, bonusMensuelDto));

        mockMvc.perform(get("/api/salary-contracts/1/bonuses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].type").value("ANNUELLE"))
                .andExpect(jsonPath("$[0].paymentMonth").value(12))
                .andExpect(jsonPath("$[1].type").value("EXCEPTIONNELLE"))
                .andExpect(jsonPath("$[1].paymentDate").value("2025-06-01"))
                .andExpect(jsonPath("$[2].type").value("MENSUELLE"))
                .andExpect(jsonPath("$[2].startDate").value("2024-01-01"))
                .andExpect(jsonPath("$[2].endDate").isEmpty());
    }

    @Test
    void findAll_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/salary-contracts/1/bonuses"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockCustomUser
    void findAll_retourne403_siContratAppartientAAutrui() throws Exception {
        when(contractBonusService.findAllByContract(eq(1L), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));

        mockMvc.perform(get("/api/salary-contracts/1/bonuses"))
                .andExpect(status().isForbidden());
    }

    // ── POST /api/salary-contracts/{contractId}/bonuses ───────

    @Test
    @WithMockCustomUser
    void create_primeAnnuelle_retourne201() throws Exception {
        CreateContractBonusRequest request = new CreateContractBonusRequest(
                "13ème mois", 3750f, BonusTypeEnum.ANNUELLE, null, 12, null, null);

        when(contractBonusService.create(eq(1L), any(), any())).thenReturn(bonusAnnuelDto);

        mockMvc.perform(post("/api/salary-contracts/1/bonuses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.label").value("13ème mois"))
                .andExpect(jsonPath("$.type").value("ANNUELLE"))
                .andExpect(jsonPath("$.paymentMonth").value(12));
    }

    @Test
    @WithMockCustomUser
    void create_primeExceptionnelle_retourne201() throws Exception {
        CreateContractBonusRequest request = new CreateContractBonusRequest(
                "Prime Macron", 1000f, BonusTypeEnum.EXCEPTIONNELLE,
                LocalDate.of(2025, 6, 1), null, null, null);

        when(contractBonusService.create(eq(1L), any(), any())).thenReturn(bonusExceptionnelDto);

        mockMvc.perform(post("/api/salary-contracts/1/bonuses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("EXCEPTIONNELLE"))
                .andExpect(jsonPath("$.paymentDate").value("2025-06-01"));
    }

    @Test
    @WithMockCustomUser
    void create_primeMensuelle_retourne201() throws Exception {
        CreateContractBonusRequest request = new CreateContractBonusRequest(
                "Prime transport", 50f, BonusTypeEnum.MENSUELLE,
                null, null, LocalDate.of(2024, 1, 1), null);

        when(contractBonusService.create(eq(1L), any(), any())).thenReturn(bonusMensuelDto);

        mockMvc.perform(post("/api/salary-contracts/1/bonuses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("MENSUELLE"))
                .andExpect(jsonPath("$.startDate").value("2024-01-01"))
                .andExpect(jsonPath("$.endDate").isEmpty());
    }

    @Test
    @WithMockCustomUser
    void create_corpsInvalide_retourne400() throws Exception {
        // grossAmount au-delà du plafond Bean Validation (-1M..+1M)
        CreateContractBonusRequest request = new CreateContractBonusRequest(
                "Prime", 2_000_000f, BonusTypeEnum.ANNUELLE, null, 6, null, null);

        mockMvc.perform(post("/api/salary-contracts/1/bonuses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockCustomUser
    void create_retourne400_siValidationMetierEchoue() throws Exception {
        CreateContractBonusRequest request = new CreateContractBonusRequest(
                "Prime", 500f, BonusTypeEnum.ANNUELLE, null, null, null, null);

        when(contractBonusService.create(eq(1L), any(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST));

        mockMvc.perform(post("/api/salary-contracts/1/bonuses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    // ── PUT /api/salary-contracts/{contractId}/bonuses/{id} ───

    @Test
    @WithMockCustomUser
    void update_avecCorpsValide_retourne200() throws Exception {
        UpdateContractBonusRequest request = new UpdateContractBonusRequest(
                "13ème mois modifié", 4000f, BonusTypeEnum.ANNUELLE, null, 11, null, null);
        ContractBonusDto updated = new ContractBonusDto(
                10L, "13ème mois modifié", 4000f, BonusTypeEnum.ANNUELLE, null, 11, null, null);

        when(contractBonusService.update(eq(1L), eq(10L), any(), any())).thenReturn(updated);

        mockMvc.perform(put("/api/salary-contracts/1/bonuses/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.label").value("13ème mois modifié"))
                .andExpect(jsonPath("$.grossAmount").value(4000.0));
    }

    @Test
    @WithMockCustomUser
    void update_retourne404_siPrimeIntrouvable() throws Exception {
        UpdateContractBonusRequest request = new UpdateContractBonusRequest(
                "Prime", 500f, BonusTypeEnum.ANNUELLE, null, 6, null, null);

        when(contractBonusService.update(eq(1L), eq(99L), any(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));

        mockMvc.perform(put("/api/salary-contracts/1/bonuses/99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    // ── DELETE /api/salary-contracts/{contractId}/bonuses/{id} ─

    @Test
    @WithMockCustomUser
    void delete_retourne204() throws Exception {
        mockMvc.perform(delete("/api/salary-contracts/1/bonuses/10"))
                .andExpect(status().isNoContent());

        verify(contractBonusService).delete(eq(1L), eq(10L), any());
    }

    @Test
    @WithMockCustomUser
    void delete_retourne404_siPrimeIntrouvable() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.NOT_FOUND))
                .when(contractBonusService).delete(eq(1L), eq(99L), any());

        mockMvc.perform(delete("/api/salary-contracts/1/bonuses/99"))
                .andExpect(status().isNotFound());
    }
}
