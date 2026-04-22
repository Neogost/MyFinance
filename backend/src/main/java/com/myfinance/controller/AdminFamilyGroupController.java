package com.myfinance.controller;

import com.myfinance.dto.FamilyGroupDto;
import com.myfinance.service.FamilyGroupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
    public ResponseEntity<Void> dissolve(@PathVariable Long id) {
        familyGroupService.adminDissolve(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Retirer un membre d'un groupe")
    @DeleteMapping("/{id}/members/{memberId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable Long id,
            @PathVariable Long memberId) {
        familyGroupService.adminRemoveMember(id, memberId);
        return ResponseEntity.noContent().build();
    }
}
