package com.myfinance.controller;

import com.myfinance.domain.User;
import com.myfinance.dto.CreateSalaryRevisionRequest;
import com.myfinance.dto.SalaryRevisionDto;
import com.myfinance.dto.UpdateSalaryRevisionRequest;
import com.myfinance.service.SalaryRevisionService;
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
@RequestMapping("/api/salary-contracts/{contractId}/revisions")
@RequiredArgsConstructor
@Tag(name = "Révisions salariales", description = "Historique des évolutions de salaire au sein d'un contrat")
public class SalaryRevisionController {

    private final SalaryRevisionService salaryRevisionService;

    @Operation(summary = "Lister les révisions salariales d'un contrat")
    @ApiResponse(responseCode = "200", description = "Liste des révisions",
        content = @Content(array = @ArraySchema(schema = @Schema(implementation = SalaryRevisionDto.class))))
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Contrat introuvable")
    @GetMapping
    public ResponseEntity<List<SalaryRevisionDto>> findAll(
            @Parameter(description = "Identifiant du contrat") @PathVariable Long contractId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(salaryRevisionService.findAllByContract(contractId, currentUser));
    }

    @Operation(summary = "Ajouter une révision salariale")
    @ApiResponse(responseCode = "201", description = "Révision créée",
        content = @Content(schema = @Schema(implementation = SalaryRevisionDto.class)))
    @ApiResponse(responseCode = "400", description = "Date antérieure au début du contrat ou montant invalide")
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Contrat introuvable")
    @ApiResponse(responseCode = "409", description = "Une révision existe déjà pour cette date")
    @PostMapping
    public ResponseEntity<SalaryRevisionDto> create(
            @Parameter(description = "Identifiant du contrat") @PathVariable Long contractId,
            @Valid @RequestBody CreateSalaryRevisionRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(salaryRevisionService.create(contractId, request, currentUser));
    }

    @Operation(summary = "Modifier une révision salariale")
    @ApiResponse(responseCode = "200", description = "Révision modifiée",
        content = @Content(schema = @Schema(implementation = SalaryRevisionDto.class)))
    @ApiResponse(responseCode = "400", description = "Validation échouée")
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Révision introuvable")
    @ApiResponse(responseCode = "409", description = "La nouvelle date est déjà occupée")
    @PutMapping("/{revisionId}")
    public ResponseEntity<SalaryRevisionDto> update(
            @Parameter(description = "Identifiant du contrat") @PathVariable Long contractId,
            @Parameter(description = "Identifiant de la révision") @PathVariable Long revisionId,
            @Valid @RequestBody UpdateSalaryRevisionRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(salaryRevisionService.update(contractId, revisionId, request, currentUser));
    }

    @Operation(summary = "Supprimer une révision salariale")
    @ApiResponse(responseCode = "204", description = "Révision supprimée")
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Révision introuvable")
    @DeleteMapping("/{revisionId}")
    public ResponseEntity<Void> delete(
            @Parameter(description = "Identifiant du contrat") @PathVariable Long contractId,
            @Parameter(description = "Identifiant de la révision") @PathVariable Long revisionId,
            @AuthenticationPrincipal User currentUser) {
        salaryRevisionService.delete(contractId, revisionId, currentUser);
        return ResponseEntity.noContent().build();
    }
}
