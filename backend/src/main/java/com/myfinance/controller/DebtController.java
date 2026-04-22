package com.myfinance.controller;

import com.myfinance.domain.User;
import com.myfinance.dto.*;
import com.myfinance.service.DebtService;
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
@RequestMapping("/api/debts")
@RequiredArgsConstructor
@Tag(name = "Dettes", description = "Gestion des dettes financières de l'utilisateur")
public class DebtController {

    private final DebtService debtService;

    @Operation(summary = "Lister mes dettes")
    @ApiResponse(responseCode = "200", description = "Liste des dettes avec capital restant calculé",
            content = @Content(array = @ArraySchema(schema = @Schema(implementation = DebtDto.class))))
    @GetMapping
    public ResponseEntity<List<DebtDto>> findAll(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(debtService.findAllByUser(currentUser));
    }

    @Operation(summary = "Détail d'une dette")
    @ApiResponse(responseCode = "200", description = "Dette trouvée avec tableau d'amortissement",
            content = @Content(schema = @Schema(implementation = DebtDto.class)))
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Dette introuvable")
    @GetMapping("/{id}")
    public ResponseEntity<DebtDto> findById(
            @Parameter(description = "Identifiant de la dette") @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(debtService.findById(id, currentUser));
    }

    @Operation(summary = "Synthèse globale des dettes")
    @ApiResponse(responseCode = "200", description = "Totaux et répartition par type",
            content = @Content(schema = @Schema(implementation = DebtSummaryDto.class)))
    @GetMapping("/summary")
    public ResponseEntity<DebtSummaryDto> getSummary(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(debtService.getSummary(currentUser));
    }

    @Operation(summary = "Créer une dette")
    @ApiResponse(responseCode = "201", description = "Dette créée",
            content = @Content(schema = @Schema(implementation = DebtDto.class)))
    @PostMapping
    public ResponseEntity<DebtDto> create(
            @Valid @RequestBody CreateDebtRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(debtService.create(request, currentUser));
    }

    @Operation(summary = "Modifier une dette")
    @ApiResponse(responseCode = "200", description = "Dette modifiée",
            content = @Content(schema = @Schema(implementation = DebtDto.class)))
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Dette introuvable")
    @PutMapping("/{id}")
    public ResponseEntity<DebtDto> update(
            @Parameter(description = "Identifiant de la dette") @PathVariable Long id,
            @Valid @RequestBody UpdateDebtRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(debtService.update(id, request, currentUser));
    }

    @Operation(summary = "Supprimer une dette")
    @ApiResponse(responseCode = "204", description = "Dette supprimée")
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Dette introuvable")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @Parameter(description = "Identifiant de la dette") @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        debtService.delete(id, currentUser);
        return ResponseEntity.noContent().build();
    }

    // ── Historique des soldes ──────────────────────────────────

    @Operation(summary = "Historique des mises à jour manuelles du capital")
    @ApiResponse(responseCode = "200", description = "Historique des entrées",
            content = @Content(array = @ArraySchema(schema = @Schema(implementation = DebtBalanceEntryDto.class))))
    @ApiResponse(responseCode = "404", description = "Dette introuvable")
    @GetMapping("/{id}/balance-entries")
    public ResponseEntity<List<DebtBalanceEntryDto>> getBalanceEntries(
            @Parameter(description = "Identifiant de la dette") @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(debtService.getBalanceEntries(id, currentUser));
    }

    @Operation(summary = "Ajouter une mise à jour manuelle du capital")
    @ApiResponse(responseCode = "201", description = "Entrée ajoutée",
            content = @Content(schema = @Schema(implementation = DebtBalanceEntryDto.class)))
    @ApiResponse(responseCode = "404", description = "Dette introuvable")
    @PostMapping("/{id}/balance-entries")
    public ResponseEntity<DebtBalanceEntryDto> addBalanceEntry(
            @Parameter(description = "Identifiant de la dette") @PathVariable Long id,
            @Valid @RequestBody CreateDebtBalanceEntryRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(debtService.addBalanceEntry(id, request, currentUser));
    }

    @Operation(summary = "Supprimer une entrée de l'historique")
    @ApiResponse(responseCode = "204", description = "Entrée supprimée")
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Entrée introuvable")
    @DeleteMapping("/{id}/balance-entries/{entryId}")
    public ResponseEntity<Void> deleteBalanceEntry(
            @Parameter(description = "Identifiant de la dette") @PathVariable Long id,
            @Parameter(description = "Identifiant de l'entrée") @PathVariable Long entryId,
            @AuthenticationPrincipal User currentUser) {
        debtService.deleteBalanceEntry(id, entryId, currentUser);
        return ResponseEntity.noContent().build();
    }
}
