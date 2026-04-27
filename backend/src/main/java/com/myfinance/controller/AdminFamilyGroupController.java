package com.myfinance.controller;

import com.myfinance.dto.FamilyGroupDto;
import com.myfinance.service.FamilyGroupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/admin/family-groups")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin — Regroupements familiaux", description = "Consultation et modération des groupes")
public class AdminFamilyGroupController {

    private final FamilyGroupService familyGroupService;

    @Operation(summary = "Tous les groupes")
    @GetMapping
    public ResponseEntity<List<FamilyGroupDto>> findAll() {
        return ResponseEntity.ok(familyGroupService.findAll());
    }

    @Operation(summary = "Détail d'un groupe")
    @GetMapping("/{id}")
    public ResponseEntity<FamilyGroupDto> findById(@PathVariable Long id) {
        return ResponseEntity.ok(familyGroupService.findById(id));
    }

    @Operation(summary = "Supprimer un groupe")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> dissolve(@PathVariable Long id, Authentication authentication) {
        log.info("[admin:{}] Dissolution groupe familial #{}", authentication.getName(), id);
        familyGroupService.adminDissolve(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Retirer un membre d'un groupe")
    @DeleteMapping("/{id}/members/{memberId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable Long id,
            @PathVariable Long memberId,
            Authentication authentication) {
        log.info("[admin:{}] Retrait membre #{} du groupe familial #{}",
                authentication.getName(), memberId, id);
        familyGroupService.adminRemoveMember(id, memberId);
        return ResponseEntity.noContent().build();
    }
}
