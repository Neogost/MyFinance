package com.myfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.domain.InfoBannerAudience;
import com.myfinance.domain.InfoBannerStatus;
import com.myfinance.domain.InfoBannerType;
import com.myfinance.dto.CreateInfoBannerRequest;
import com.myfinance.dto.InfoBannerAdminDto;
import com.myfinance.dto.UpdateInfoBannerRequest;
import com.myfinance.service.InfoBannerService;
import com.myfinance.support.WithMockCustomUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
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
import java.util.stream.Stream;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminInfoBannerController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class AdminInfoBannerControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean InfoBannerService infoBannerService;

    static final LocalDateTime START = LocalDateTime.of(2026, 5, 14, 8, 0);
    static final LocalDateTime END   = LocalDateTime.of(2026, 5, 14, 22, 0);

    InfoBannerAdminDto adminDto;

    @BeforeEach
    void setUp() {
        adminDto = new InfoBannerAdminDto(
                1L, "Maintenance", "Fenêtre de maintenance ce soir.", InfoBannerType.MAINTENANCE,
                InfoBannerAudience.ALL, START, END, InfoBannerStatus.ACTIVE,
                START, START, "kevin"
        );
    }

    // ── GET /api/admin/info-banners ────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void findAll_asAdmin_retourne200() throws Exception {
        when(infoBannerService.findAll()).thenReturn(List.of(adminDto));

        mockMvc.perform(get("/api/admin/info-banners"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].type").value("MAINTENANCE"))
                .andExpect(jsonPath("$[0].status").value("ACTIVE"))
                .andExpect(jsonPath("$[0].createdByLogin").value("kevin"));
    }

    @Test
    void findAll_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/admin/info-banners"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "USER")
    void findAll_avecRoleUser_retourne403() throws Exception {
        mockMvc.perform(get("/api/admin/info-banners"))
                .andExpect(status().isForbidden());
    }

    // ── GET /api/admin/info-banners/{id} ───────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void findById_asAdmin_retourne200() throws Exception {
        when(infoBannerService.findById(1L)).thenReturn(adminDto);

        mockMvc.perform(get("/api/admin/info-banners/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void findById_introuvable_retourne404() throws Exception {
        when(infoBannerService.findById(99L))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));

        mockMvc.perform(get("/api/admin/info-banners/99"))
                .andExpect(status().isNotFound());
    }

    // ── POST /api/admin/info-banners ───────────────────────────────

    @Test
    @WithMockCustomUser(role = "ADMIN")
    void create_avecCorpsValide_retourne201() throws Exception {
        CreateInfoBannerRequest request = new CreateInfoBannerRequest(
                "Maintenance", "Fenêtre de maintenance ce soir.",
                InfoBannerType.MAINTENANCE, InfoBannerAudience.ALL, START, END);

        when(infoBannerService.create(any(), any())).thenReturn(adminDto);

        mockMvc.perform(post("/api/admin/info-banners")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("MAINTENANCE"));
    }

    @ParameterizedTest(name = "create_leve400 — {0}")
    @MethodSource("requêtesInvalides")
    @WithMockCustomUser(role = "ADMIN")
    void create_avecCorpsInvalide_retourne400(String desc, CreateInfoBannerRequest invalid) throws Exception {
        mockMvc.perform(post("/api/admin/info-banners")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest());
    }

    static Stream<Arguments> requêtesInvalides() {
        return Stream.of(
                Arguments.of("message vide", new CreateInfoBannerRequest(
                        "Titre", "", InfoBannerType.INFO, InfoBannerAudience.ALL, START, END)),
                Arguments.of("type null", new CreateInfoBannerRequest(
                        "Titre", "Message", null, InfoBannerAudience.ALL, START, END)),
                Arguments.of("audience null", new CreateInfoBannerRequest(
                        "Titre", "Message", InfoBannerType.INFO, null, START, END)),
                Arguments.of("startAt null", new CreateInfoBannerRequest(
                        "Titre", "Message", InfoBannerType.INFO, InfoBannerAudience.ALL, null, END))
        );
    }

    // ── PUT /api/admin/info-banners/{id} ───────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void update_asAdmin_retourne200() throws Exception {
        UpdateInfoBannerRequest request = new UpdateInfoBannerRequest(
                "Modifié", "Nouveau message", InfoBannerType.ALERT, InfoBannerAudience.ALL, START, null);

        when(infoBannerService.update(eq(1L), any())).thenReturn(adminDto);

        mockMvc.perform(put("/api/admin/info-banners/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void update_introuvable_retourne404() throws Exception {
        UpdateInfoBannerRequest request = new UpdateInfoBannerRequest(
                null, "Msg", InfoBannerType.INFO, InfoBannerAudience.ALL, START, null);

        when(infoBannerService.update(eq(99L), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));

        mockMvc.perform(put("/api/admin/info-banners/99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    // ── DELETE /api/admin/info-banners/{id} ────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void delete_asAdmin_retourne204() throws Exception {
        mockMvc.perform(delete("/api/admin/info-banners/1"))
                .andExpect(status().isNoContent());

        verify(infoBannerService).delete(1L);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void delete_introuvable_retourne404() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.NOT_FOUND))
                .when(infoBannerService).delete(99L);

        mockMvc.perform(delete("/api/admin/info-banners/99"))
                .andExpect(status().isNotFound());
    }
}
