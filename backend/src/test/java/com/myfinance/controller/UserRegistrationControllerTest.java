package com.myfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.domain.RegistrationStatus;
import com.myfinance.dto.CreateRegistrationRequest;
import com.myfinance.dto.RegistrationRequestDto;
import com.myfinance.service.UserRegistrationService;
import com.myfinance.support.WithMockCustomUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserRegistrationController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class UserRegistrationControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean UserRegistrationService registrationService;

    RegistrationRequestDto pendingDto;
    RegistrationRequestDto approvedDto;

    @BeforeEach
    void setUp() {
        pendingDto = new RegistrationRequestDto(
                1L, "jean.dupont", "Jean", "Dupont",
                RegistrationStatus.PENDING, LocalDateTime.now(), null, null);

        approvedDto = new RegistrationRequestDto(
                1L, "jean.dupont", "Jean", "Dupont",
                RegistrationStatus.APPROVED, LocalDateTime.now(), LocalDateTime.now(), "admin");
    }

    // ── POST /api/auth/register ────────────────────────────────

    @Test
    void register_avecCorpsValide_retourne201() throws Exception {
        CreateRegistrationRequest request = new CreateRegistrationRequest(
                "jean.dupont", "Jean", "Dupont", "Password1");
        when(registrationService.create(any())).thenReturn(pendingDto);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.login").value("jean.dupont"))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void register_avecCorpsInvalide_retourne400() throws Exception {
        // password trop court (< 8 chars)
        CreateRegistrationRequest request = new CreateRegistrationRequest(
                "jean.dupont", "Jean", "Dupont", "abc");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void register_loginDejaUtilise_retourne409() throws Exception {
        CreateRegistrationRequest request = new CreateRegistrationRequest(
                "jean.dupont", "Jean", "Dupont", "Password1");
        when(registrationService.create(any()))
                .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict());
    }

    // ── GET /api/admin/registrations ──────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void findAll_retourne200AvecLaListe() throws Exception {
        when(registrationService.findAll(null)).thenReturn(List.of(pendingDto));

        mockMvc.perform(get("/api/admin/registrations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].login").value("jean.dupont"));
    }

    @Test
    void findAll_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/admin/registrations"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockCustomUser
    void findAll_avecRoleUser_retourne403() throws Exception {
        mockMvc.perform(get("/api/admin/registrations"))
                .andExpect(status().isForbidden());
    }

    // ── POST /api/admin/registrations/{id}/approve ────────────

    @Test
    @WithMockCustomUser(role = "ADMIN")
    void approve_retourne200AvecStatutApproved() throws Exception {
        when(registrationService.approve(eq(1L), any())).thenReturn(approvedDto);

        mockMvc.perform(post("/api/admin/registrations/1/approve"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.reviewedBy").value("admin"));
    }

    @Test
    @WithMockCustomUser(role = "ADMIN")
    void approve_demandeIntrouvable_retourne404() throws Exception {
        when(registrationService.approve(eq(99L), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));

        mockMvc.perform(post("/api/admin/registrations/99/approve"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockCustomUser(role = "ADMIN")
    void approve_dejaTraitee_retourne409() throws Exception {
        when(registrationService.approve(eq(1L), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT));

        mockMvc.perform(post("/api/admin/registrations/1/approve"))
                .andExpect(status().isConflict());
    }

    // ── POST /api/admin/registrations/{id}/reject ─────────────

    @Test
    @WithMockCustomUser(role = "ADMIN")
    void reject_retourne200AvecStatutRejected() throws Exception {
        RegistrationRequestDto rejectedDto = new RegistrationRequestDto(
                1L, "jean.dupont", "Jean", "Dupont",
                RegistrationStatus.REJECTED, LocalDateTime.now(), LocalDateTime.now(), "admin");
        when(registrationService.reject(eq(1L), any())).thenReturn(rejectedDto);

        mockMvc.perform(post("/api/admin/registrations/1/reject"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));
    }
}
