package com.myfinance.controller;

import com.myfinance.domain.User;
import com.myfinance.dto.*;
import com.myfinance.service.FamilyGroupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/family-groups")
@RequiredArgsConstructor
@Tag(name = "Regroupement familial", description = "Gestion des groupes familiaux et invitations")
public class FamilyGroupController {

    private final FamilyGroupService familyGroupService;

    @Operation(summary = "Mon groupe")
    @GetMapping("/my")
    public ResponseEntity<FamilyGroupDto> getMyGroup(@AuthenticationPrincipal User user) {
        FamilyGroupDto dto = familyGroupService.findMyGroup(user);
        if (dto == null) return ResponseEntity.noContent().build();
        return ResponseEntity.ok(dto);
    }

    @Operation(summary = "Membres de mon groupe (hors moi-même)")
    @GetMapping("/my/members")
    public ResponseEntity<List<FamilyMemberDto>> getMyGroupMembers(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(familyGroupService.findMyGroupMembers(user));
    }

    @Operation(summary = "Positions d'un membre du groupe")
    @GetMapping("/my/members/{memberId}/positions")
    public ResponseEntity<List<PositionDto>> getMemberPositions(
            @PathVariable Long memberId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(familyGroupService.findMemberPositions(memberId, user));
    }

    @Operation(summary = "Créer un groupe")
    @PostMapping
    public ResponseEntity<FamilyGroupDto> create(
            @Valid @RequestBody CreateFamilyGroupRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(familyGroupService.create(request, user));
    }

    @Operation(summary = "Renommer mon groupe")
    @PutMapping("/my")
    public ResponseEntity<FamilyGroupDto> rename(
            @Valid @RequestBody UpdateFamilyGroupRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(familyGroupService.rename(request, user));
    }

    @Operation(summary = "Dissoudre mon groupe")
    @DeleteMapping("/my")
    public ResponseEntity<Void> dissolve(@AuthenticationPrincipal User user) {
        familyGroupService.dissolve(user);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Quitter mon groupe (non-owner)")
    @DeleteMapping("/my/leave")
    public ResponseEntity<Void> leave(@AuthenticationPrincipal User user) {
        familyGroupService.leave(user);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Retirer un membre de mon groupe")
    @DeleteMapping("/my/members/{memberId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable Long memberId,
            @AuthenticationPrincipal User user) {
        familyGroupService.removeMember(memberId, user);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Envoyer une invitation",
            description = "Réponse identique quel que soit l'état du login (existant, non-existant, déjà invité, "
                        + "owner s'invitant lui-même) pour empêcher l'énumération de comptes. "
                        + "L'owner consulte ensuite GET /api/family-groups/my pour vérifier que l'invitation a bien été créée.")
    @PostMapping("/my/invitations")
    public ResponseEntity<java.util.Map<String, String>> sendInvitation(
            @Valid @RequestBody SendInvitationRequest request,
            @AuthenticationPrincipal User user) {
        familyGroupService.sendInvitation(request, user);
        return ResponseEntity.accepted().body(java.util.Map.of(
                "message", "Si l'utilisateur existe et n'a pas déjà été invité, il recevra l'invitation."));
    }

    @Operation(summary = "Invitations reçues en attente")
    @GetMapping("/invitations/pending")
    public ResponseEntity<List<FamilyGroupInvitationDto>> getPendingInvitations(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(familyGroupService.findPendingInvitations(user));
    }

    @Operation(summary = "Accepter une invitation")
    @PostMapping("/invitations/{id}/accept")
    public ResponseEntity<FamilyGroupDto> acceptInvitation(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(familyGroupService.acceptInvitation(id, user));
    }

    @Operation(summary = "Refuser une invitation")
    @PostMapping("/invitations/{id}/refuse")
    public ResponseEntity<Void> refuseInvitation(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        familyGroupService.refuseInvitation(id, user);
        return ResponseEntity.noContent().build();
    }
}
