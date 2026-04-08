package com.myfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.dto.CreateMonthlyPaySlipRequest;
import com.myfinance.dto.MonthlyPaySlipDto;
import com.myfinance.dto.UpdateMonthlyPaySlipRequest;
import com.myfinance.service.MonthlyPaySlipService;
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

@WebMvcTest(MonthlyPaySlipController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class MonthlyPaySlipControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean MonthlyPaySlipService monthlyPaySlipService;

    MonthlyPaySlipDto slipDto;

    @BeforeEach
    void setUp() {
        slipDto = new MonthlyPaySlipDto(
                10L, LocalDate.of(2025, 3, 1), 3900f, 3150f, 2820f, 330f);
    }

    // ── GET /api/salary-contracts/{contractId}/pay-slips ──────

    @Test
    @WithMockCustomUser
    void findAll_retourne200AvecLaListe() throws Exception {
        when(monthlyPaySlipService.findAllByContract(eq(1L), any())).thenReturn(List.of(slipDto));

        mockMvc.perform(get("/api/salary-contracts/1/pay-slips"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(10))
                .andExpect(jsonPath("$[0].grossSalary").value(3900.0));
    }

    @Test
    void findAll_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/salary-contracts/1/pay-slips"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockCustomUser
    void findAll_retourne403_siContratAppartientAAutrui() throws Exception {
        when(monthlyPaySlipService.findAllByContract(eq(1L), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));

        mockMvc.perform(get("/api/salary-contracts/1/pay-slips"))
                .andExpect(status().isForbidden());
    }

    // ── POST /api/salary-contracts/{contractId}/pay-slips ─────

    @Test
    @WithMockCustomUser
    void create_avecCorpsValide_retourne201() throws Exception {
        CreateMonthlyPaySlipRequest request = new CreateMonthlyPaySlipRequest(
                LocalDate.of(2025, 3, 1), 3900f, 3150f, 2820f, 330f);

        when(monthlyPaySlipService.create(eq(1L), any(), any())).thenReturn(slipDto);

        mockMvc.perform(post("/api/salary-contracts/1/pay-slips")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.period").value("2025-03-01"))
                .andExpect(jsonPath("$.netSalary").value(2820.0));
    }

    @Test
    @WithMockCustomUser
    void create_avecCorpsInvalide_retourne400() throws Exception {
        // grossSalary négatif → violation @Positive
        CreateMonthlyPaySlipRequest request = new CreateMonthlyPaySlipRequest(
                LocalDate.of(2025, 3, 1), -100f, 3150f, 2820f, 330f);

        mockMvc.perform(post("/api/salary-contracts/1/pay-slips")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockCustomUser
    void create_retourne409_siPeriodeDejaPresente() throws Exception {
        CreateMonthlyPaySlipRequest request = new CreateMonthlyPaySlipRequest(
                LocalDate.of(2025, 3, 1), 3900f, 3150f, 2820f, 330f);

        when(monthlyPaySlipService.create(eq(1L), any(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT));

        mockMvc.perform(post("/api/salary-contracts/1/pay-slips")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict());
    }

    // ── PUT /api/salary-contracts/{contractId}/pay-slips/{id} ─

    @Test
    @WithMockCustomUser
    void update_avecCorpsValide_retourne200() throws Exception {
        UpdateMonthlyPaySlipRequest request = new UpdateMonthlyPaySlipRequest(
                LocalDate.of(2025, 3, 1), 4100f, 3300f, 2950f, 350f);
        MonthlyPaySlipDto updated = new MonthlyPaySlipDto(
                10L, LocalDate.of(2025, 3, 1), 4100f, 3300f, 2950f, 350f);

        when(monthlyPaySlipService.update(eq(1L), eq(10L), any(), any())).thenReturn(updated);

        mockMvc.perform(put("/api/salary-contracts/1/pay-slips/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.grossSalary").value(4100.0));
    }

    @Test
    @WithMockCustomUser
    void update_retourne404_siBulletinIntrouvable() throws Exception {
        UpdateMonthlyPaySlipRequest request = new UpdateMonthlyPaySlipRequest(
                LocalDate.of(2025, 3, 1), 3900f, 3150f, 2820f, 330f);

        when(monthlyPaySlipService.update(eq(1L), eq(99L), any(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));

        mockMvc.perform(put("/api/salary-contracts/1/pay-slips/99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    // ── DELETE /api/salary-contracts/{contractId}/pay-slips/{id}

    @Test
    @WithMockCustomUser
    void delete_retourne204() throws Exception {
        mockMvc.perform(delete("/api/salary-contracts/1/pay-slips/10"))
                .andExpect(status().isNoContent());

        verify(monthlyPaySlipService).delete(eq(1L), eq(10L), any());
    }

    @Test
    @WithMockCustomUser
    void delete_retourne404_siBulletinIntrouvable() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.NOT_FOUND))
                .when(monthlyPaySlipService).delete(eq(1L), eq(99L), any());

        mockMvc.perform(delete("/api/salary-contracts/1/pay-slips/99"))
                .andExpect(status().isNotFound());
    }
}
