package com.myfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.domain.RoleEnum;
import com.myfinance.dto.CreateUserRequest;
import com.myfinance.dto.UpdateUserRequest;
import com.myfinance.dto.UserDto;
import com.myfinance.service.UserService;
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

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class UserControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean UserService userService;

    UserDto userDto;

    @BeforeEach
    void setUp() {
        userDto = new UserDto(1L, "jean.dupont", "Jean", "Dupont", null, RoleEnum.USER, 1.0f, true, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, null, null, null, null, null, false);
    }

    // ── GET /api/users ─────────────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void findAll_asAdmin_retourne200AvecLaListe() throws Exception {
        when(userService.findAll()).thenReturn(List.of(userDto));

        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].login").value("jean.dupont"))
                .andExpect(jsonPath("$[0].role").value("USER"));
    }

    @Test
    void findAll_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "USER")
    void findAll_avecRoleUser_retourne403() throws Exception {
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isForbidden());
    }

    // ── GET /api/users/{id} ────────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void findById_asAdmin_retourne200() throws Exception {
        when(userService.findById(1L)).thenReturn(userDto);

        mockMvc.perform(get("/api/users/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.login").value("jean.dupont"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void findById_introuvable_retourne404() throws Exception {
        when(userService.findById(99L))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));

        mockMvc.perform(get("/api/users/99"))
                .andExpect(status().isNotFound());
    }

    // ── POST /api/users ────────────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void create_avecCorpsValide_retourne201() throws Exception {
        CreateUserRequest request = new CreateUserRequest(
                "Jean", "Dupont", null, "jean.dupont", "Secure123!Pass", RoleEnum.USER, null, null, null);

        when(userService.create(any(CreateUserRequest.class))).thenReturn(userDto);

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.login").value("jean.dupont"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void create_avecCorpsInvalide_retourne400() throws Exception {
        // firstName vide → violation de @NotBlank
        CreateUserRequest request = new CreateUserRequest(
                "", "Dupont", null, "jean.dupont", "password", RoleEnum.USER, null, null, null);

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void create_loginDejaUtilise_retourne409() throws Exception {
        CreateUserRequest request = new CreateUserRequest(
                "Jean", "Dupont", null, "jean.dupont", "Secure123!Pass", RoleEnum.USER, null, null, null);

        when(userService.create(any(CreateUserRequest.class)))
                .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT));

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict());
    }

    // ── PUT /api/users/{id} ────────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void update_avecCorpsValide_retourne200() throws Exception {
        UpdateUserRequest request = new UpdateUserRequest(
                "Marie", "Martin", null, "marie.martin", null, RoleEnum.USER, null, null, null);
        UserDto updated = new UserDto(1L, "marie.martin", "Marie", "Martin", null, RoleEnum.USER, null, null, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, null, null, null, null, null, false);

        when(userService.update(eq(1L), any(UpdateUserRequest.class))).thenReturn(updated);

        mockMvc.perform(put("/api/users/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.login").value("marie.martin"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void update_introuvable_retourne404() throws Exception {
        UpdateUserRequest request = new UpdateUserRequest(
                "Jean", "Dupont", null, "jean.dupont", null, RoleEnum.USER, null, null, null);

        when(userService.update(eq(99L), any(UpdateUserRequest.class)))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));

        mockMvc.perform(put("/api/users/99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    // ── DELETE /api/users/{id} ─────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void delete_utilisateurExistant_retourne204() throws Exception {
        mockMvc.perform(delete("/api/users/1"))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void delete_introuvable_retourne404() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.NOT_FOUND))
                .when(userService).delete(eq(99L), anyString());

        mockMvc.perform(delete("/api/users/99"))
                .andExpect(status().isNotFound());
    }
}
