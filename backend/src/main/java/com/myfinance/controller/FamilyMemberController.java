package com.myfinance.controller;

import com.myfinance.domain.User;
import com.myfinance.dto.CreateFamilyMemberRequest;
import com.myfinance.dto.EstateMemberDto;
import com.myfinance.dto.UpdateFamilyMemberRequest;
import com.myfinance.service.FamilyMemberService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/family-members")
@RequiredArgsConstructor
@Tag(name = "Cellule familiale", description = "Gestion des membres de la famille pour la simulation de donation/succession")
public class FamilyMemberController {

    private final FamilyMemberService familyMemberService;

    @Operation(summary = "Lister les membres de la famille")
    @ApiResponse(responseCode = "200", content = @Content(array = @ArraySchema(schema = @Schema(implementation = EstateMemberDto.class))))
    @GetMapping
    public ResponseEntity<List<EstateMemberDto>> findAll(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(familyMemberService.findAllByUser(currentUser));
    }

    @Operation(summary = "Ajouter un membre de la famille")
    @ApiResponse(responseCode = "201", content = @Content(schema = @Schema(implementation = EstateMemberDto.class)))
    @PostMapping
    public ResponseEntity<EstateMemberDto> create(
            @Valid @RequestBody CreateFamilyMemberRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(familyMemberService.create(request, currentUser));
    }

    @Operation(summary = "Modifier un membre de la famille")
    @ApiResponse(responseCode = "200", content = @Content(schema = @Schema(implementation = EstateMemberDto.class)))
    @ApiResponse(responseCode = "404", description = "Membre introuvable")
    @PutMapping("/{id}")
    public ResponseEntity<EstateMemberDto> update(
            @Parameter(description = "Identifiant du membre") @PathVariable Long id,
            @Valid @RequestBody UpdateFamilyMemberRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(familyMemberService.update(id, request, currentUser));
    }

    @Operation(summary = "Supprimer un membre de la famille")
    @ApiResponse(responseCode = "204", description = "Membre supprimé")
    @ApiResponse(responseCode = "404", description = "Membre introuvable")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @Parameter(description = "Identifiant du membre") @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        familyMemberService.delete(id, currentUser);
        return ResponseEntity.noContent().build();
    }
}
