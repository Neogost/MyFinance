package com.myfinance.service;

import com.myfinance.domain.*;
import com.myfinance.dto.*;
import com.myfinance.repository.FamilyGroupInvitationRepository;
import com.myfinance.repository.FamilyGroupRepository;
import com.myfinance.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FamilyGroupServiceTest {

    @Mock FamilyGroupRepository familyGroupRepository;
    @Mock FamilyGroupInvitationRepository invitationRepository;
    @Mock UserRepository userRepository;
    @InjectMocks FamilyGroupService familyGroupService;

    User owner;
    User member;
    User outsider;
    FamilyGroup group;

    @BeforeEach
    void setUp() {
        owner   = User.builder().id(1L).login("kevin").firstName("Kévin").lastName("D").role(RoleEnum.USER).build();
        member  = User.builder().id(2L).login("sarah").firstName("Sarah").lastName("M").role(RoleEnum.USER).build();
        outsider = User.builder().id(3L).login("marc").firstName("Marc").lastName("X").role(RoleEnum.USER).build();

        group = FamilyGroup.builder()
                .id(1L).name("Famille Test").owner(owner).createdAt(LocalDateTime.now()).build();

        owner.setFamilyGroup(group);
        member.setFamilyGroup(group);
    }

    // ── findMyGroup ────────────────────────────────────────────

    @Test
    void findMyGroup_retourneNull_siPasDeGroupe() {
        assertThat(familyGroupService.findMyGroup(outsider)).isNull();
    }

    @Test
    void findMyGroup_retourneLe_Dto_siGroupe() {
        when(familyGroupRepository.findById(1L)).thenReturn(Optional.of(group));
        when(userRepository.findByFamilyGroup(group)).thenReturn(List.of(owner, member));
        when(invitationRepository.findByGroupOrderByCreatedAtDesc(group)).thenReturn(List.of());

        FamilyGroupDto dto = familyGroupService.findMyGroup(owner);

        assertThat(dto).isNotNull();
        assertThat(dto.name()).isEqualTo("Famille Test");
        assertThat(dto.members()).hasSize(2);
    }

    // ── findMyGroupMembers ─────────────────────────────────────

    @Test
    void findMyGroupMembers_leve400_siPasDeGroupe() {
        assertThatThrownBy(() -> familyGroupService.findMyGroupMembers(outsider))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void findMyGroupMembers_exclutLUtilisateurCourant() {
        when(familyGroupRepository.findById(1L)).thenReturn(Optional.of(group));
        when(userRepository.findByFamilyGroup(group)).thenReturn(List.of(owner, member));

        List<FamilyMemberDto> result = familyGroupService.findMyGroupMembers(owner);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).login()).isEqualTo("sarah");
    }

    // ── create ─────────────────────────────────────────────────

    @Test
    void create_leve400_siDejaMembreDUnGroupe() {
        assertThatThrownBy(() -> familyGroupService.create(new CreateFamilyGroupRequest("Nouveau"), owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void create_creeLeGroupeEtAffecteOwner() {
        when(familyGroupRepository.save(any(FamilyGroup.class))).thenAnswer(inv -> {
            FamilyGroup g = inv.getArgument(0);
            return FamilyGroup.builder().id(10L).name(g.getName())
                    .owner(outsider).createdAt(g.getCreatedAt()).build();
        });
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findByFamilyGroup(any())).thenReturn(List.of(outsider));
        when(invitationRepository.findByGroupOrderByCreatedAtDesc(any())).thenReturn(List.of());

        FamilyGroupDto dto = familyGroupService.create(new CreateFamilyGroupRequest("Mon Foyer"), outsider);

        assertThat(dto.id()).isEqualTo(10L);
        assertThat(outsider.getFamilyGroup()).isNotNull();
        verify(userRepository).save(outsider);
    }

    // ── rename ─────────────────────────────────────────────────

    @Test
    void rename_leve403_siPasOwner() {
        when(familyGroupRepository.findById(1L)).thenReturn(Optional.of(group));
        assertThatThrownBy(() -> familyGroupService.rename(new UpdateFamilyGroupRequest("Nouveau"), member))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void rename_miseAJourLeNom() {
        when(familyGroupRepository.findById(1L)).thenReturn(Optional.of(group));
        when(familyGroupRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findByFamilyGroup(group)).thenReturn(List.of(owner, member));
        when(invitationRepository.findByGroupOrderByCreatedAtDesc(group)).thenReturn(List.of());

        FamilyGroupDto dto = familyGroupService.rename(new UpdateFamilyGroupRequest("Nouveau Nom"), owner);

        assertThat(dto.name()).isEqualTo("Nouveau Nom");
    }

    // ── leave ──────────────────────────────────────────────────

    @Test
    void leave_leve403_siOwner() {
        when(familyGroupRepository.findById(1L)).thenReturn(Optional.of(group));
        assertThatThrownBy(() -> familyGroupService.leave(owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void leave_leve400_siPasDeGroupe() {
        assertThatThrownBy(() -> familyGroupService.leave(outsider))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void leave_retireLeMembreEtSauvegarde() {
        when(familyGroupRepository.findById(1L)).thenReturn(Optional.of(group));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        familyGroupService.leave(member);

        assertThat(member.getFamilyGroup()).isNull();
        verify(userRepository).save(member);
    }

    // ── removeMember ───────────────────────────────────────────

    @Test
    void removeMember_leve403_siPasOwner() {
        when(familyGroupRepository.findById(1L)).thenReturn(Optional.of(group));
        assertThatThrownBy(() -> familyGroupService.removeMember(1L, member))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void removeMember_leve400_siMembreNAppartientPasAuGroupe() {
        when(familyGroupRepository.findById(1L)).thenReturn(Optional.of(group));
        when(userRepository.findById(3L)).thenReturn(Optional.of(outsider));

        assertThatThrownBy(() -> familyGroupService.removeMember(3L, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void removeMember_retireLeMembreCorrectement() {
        when(familyGroupRepository.findById(1L)).thenReturn(Optional.of(group));
        when(userRepository.findById(2L)).thenReturn(Optional.of(member));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        familyGroupService.removeMember(2L, owner);

        assertThat(member.getFamilyGroup()).isNull();
    }

    // ── sendInvitation ─────────────────────────────────────────

    @Test
    void removeMember_ownerSuiMeme_leve400() {
        when(familyGroupRepository.findById(1L)).thenReturn(Optional.of(group));
        when(userRepository.findById(1L)).thenReturn(Optional.of(owner));

        assertThatThrownBy(() -> familyGroupService.removeMember(1L, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    // M15 — anti-énumération : login owner, login inconnu, déjà PENDING → no-op silencieux
    // (pas d'exception). L'owner ne peut pas distinguer les cas par la réponse.

    @Test
    void sendInvitation_suiMeme_noOpSilencieux() {
        when(familyGroupRepository.findById(1L)).thenReturn(Optional.of(group));
        when(userRepository.findByLogin("kevin")).thenReturn(Optional.of(owner));

        // Pas d'exception — comportement no-op
        familyGroupService.sendInvitation(new SendInvitationRequest("kevin"), owner);

        verify(invitationRepository, never()).save(any());
    }

    @Test
    void sendInvitation_loginInconnu_noOpSilencieux() {
        when(familyGroupRepository.findById(1L)).thenReturn(Optional.of(group));
        when(userRepository.findByLogin("inconnu")).thenReturn(Optional.empty());

        familyGroupService.sendInvitation(new SendInvitationRequest("inconnu"), owner);

        verify(invitationRepository, never()).save(any());
        // findByGroupAndInvitedUserAndStatus ne doit même pas être consulté (sortie tôt)
        verify(invitationRepository, never()).findByGroupAndInvitedUserAndStatus(any(), any(), any());
    }

    @Test
    void sendInvitation_dejaUnePendingExistante_noOpSilencieux() {
        when(familyGroupRepository.findById(1L)).thenReturn(Optional.of(group));
        when(userRepository.findByLogin("marc")).thenReturn(Optional.of(outsider));
        FamilyGroupInvitation existante = FamilyGroupInvitation.builder()
                .id(99L).group(group).invitedUser(outsider)
                .status(InvitationStatus.PENDING).createdAt(LocalDateTime.now()).build();
        when(invitationRepository.findByGroupAndInvitedUserAndStatus(group, outsider, InvitationStatus.PENDING))
                .thenReturn(Optional.of(existante));

        familyGroupService.sendInvitation(new SendInvitationRequest("marc"), owner);

        // Pas de nouvelle invitation créée — l'ancienne PENDING reste en l'état
        verify(invitationRepository, never()).save(any());
    }

    @Test
    void sendInvitation_creeLInvitation_quandConditionsValides() {
        when(familyGroupRepository.findById(1L)).thenReturn(Optional.of(group));
        when(userRepository.findByLogin("marc")).thenReturn(Optional.of(outsider));
        when(invitationRepository.findByGroupAndInvitedUserAndStatus(group, outsider, InvitationStatus.PENDING))
                .thenReturn(Optional.empty());
        when(invitationRepository.save(any())).thenAnswer(inv -> {
            FamilyGroupInvitation i = inv.getArgument(0);
            return FamilyGroupInvitation.builder().id(5L).group(i.getGroup())
                    .invitedUser(i.getInvitedUser()).status(i.getStatus())
                    .createdAt(i.getCreatedAt()).build();
        });

        familyGroupService.sendInvitation(new SendInvitationRequest("marc"), owner);

        // L'invitation est bien créée — vérifié via save() invoqué une fois
        verify(invitationRepository).save(any());
    }

    // ── acceptInvitation ───────────────────────────────────────

    @Test
    void acceptInvitation_leve400_siDejaMembreDUnGroupe() {
        FamilyGroupInvitation inv = FamilyGroupInvitation.builder()
                .id(5L).group(group).invitedUser(member)
                .status(InvitationStatus.PENDING).createdAt(LocalDateTime.now()).build();
        when(invitationRepository.findById(5L)).thenReturn(Optional.of(inv));

        assertThatThrownBy(() -> familyGroupService.acceptInvitation(5L, member))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void acceptInvitation_affecteLeGroupeEtMarqueAccepted() {
        FamilyGroupInvitation inv = FamilyGroupInvitation.builder()
                .id(5L).group(group).invitedUser(outsider)
                .status(InvitationStatus.PENDING).createdAt(LocalDateTime.now()).build();
        when(invitationRepository.findById(5L)).thenReturn(Optional.of(inv));
        when(invitationRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(userRepository.findByFamilyGroup(group)).thenReturn(List.of(owner, member, outsider));
        when(invitationRepository.findByGroupOrderByCreatedAtDesc(group)).thenReturn(List.of());

        FamilyGroupDto dto = familyGroupService.acceptInvitation(5L, outsider);

        assertThat(outsider.getFamilyGroup()).isEqualTo(group);
        assertThat(inv.getStatus()).isEqualTo(InvitationStatus.ACCEPTED);
        assertThat(dto).isNotNull();
    }

    // ── refuseInvitation ───────────────────────────────────────

    @Test
    void refuseInvitation_leve403_siPasLeDestinataire() {
        FamilyGroupInvitation inv = FamilyGroupInvitation.builder()
                .id(5L).group(group).invitedUser(outsider)
                .status(InvitationStatus.PENDING).createdAt(LocalDateTime.now()).build();
        when(invitationRepository.findById(5L)).thenReturn(Optional.of(inv));

        assertThatThrownBy(() -> familyGroupService.refuseInvitation(5L, member))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void refuseInvitation_marqueRefused() {
        FamilyGroupInvitation inv = FamilyGroupInvitation.builder()
                .id(5L).group(group).invitedUser(outsider)
                .status(InvitationStatus.PENDING).createdAt(LocalDateTime.now()).build();
        when(invitationRepository.findById(5L)).thenReturn(Optional.of(inv));
        when(invitationRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        familyGroupService.refuseInvitation(5L, outsider);

        assertThat(inv.getStatus()).isEqualTo(InvitationStatus.REFUSED);
        assertThat(inv.getRespondedAt()).isNotNull();
    }

    // ── adminDissolve ──────────────────────────────────────────

    @Test
    void adminDissolve_leve404_siGroupeInconnu() {
        when(familyGroupRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> familyGroupService.adminDissolve(99L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void adminDissolve_supprimeLesMembresPuisLeGroupe() {
        when(familyGroupRepository.findById(1L)).thenReturn(Optional.of(group));
        when(userRepository.findByFamilyGroup(group)).thenReturn(List.of(owner, member));
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        doNothing().when(invitationRepository).deleteByGroup(group);

        familyGroupService.adminDissolve(1L);

        assertThat(owner.getFamilyGroup()).isNull();
        assertThat(member.getFamilyGroup()).isNull();
        verify(familyGroupRepository).delete(group);
    }
}
