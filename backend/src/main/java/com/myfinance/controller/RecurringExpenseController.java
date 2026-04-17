package com.myfinance.controller;

import com.myfinance.domain.User;
import com.myfinance.dto.*;
import com.myfinance.service.RecurringExpenseService;
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
@RequestMapping("/api/recurring-expenses")
@RequiredArgsConstructor
@Tag(name = "Dépenses récurrentes", description = "Charges fixes et périodiques — calcul de la capacité d'épargne")
public class RecurringExpenseController {

    private final RecurringExpenseService recurringExpenseService;

    @Operation(summary = "Lister mes dépenses récurrentes")
    @ApiResponse(responseCode = "200", description = "Liste des dépenses avec montants projetés",
        content = @Content(array = @ArraySchema(schema = @Schema(implementation = RecurringExpenseDto.class))))
    @GetMapping
    public ResponseEntity<List<RecurringExpenseDto>> findAll(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(recurringExpenseService.findAllByUser(currentUser));
    }

    @Operation(summary = "Résumé — capacité d'épargne et répartition par catégorie")
    @ApiResponse(responseCode = "200", description = "Synthèse des dépenses et revenus",
        content = @Content(schema = @Schema(implementation = ExpenseSummaryDto.class)))
    @GetMapping("/summary")
    public ResponseEntity<ExpenseSummaryDto> getSummary(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(recurringExpenseService.getSummary(currentUser));
    }

    @Operation(summary = "Ajouter une dépense récurrente")
    @ApiResponse(responseCode = "201", description = "Dépense créée",
        content = @Content(schema = @Schema(implementation = RecurringExpenseDto.class)))
    @PostMapping
    public ResponseEntity<RecurringExpenseDto> create(
            @Valid @RequestBody CreateRecurringExpenseRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(recurringExpenseService.create(request, currentUser));
    }

    @Operation(summary = "Modifier une dépense récurrente")
    @ApiResponse(responseCode = "200", description = "Dépense modifiée",
        content = @Content(schema = @Schema(implementation = RecurringExpenseDto.class)))
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Dépense introuvable")
    @PutMapping("/{id}")
    public ResponseEntity<RecurringExpenseDto> update(
            @Parameter(description = "Identifiant de la dépense") @PathVariable Long id,
            @Valid @RequestBody UpdateRecurringExpenseRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(recurringExpenseService.update(id, request, currentUser));
    }

    @Operation(summary = "Supprimer une dépense récurrente")
    @ApiResponse(responseCode = "204", description = "Dépense supprimée")
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Dépense introuvable")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @Parameter(description = "Identifiant de la dépense") @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        recurringExpenseService.delete(id, currentUser);
        return ResponseEntity.noContent().build();
    }
}
