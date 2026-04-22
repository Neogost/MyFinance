package com.myfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.domain.*;
import com.myfinance.dto.*;
import com.myfinance.service.FamilyGroupService;
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

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(FamilyGroupController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class FamilyGroupControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean FamilyGroupService familyGroupService;

    FamilyGroupDto groupDto;
    FamilyGroupInvitationDto invitationDto;

    @BeforeEach
    void setUp() {
        FamilyMemberDto ownerDto = new FamilyMemberDto(1L, "Kévin", "D", "kevin");
        FamilyMemberDto memberDto = new FamilyMemberDto(2L, "Sarah", "M", "sarah");

        groupDto = new FamilyGroupDto(1L, "Famille Test", ownerDto,
                List.of(ownerDto, memberDto), List.of(), LocalDateTime.now());

        invitationDto = new FamilyGroupInvitationDto(
                5L, 1L, "Famille Test", "Kévin", "D",
                new FamilyMemberDto(3L, "Marc", "X", "marc"),
                InvitationStatus.PENDING, LocalDateTime.now(), null);
    }

    // ── GET /my ────────────────────────────────────────────────

    @Test
    @WithMockCustomUser
    void getMyGroup_retourne200_avecGroupe() throws Exception {
        when(familyGroupService.findMyGroup(any())).thenReturn(groupDto);

        mockMvc.perform(get("/api/family-groups/my"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Famille Test"))
                .andExpect(jsonPath("$.members.length()").value(2));
    }

    @Test
    @WithMockCustomUser
    void getMyGroup_retourne204_sansGroupe() throws Exception {
        when(familyGroupService.findMyGroup(any())).thenReturn(null);

        mockMvc.perform(get("/api/family-groups/my"))
                .andExpect(status().isNoContent());
    }

    @Test
    void getMyGroup_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/family-groups/my"))
                .andExpect(status().isUnauthorized());
    }

    // ── GET /my/members ────────────────────────────────────────

    @Test
    @WithMockCustomUser
    void getMyGroupMembers_retourne200() throws Exception {
        when(familyGroupService.findMyGroupMembers(any()))
                .thenReturn(List.of(new FamilyMemberDto(2L, "Sarah", "M", "sarah")));

        mockMvc.perform(get("/api/family-groups/my/members"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    @WithMockCustomUser
    void getMyGroupMembers_leve400_siPasDeGroupe() throws Exception {
        when(familyGroupService.findMyGroupMembers(any()))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST));

        mockMvc.perform(get("/api/family-groups/my/members"))
                .andExpect(status().isBadRequest());
    }

    // ── POST / ─────────────────────────────────────────────────

    @Test
    @WithMockCustomUser
    void create_retourne201() throws Exception {
        when(familyGroupService.create(any(), any())).thenReturn(groupDto);

        mockMvc.perform(post("/api/family-groups")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateFamilyGroupRequest("Famille Test"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    @WithMockCustomUser
    void create_avecNomVide_retourne400() throws Exception {
        mockMvc.perform(post("/api/family-groups")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateFamilyGroupRequest(""))))
                .andExpect(status().isBadRequest());
    }

    // ── PUT /my ────────────────────────────────────────────────

    @Test
    @WithMockCustomUser
    void rename_retourne200() throws Exception {
        when(familyGroupService.rename(any(), any())).thenReturn(groupDto);

        mockMvc.perform(put("/api/family-groups/my")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateFamilyGroupRequest("Nouveau"))))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockCustomUser
    void rename_leve403_siPasOwner() throws Exception {
        when(familyGroupService.rename(any(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));

        mockMvc.perform(put("/api/family-groups/my")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateFamilyGroupRequest("Nouveau"))))
                .andExpect(status().isForbidden());
    }

    // ── DELETE /my ─────────────────────────────────────────────

    @Test
    @WithMockCustomUser
    void dissolve_retourne204() throws Exception {
        mockMvc.perform(delete("/api/family-groups/my"))
                .andExpect(status().isNoContent());

        verify(familyGroupService).dissolve(any());
    }

    // ── DELETE /my/leave ───────────────────────────────────────

    @Test
    @WithMockCustomUser
    void leave_retourne204() throws Exception {
        mockMvc.perform(delete("/api/family-groups/my/leave"))
                .andExpect(status().isNoContent());

        verify(familyGroupService).leave(any());
    }

    // ── POST /my/invitations ───────────────────────────────────

    @Test
    @WithMockCustomUser
    void sendInvitation_retourne201() throws Exception {
        when(familyGroupService.sendInvitation(any(), any())).thenReturn(invitationDto);

        mockMvc.perform(post("/api/family-groups/my/invitations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new SendInvitationRequest("marc"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    @WithMockCustomUser
    void sendInvitation_avecLoginVide_retourne400() throws Exception {
        mockMvc.perform(post("/api/family-groups/my/invitations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new SendInvitationRequest(""))))
                .andExpect(status().isBadRequest());
    }

    // ── GET /invitations/pending ───────────────────────────────

    @Test
    @WithMockCustomUser
    void getPendingInvitations_retourne200() throws Exception {
        when(familyGroupService.findPendingInvitations(any())).thenReturn(List.of(invitationDto));

        mockMvc.perform(get("/api/family-groups/invitations/pending"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    // ── POST /invitations/{id}/accept ──────────────────────────

    @Test
    @WithMockCustomUser
    void acceptInvitation_retourne200() throws Exception {
        when(familyGroupService.acceptInvitation(eq(5L), any())).thenReturn(groupDto);

        mockMvc.perform(post("/api/family-groups/invitations/5/accept"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Famille Test"));
    }

    @Test
    @WithMockCustomUser
    void acceptInvitation_leve400_siDejaMembreDUnAutreGroupe() throws Exception {
        when(familyGroupService.acceptInvitation(eq(5L), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST));

        mockMvc.perform(post("/api/family-groups/invitations/5/accept"))
                .andExpect(status().isBadRequest());
    }

    // ── POST /invitations/{id}/refuse ──────────────────────────

    @Test
    @WithMockCustomUser
    void refuseInvitation_retourne204() throws Exception {
        mockMvc.perform(post("/api/family-groups/invitations/5/refuse"))
                .andExpect(status().isNoContent());

        verify(familyGroupService).refuseInvitation(eq(5L), any());
    }
}
