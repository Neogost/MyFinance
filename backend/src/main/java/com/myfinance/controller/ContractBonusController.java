package com.myfinance.controller;

import com.myfinance.domain.User;
import com.myfinance.dto.ContractBonusDto;
import com.myfinance.dto.CreateContractBonusRequest;
import com.myfinance.dto.UpdateContractBonusRequest;
import com.myfinance.service.ContractBonusService;
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
@RequestMapping("/api/salary-contracts/{contractId}/bonuses")
@RequiredArgsConstructor
@Tag(name = "Primes", description = "Gestion des primes rattachées à un contrat salarial")
public class ContractBonusController {

    private final ContractBonusService contractBonusService;

    @Operation(summary = "Lister les primes d'un contrat")
    @ApiResponse(responseCode = "200", description = "Liste des primes",
        content = @Content(array = @ArraySchema(schema = @Schema(implementation = ContractBonusDto.class))))
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Contrat introuvable")
    @GetMapping
    public ResponseEntity<List<ContractBonusDto>> findAll(
            @Parameter(description = "Identifiant du contrat") @PathVariable Long contractId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(contractBonusService.findAllByContract(contractId, currentUser));
    }

    @Operation(summary = "Ajouter une prime")
    @ApiResponse(responseCode = "201", description = "Prime créée",
        content = @Content(schema = @Schema(implementation = ContractBonusDto.class)))
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Contrat introuvable")
    @PostMapping
    public ResponseEntity<ContractBonusDto> create(
            @Parameter(description = "Identifiant du contrat") @PathVariable Long contractId,
            @Valid @RequestBody CreateContractBonusRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(contractBonusService.create(contractId, request, currentUser));
    }

    @Operation(summary = "Modifier une prime")
    @ApiResponse(responseCode = "200", description = "Prime modifiée",
        content = @Content(schema = @Schema(implementation = ContractBonusDto.class)))
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Prime introuvable")
    @PutMapping("/{bonusId}")
    public ResponseEntity<ContractBonusDto> update(
            @Parameter(description = "Identifiant du contrat") @PathVariable Long contractId,
            @Parameter(description = "Identifiant de la prime") @PathVariable Long bonusId,
            @Valid @RequestBody UpdateContractBonusRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(contractBonusService.update(contractId, bonusId, request, currentUser));
    }

    @Operation(summary = "Supprimer une prime")
    @ApiResponse(responseCode = "204", description = "Prime supprimée")
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Prime introuvable")
    @DeleteMapping("/{bonusId}")
    public ResponseEntity<Void> delete(
            @Parameter(description = "Identifiant du contrat") @PathVariable Long contractId,
            @Parameter(description = "Identifiant de la prime") @PathVariable Long bonusId,
            @AuthenticationPrincipal User currentUser) {
        contractBonusService.delete(contractId, bonusId, currentUser);
        return ResponseEntity.noContent().build();
    }
}
