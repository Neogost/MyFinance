package com.myfinance.controller;

import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.PositionStatus;
import com.myfinance.domain.User;
import com.myfinance.dto.*;
import com.myfinance.service.PositionService;
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
@RequestMapping("/api/positions")
@RequiredArgsConstructor
@Tag(name = "Patrimoine — Positions", description = "Gestion des positions du patrimoine (Livrets, Liquidités, Bourse, Crypto...)")
public class PositionController {

    private final PositionService positionService;

    // ── Positions ──────────────────────────────────────────────

    @Operation(summary = "Lister mes positions",
            parameters = {
                @Parameter(name = "category", description = "Filtrer par catégorie (BOURSE, CRYPTO, IMMO_PAPIER, IMMO_PHYSIQUE, LIVRET, LIQUIDITE)"),
                @Parameter(name = "status",   description = "Filtrer par statut (ACTIVE, CLOSED) — défaut : toutes")
            })
    @ApiResponse(responseCode = "200", description = "Liste des positions",
        content = @Content(array = @ArraySchema(schema = @Schema(implementation = PositionDto.class))))
    @GetMapping
    public ResponseEntity<List<PositionDto>> findAll(
            @RequestParam(required = false) AssetCategory category,
            @RequestParam(required = false) PositionStatus status,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(positionService.findAllByUser(currentUser, category, status));
    }

    @Operation(summary = "Détail d'une position avec ses ordres")
    @ApiResponse(responseCode = "200", description = "Position trouvée",
        content = @Content(schema = @Schema(implementation = PositionDto.class)))
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Position introuvable")
    @GetMapping("/{id}")
    public ResponseEntity<PositionDto> findById(
            @Parameter(description = "Identifiant de la position") @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(positionService.findById(id, currentUser));
    }

    @Operation(summary = "Créer une position")
    @ApiResponse(responseCode = "201", description = "Position créée",
        content = @Content(schema = @Schema(implementation = PositionDto.class)))
    @PostMapping
    public ResponseEntity<PositionDto> create(
            @Valid @RequestBody CreatePositionRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(positionService.create(request, currentUser));
    }

    @Operation(summary = "Modifier une position")
    @ApiResponse(responseCode = "200", description = "Position modifiée",
        content = @Content(schema = @Schema(implementation = PositionDto.class)))
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Position introuvable")
    @PutMapping("/{id}")
    public ResponseEntity<PositionDto> update(
            @Parameter(description = "Identifiant de la position") @PathVariable Long id,
            @Valid @RequestBody UpdatePositionRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(positionService.update(id, request, currentUser));
    }

    @Operation(summary = "Mettre à jour le solde d'une position LIQUIDITE")
    @ApiResponse(responseCode = "200", description = "Solde mis à jour",
        content = @Content(schema = @Schema(implementation = PositionDto.class)))
    @ApiResponse(responseCode = "400", description = "Position non de type LIQUIDITE")
    @ApiResponse(responseCode = "404", description = "Position introuvable")
    @PutMapping("/{id}/balance")
    public ResponseEntity<PositionDto> updateBalance(
            @Parameter(description = "Identifiant de la position") @PathVariable Long id,
            @Valid @RequestBody UpdateBalanceRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(positionService.updateBalance(id, request, currentUser));
    }

    @Operation(summary = "Mettre à jour la valeur estimée d'une position IMMO_PHYSIQUE")
    @ApiResponse(responseCode = "200", description = "Valeur estimée mise à jour",
        content = @Content(schema = @Schema(implementation = PositionDto.class)))
    @ApiResponse(responseCode = "400", description = "Position non de type IMMO_PHYSIQUE")
    @ApiResponse(responseCode = "404", description = "Position introuvable")
    @PutMapping("/{id}/estimated-value")
    public ResponseEntity<PositionDto> updateEstimatedValue(
            @Parameter(description = "Identifiant de la position") @PathVariable Long id,
            @Valid @RequestBody UpdateEstimatedValueRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(positionService.updateEstimatedValue(id, request, currentUser));
    }

    @Operation(summary = "Fermer une position")
    @ApiResponse(responseCode = "200", description = "Position fermée",
        content = @Content(schema = @Schema(implementation = PositionDto.class)))
    @ApiResponse(responseCode = "404", description = "Position introuvable")
    @PutMapping("/{id}/close")
    public ResponseEntity<PositionDto> close(
            @Parameter(description = "Identifiant de la position") @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(positionService.close(id, currentUser));
    }

    @Operation(summary = "Supprimer une position et tous ses ordres")
    @ApiResponse(responseCode = "204", description = "Position supprimée")
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Position introuvable")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @Parameter(description = "Identifiant de la position") @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        positionService.delete(id, currentUser);
        return ResponseEntity.noContent().build();
    }

    // ── Ordres ─────────────────────────────────────────────────

    @Operation(summary = "Lister les ordres d'une position")
    @ApiResponse(responseCode = "200", description = "Liste des ordres",
        content = @Content(array = @ArraySchema(schema = @Schema(implementation = PositionOrderDto.class))))
    @GetMapping("/{id}/orders")
    public ResponseEntity<List<PositionOrderDto>> findOrders(
            @Parameter(description = "Identifiant de la position") @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(positionService.findOrdersByPosition(id, currentUser));
    }

    @Operation(summary = "Ajouter un ordre sur une position")
    @ApiResponse(responseCode = "201", description = "Ordre créé",
        content = @Content(schema = @Schema(implementation = PositionOrderDto.class)))
    @ApiResponse(responseCode = "400", description = "Position LIQUIDITE ou données invalides")
    @ApiResponse(responseCode = "404", description = "Position introuvable")
    @PostMapping("/{id}/orders")
    public ResponseEntity<PositionOrderDto> createOrder(
            @Parameter(description = "Identifiant de la position") @PathVariable Long id,
            @Valid @RequestBody CreatePositionOrderRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(positionService.createOrder(id, request, currentUser));
    }

    @Operation(summary = "Modifier un ordre")
    @ApiResponse(responseCode = "200", description = "Ordre modifié",
        content = @Content(schema = @Schema(implementation = PositionOrderDto.class)))
    @ApiResponse(responseCode = "404", description = "Ordre ou position introuvable")
    @PutMapping("/{id}/orders/{orderId}")
    public ResponseEntity<PositionOrderDto> updateOrder(
            @Parameter(description = "Identifiant de la position") @PathVariable Long id,
            @Parameter(description = "Identifiant de l'ordre") @PathVariable Long orderId,
            @Valid @RequestBody UpdatePositionOrderRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(positionService.updateOrder(id, orderId, request, currentUser));
    }

    @Operation(summary = "Supprimer un ordre")
    @ApiResponse(responseCode = "204", description = "Ordre supprimé")
    @ApiResponse(responseCode = "404", description = "Ordre ou position introuvable")
    @DeleteMapping("/{id}/orders/{orderId}")
    public ResponseEntity<Void> deleteOrder(
            @Parameter(description = "Identifiant de la position") @PathVariable Long id,
            @Parameter(description = "Identifiant de l'ordre") @PathVariable Long orderId,
            @AuthenticationPrincipal User currentUser) {
        positionService.deleteOrder(id, orderId, currentUser);
        return ResponseEntity.noContent().build();
    }
}
