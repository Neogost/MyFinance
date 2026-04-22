package com.myfinance.controller;

import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.dto.*;
import com.myfinance.service.FamilyGroupService;
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

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminFamilyGroupController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class AdminFamilyGroupControllerTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean FamilyGroupService familyGroupService;

    FamilyGroupDto groupDto;

    @BeforeEach
    void setUp() {
        FamilyMemberDto ownerDto = new FamilyMemberDto(1L, "Kévin", "D", "kevin");
        groupDto = new FamilyGroupDto(1L, "Famille Test", ownerDto,
                List.of(ownerDto), List.of(), LocalDateTime.now());
    }

    // ── GET / ──────────────────────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void findAll_retourne200() throws Exception {
        when(familyGroupService.findAll()).thenReturn(List.of(groupDto));

        mockMvc.perform(get("/api/admin/family-groups"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    @WithMockUser(roles = "USER")
    void findAll_retourne403_siPasAdmin() throws Exception {
        mockMvc.perform(get("/api/admin/family-groups"))
                .andExpect(status().isForbidden());
    }

    @Test
    void findAll_retourne401_sansAuthentification() throws Exception {
        mockMvc.perform(get("/api/admin/family-groups"))
                .andExpect(status().isUnauthorized());
    }

    // ── GET /{id} ──────────────────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void findById_retourne200() throws Exception {
        when(familyGroupService.findById(1L)).thenReturn(groupDto);

        mockMvc.perform(get("/api/admin/family-groups/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Famille Test"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void findById_retourne404_siInconnu() throws Exception {
        when(familyGroupService.findById(99L))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));

        mockMvc.perform(get("/api/admin/family-groups/99"))
                .andExpect(status().isNotFound());
    }

    // ── DELETE /{id} ───────────────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void dissolve_retourne204() throws Exception {
        mockMvc.perform(delete("/api/admin/family-groups/1"))
                .andExpect(status().isNoContent());

        verify(familyGroupService).adminDissolve(1L);
    }

    // ── DELETE /{id}/members/{memberId} ───────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void removeMember_retourne204() throws Exception {
        mockMvc.perform(delete("/api/admin/family-groups/1/members/2"))
                .andExpect(status().isNoContent());

        verify(familyGroupService).adminRemoveMember(1L, 2L);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void removeMember_leve400_siPasMembre() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST))
                .when(familyGroupService).adminRemoveMember(1L, 99L);

        mockMvc.perform(delete("/api/admin/family-groups/1/members/99"))
                .andExpect(status().isBadRequest());
    }
}
