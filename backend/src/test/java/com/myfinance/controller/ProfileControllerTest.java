package com.myfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.SafetyNetMode;
import com.myfinance.dto.UpdateFiscalProfileRequest;
import com.myfinance.dto.UpdatePersonalInfoRequest;
import com.myfinance.dto.UpdateSafetyNetRequest;
import com.myfinance.dto.UserDto;
import com.myfinance.service.ProfileDataService;
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
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ProfileController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class ProfileControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean ProfileService profileService;
    @MockitoBean ProfileDataService profileDataService;

    private UserDto dto(SafetyNetMode mode, Double months, Double amount) {
        return new UserDto(1L, "jean.dupont", "Jean", "Dupont", null, RoleEnum.USER,
                null, null, null, null, mode, months, amount, null, null, null,
                null, null, null, null, null, null, null, null, null, null, null, null, null, false);
    }

    private UserDto dtoPersonal(String birthPlace, String birthPostalCode, String jobTitle) {
        return new UserDto(1L, "jean.dupont", "Jean", "Dupont", null, RoleEnum.USER,
                null, null, null, null, null, null, null, birthPlace, birthPostalCode, jobTitle,
                null, null, null, null, null, null, null, null, null, null, null, null, null, false);
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

    // ── PUT /api/profile/fiscal ────────────────────────────────

    @Test
    @WithMockCustomUser
    void updateFiscalProfile_fraisReels_retourne200() throws Exception {
        UpdateFiscalProfileRequest req = new UpdateFiscalProfileRequest(
                1.0f, false, null,
                null, null, null, null, null, null, null, null, null, null, null, null, null);
        UserDto dto = new UserDto(1L, "jean.dupont", "Jean", "Dupont", null, RoleEnum.USER,
                1.0f, false, 1400f, null, null, null, null, null, null, null,
                null, null, null, 600f, null, null, null, 300f, null, null, null, null, null, false);
        when(profileService.updateFiscalProfile(any(), any())).thenReturn(dto);

        mockMvc.perform(put("/api/profile/fiscal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.useFlatRateDeduction").value(false))
                .andExpect(jsonPath("$.customProfessionalDeduction").value(1400.0));
    }

    @Test
    @WithMockCustomUser
    void updateFiscalProfile_forfaitaire_retourne200() throws Exception {
        UpdateFiscalProfileRequest req = new UpdateFiscalProfileRequest(
                2.0f, true, null,
                null, null, null, null, null, null, null, null, null, null, null, null, null);
        UserDto dto = new UserDto(1L, "jean.dupont", "Jean", "Dupont", null, RoleEnum.USER,
                2.0f, true, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, null, null, null, null, null, false);
        when(profileService.updateFiscalProfile(any(), any())).thenReturn(dto);

        mockMvc.perform(put("/api/profile/fiscal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.useFlatRateDeduction").value(true))
                .andExpect(jsonPath("$.customProfessionalDeduction").doesNotExist());
    }

    @Test
    void updateFiscalProfile_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(put("/api/profile/fiscal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    // ── Validation Bean — H4 (champs trop longs / hors bornes) ─

    @Test
    @WithMockCustomUser
    void updatePersonalInfo_jobTitleTropLong_retourne400() throws Exception {
        UpdatePersonalInfoRequest req = new UpdatePersonalInfoRequest(
                "Jean", "Dupont", null, "Paris", "75001", "x".repeat(201));

        mockMvc.perform(put("/api/profile/personal-info")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockCustomUser
    void updatePersonalInfo_birthDateFuture_retourne400() throws Exception {
        UpdatePersonalInfoRequest req = new UpdatePersonalInfoRequest(
                "Jean", "Dupont", java.time.LocalDate.now().plusDays(1), "Paris", "75001", "Ingénieur");

        mockMvc.perform(put("/api/profile/personal-info")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockCustomUser
    void updateFiscalProfile_fiscalPartsNegatif_retourne400() throws Exception {
        UpdateFiscalProfileRequest req = new UpdateFiscalProfileRequest(
                -1.0f, true, null,
                null, null, null, null, null, null, null, null, null, null, null, null, null);

        mockMvc.perform(put("/api/profile/fiscal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockCustomUser
    void updateFiscalProfile_realExpensesMealsNegatif_retourne400() throws Exception {
        UpdateFiscalProfileRequest req = new UpdateFiscalProfileRequest(
                1.0f, false, null,
                null, null, null, null, -100f, null, null, null, null, null, null, null, null);

        mockMvc.perform(put("/api/profile/fiscal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockCustomUser
    void updateSafetyNet_montantNegatif_retourne400() throws Exception {
        UpdateSafetyNetRequest req = new UpdateSafetyNetRequest(SafetyNetMode.FIXED_AMOUNT, null, -1.0);

        mockMvc.perform(put("/api/profile/safety-net")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    // ── DELETE /api/profile/data ───────────────────────────────

    @Test
    @WithMockCustomUser
    void deleteAllData_retourne204() throws Exception {
        doNothing().when(profileDataService).deleteAllData(any());

        mockMvc.perform(delete("/api/profile/data"))
                .andExpect(status().isNoContent());
    }

    @Test
    void deleteAllData_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(delete("/api/profile/data"))
                .andExpect(status().isUnauthorized());
    }

    // ── DELETE /api/profile/data-only ─────────────────────────

    @Test
    @WithMockCustomUser
    void deleteDataOnly_retourne204() throws Exception {
        doNothing().when(profileDataService).deleteDataOnly(any());

        mockMvc.perform(delete("/api/profile/data-only"))
                .andExpect(status().isNoContent());
    }

    @Test
    void deleteDataOnly_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(delete("/api/profile/data-only"))
                .andExpect(status().isUnauthorized());
    }
}
