package com.myfinance.controller;

import com.myfinance.domain.User;
import com.myfinance.dto.CreateLoanSimulationRequest;
import com.myfinance.dto.LoanSimulationDto;
import com.myfinance.service.LoanSimulationService;
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
@RequestMapping("/api/loan-simulations")
@RequiredArgsConstructor
@Tag(name = "Simulations d'emprunt", description = "Sauvegarde et gestion des simulations d'emprunt immobilier")
public class LoanSimulationController {

    private final LoanSimulationService loanSimulationService;

    @Operation(summary = "Lister mes simulations sauvegardées")
    @ApiResponse(responseCode = "200", description = "Liste des simulations",
            content = @Content(array = @ArraySchema(schema = @Schema(implementation = LoanSimulationDto.class))))
    @GetMapping
    public ResponseEntity<List<LoanSimulationDto>> findAll(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(loanSimulationService.findAllByUser(currentUser));
    }

    @Operation(summary = "Sauvegarder une simulation")
    @ApiResponse(responseCode = "201", description = "Simulation sauvegardée",
            content = @Content(schema = @Schema(implementation = LoanSimulationDto.class)))
    @PostMapping
    public ResponseEntity<LoanSimulationDto> create(
            @Valid @RequestBody CreateLoanSimulationRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(loanSimulationService.create(request, currentUser));
    }

    @Operation(summary = "Supprimer une simulation")
    @ApiResponse(responseCode = "204", description = "Simulation supprimée")
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Simulation introuvable")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @Parameter(description = "Identifiant de la simulation") @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        loanSimulationService.delete(id, currentUser);
        return ResponseEntity.noContent().build();
    }
}
