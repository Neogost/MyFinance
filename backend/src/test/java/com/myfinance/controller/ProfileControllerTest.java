package com.myfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.SafetyNetMode;
import com.myfinance.dto.UpdatePersonalInfoRequest;
import com.myfinance.dto.UpdateSafetyNetRequest;
import com.myfinance.dto.UserDto;
import com.myfinance.service.ProfileService;
import com.myfinance.support.WithMockCustomUser;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ProfileController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class ProfileControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean ProfileService profileService;

    private UserDto dto(SafetyNetMode mode, Double months, Double amount) {
        return new UserDto(1L, "jean.dupont", "Jean", "Dupont", null, RoleEnum.USER,
                null, null, null, null, mode, months, amount, null, null, null,
                null, null, null, null, null, null, null, null, null, null, null, null, null);
    }

    private UserDto dtoPersonal(String birthPlace, String birthPostalCode, String jobTitle) {
        return new UserDto(1L, "jean.dupont", "Jean", "Dupont", null, RoleEnum.USER,
                null, null, null, null, null, null, null, birthPlace, birthPostalCode, jobTitle,
                null, null, null, null, null, null, null, null, null, null, null, null, null);
    }

    // ── PUT /api/profile/safety-net ────────────────────────────

    @Test
    @WithMockCustomUser
    void updateSafetyNet_monthsExpenses_retourne200() throws Exception {
        UpdateSafetyNetRequest req = new UpdateSafetyNetRequest(SafetyNetMode.MONTHS_EXPENSES, 4.0, null);
        when(profileService.updateSafetyNet(any(), any())).thenReturn(dto(SafetyNetMode.MONTHS_EXPENSES, 4.0, null));

        mockMvc.perform(put("/api/profile/safety-net")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.safetyNetMode").value("MONTHS_EXPENSES"))
                .andExpect(jsonPath("$.safetyNetMonths").value(4.0));
    }

    @Test
    @WithMockCustomUser
    void updateSafetyNet_fixedAmount_retourne200() throws Exception {
        UpdateSafetyNetRequest req = new UpdateSafetyNetRequest(SafetyNetMode.FIXED_AMOUNT, null, 15000.0);
        when(profileService.updateSafetyNet(any(), any())).thenReturn(dto(SafetyNetMode.FIXED_AMOUNT, null, 15000.0));

        mockMvc.perform(put("/api/profile/safety-net")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.safetyNetMode").value("FIXED_AMOUNT"))
                .andExpect(jsonPath("$.safetyNetAmount").value(15000.0));
    }

    @Test
    @WithMockCustomUser
    void updateSafetyNet_donneesInvalides_retourne400() throws Exception {
        when(profileService.updateSafetyNet(any(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "safetyNetMonths doit être > 0"));

        mockMvc.perform(put("/api/profile/safety-net")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new UpdateSafetyNetRequest(SafetyNetMode.MONTHS_EXPENSES, null, null))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateSafetyNet_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(put("/api/profile/safety-net")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    // ── PUT /api/profile/personal-info ─────────────────────────

    @Test
    @WithMockCustomUser
    void updatePersonalInfo_retourne200() throws Exception {
        UpdatePersonalInfoRequest req = new UpdatePersonalInfoRequest("Kévin", "Dupont", null, "Paris", "75001", "Ingénieur logiciel");
        when(profileService.updatePersonalInfo(any(), any()))
                .thenReturn(dtoPersonal("Paris", "75001", "Ingénieur logiciel"));

        mockMvc.perform(put("/api/profile/personal-info")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.birthPlace").value("Paris"))
                .andExpect(jsonPath("$.birthPostalCode").value("75001"))
                .andExpect(jsonPath("$.jobTitle").value("Ingénieur logiciel"));
    }

    @Test
    void updatePersonalInfo_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(put("/api/profile/personal-info")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }
}
