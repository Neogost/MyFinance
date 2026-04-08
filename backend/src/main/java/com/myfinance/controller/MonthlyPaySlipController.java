package com.myfinance.controller;

import com.myfinance.domain.User;
import com.myfinance.dto.CreateMonthlyPaySlipRequest;
import com.myfinance.dto.MonthlyPaySlipDto;
import com.myfinance.dto.UpdateMonthlyPaySlipRequest;
import com.myfinance.service.MonthlyPaySlipService;
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
@RequestMapping("/api/salary-contracts/{contractId}/pay-slips")
@RequiredArgsConstructor
@Tag(name = "Bulletins de salaire", description = "Saisie des bulletins mensuels réels (vue réelle vs théorique)")
public class MonthlyPaySlipController {

    private final MonthlyPaySlipService monthlyPaySlipService;

    @Operation(summary = "Lister les bulletins d'un contrat")
    @ApiResponse(responseCode = "200", description = "Liste des bulletins",
        content = @Content(array = @ArraySchema(schema = @Schema(implementation = MonthlyPaySlipDto.class))))
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Contrat introuvable")
    @GetMapping
    public ResponseEntity<List<MonthlyPaySlipDto>> findAll(
            @Parameter(description = "Identifiant du contrat") @PathVariable Long contractId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(monthlyPaySlipService.findAllByContract(contractId, currentUser));
    }

    @Operation(summary = "Ajouter un bulletin mensuel")
    @ApiResponse(responseCode = "201", description = "Bulletin créé",
        content = @Content(schema = @Schema(implementation = MonthlyPaySlipDto.class)))
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Contrat introuvable")
    @ApiResponse(responseCode = "409", description = "Un bulletin existe déjà pour cette période")
    @PostMapping
    public ResponseEntity<MonthlyPaySlipDto> create(
            @Parameter(description = "Identifiant du contrat") @PathVariable Long contractId,
            @Valid @RequestBody CreateMonthlyPaySlipRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(monthlyPaySlipService.create(contractId, request, currentUser));
    }

    @Operation(summary = "Modifier un bulletin mensuel")
    @ApiResponse(responseCode = "200", description = "Bulletin modifié",
        content = @Content(schema = @Schema(implementation = MonthlyPaySlipDto.class)))
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Bulletin introuvable")
    @ApiResponse(responseCode = "409", description = "Conflit de période")
    @PutMapping("/{slipId}")
    public ResponseEntity<MonthlyPaySlipDto> update(
            @Parameter(description = "Identifiant du contrat") @PathVariable Long contractId,
            @Parameter(description = "Identifiant du bulletin") @PathVariable Long slipId,
            @Valid @RequestBody UpdateMonthlyPaySlipRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(monthlyPaySlipService.update(contractId, slipId, request, currentUser));
    }

    @Operation(summary = "Supprimer un bulletin mensuel")
    @ApiResponse(responseCode = "204", description = "Bulletin supprimé")
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Bulletin introuvable")
    @DeleteMapping("/{slipId}")
    public ResponseEntity<Void> delete(
            @Parameter(description = "Identifiant du contrat") @PathVariable Long contractId,
            @Parameter(description = "Identifiant du bulletin") @PathVariable Long slipId,
            @AuthenticationPrincipal User currentUser) {
        monthlyPaySlipService.delete(contractId, slipId, currentUser);
        return ResponseEntity.noContent().build();
    }
}
