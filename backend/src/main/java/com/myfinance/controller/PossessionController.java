package com.myfinance.controller;

import com.myfinance.domain.User;
import com.myfinance.dto.*;
import com.myfinance.service.PossessionService;
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
@RequestMapping("/api/possessions")
@RequiredArgsConstructor
@Tag(name = "Passifs", description = "Gestion des grandes possessions (passifs) de l'utilisateur")
public class PossessionController {

    private final PossessionService possessionService;

    @Operation(summary = "Lister mes possessions")
    @ApiResponse(responseCode = "200", description = "Liste des possessions avec valeurs calculées",
            content = @Content(array = @ArraySchema(schema = @Schema(implementation = PossessionDto.class))))
    @GetMapping
    public ResponseEntity<List<PossessionDto>> findAll(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(possessionService.findAllByUser(currentUser));
    }

    @Operation(summary = "Détail d'une possession")
    @ApiResponse(responseCode = "200", description = "Possession trouvée",
            content = @Content(schema = @Schema(implementation = PossessionDto.class)))
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Possession introuvable")
    @GetMapping("/{id}")
    public ResponseEntity<PossessionDto> findById(
            @Parameter(description = "Identifiant de la possession") @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(possessionService.findById(id, currentUser));
    }

    @Operation(summary = "Synthèse globale des possessions")
    @ApiResponse(responseCode = "200", description = "Totaux et répartition par catégorie",
            content = @Content(schema = @Schema(implementation = PossessionSummaryDto.class)))
    @GetMapping("/summary")
    public ResponseEntity<PossessionSummaryDto> getSummary(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(possessionService.getSummary(currentUser));
    }

    @Operation(summary = "Créer une possession")
    @ApiResponse(responseCode = "201", description = "Possession créée",
            content = @Content(schema = @Schema(implementation = PossessionDto.class)))
    @PostMapping
    public ResponseEntity<PossessionDto> create(
            @Valid @RequestBody CreatePossessionRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(possessionService.create(request, currentUser));
    }

    @Operation(summary = "Modifier une possession")
    @ApiResponse(responseCode = "200", description = "Possession modifiée",
            content = @Content(schema = @Schema(implementation = PossessionDto.class)))
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Possession introuvable")
    @PutMapping("/{id}")
    public ResponseEntity<PossessionDto> update(
            @Parameter(description = "Identifiant de la possession") @PathVariable Long id,
            @Valid @RequestBody UpdatePossessionRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(possessionService.update(id, request, currentUser));
    }

    @Operation(summary = "Supprimer une possession")
    @ApiResponse(responseCode = "204", description = "Possession supprimée")
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Possession introuvable")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @Parameter(description = "Identifiant de la possession") @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        possessionService.delete(id, currentUser);
        return ResponseEntity.noContent().build();
    }
}
