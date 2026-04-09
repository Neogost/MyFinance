package com.myfinance.controller;

import com.myfinance.domain.User;
import com.myfinance.dto.ContractBenefitDto;
import com.myfinance.dto.CreateContractBenefitRequest;
import com.myfinance.dto.UpdateContractBenefitRequest;
import com.myfinance.service.ContractBenefitService;
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
@RequestMapping("/api/salary-contracts/{contractId}/benefits")
@RequiredArgsConstructor
@Tag(name = "Avantages en nature", description = "Gestion des avantages en nature rattachés à un contrat salarial")
public class ContractBenefitController {

    private final ContractBenefitService contractBenefitService;

    @Operation(summary = "Lister les avantages en nature d'un contrat")
    @ApiResponse(responseCode = "200", description = "Liste des avantages",
        content = @Content(array = @ArraySchema(schema = @Schema(implementation = ContractBenefitDto.class))))
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Contrat introuvable")
    @GetMapping
    public ResponseEntity<List<ContractBenefitDto>> findAll(
            @Parameter(description = "Identifiant du contrat") @PathVariable Long contractId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(contractBenefitService.findAllByContract(contractId, currentUser));
    }

    @Operation(summary = "Ajouter un avantage en nature")
    @ApiResponse(responseCode = "201", description = "Avantage créé",
        content = @Content(schema = @Schema(implementation = ContractBenefitDto.class)))
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Contrat introuvable")
    @PostMapping
    public ResponseEntity<ContractBenefitDto> create(
            @Parameter(description = "Identifiant du contrat") @PathVariable Long contractId,
            @Valid @RequestBody CreateContractBenefitRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(contractBenefitService.create(contractId, request, currentUser));
    }

    @Operation(summary = "Modifier un avantage en nature")
    @ApiResponse(responseCode = "200", description = "Avantage modifié",
        content = @Content(schema = @Schema(implementation = ContractBenefitDto.class)))
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Avantage introuvable")
    @PutMapping("/{benefitId}")
    public ResponseEntity<ContractBenefitDto> update(
            @Parameter(description = "Identifiant du contrat") @PathVariable Long contractId,
            @Parameter(description = "Identifiant de l'avantage") @PathVariable Long benefitId,
            @Valid @RequestBody UpdateContractBenefitRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(contractBenefitService.update(contractId, benefitId, request, currentUser));
    }

    @Operation(summary = "Supprimer un avantage en nature")
    @ApiResponse(responseCode = "204", description = "Avantage supprimé")
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Avantage introuvable")
    @DeleteMapping("/{benefitId}")
    public ResponseEntity<Void> delete(
            @Parameter(description = "Identifiant du contrat") @PathVariable Long contractId,
            @Parameter(description = "Identifiant de l'avantage") @PathVariable Long benefitId,
            @AuthenticationPrincipal User currentUser) {
        contractBenefitService.delete(contractId, benefitId, currentUser);
        return ResponseEntity.noContent().build();
    }
}
