package com.myfinance.controller;

import com.myfinance.domain.User;
import com.myfinance.dto.ContractOnCallDto;
import com.myfinance.dto.CreateContractOnCallRequest;
import com.myfinance.dto.UpdateContractOnCallRequest;
import com.myfinance.service.ContractOnCallService;
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
@RequestMapping("/api/salary-contracts/{contractId}/on-calls")
@RequiredArgsConstructor
@Tag(name = "Astreintes", description = "Gestion des astreintes rattachées à un contrat salarial")
public class ContractOnCallController {

    private final ContractOnCallService contractOnCallService;

    @Operation(summary = "Lister les astreintes d'un contrat")
    @ApiResponse(responseCode = "200", description = "Liste des astreintes",
        content = @Content(array = @ArraySchema(schema = @Schema(implementation = ContractOnCallDto.class))))
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Contrat introuvable")
    @GetMapping
    public ResponseEntity<List<ContractOnCallDto>> findAll(
            @Parameter(description = "Identifiant du contrat") @PathVariable Long contractId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(contractOnCallService.findAllByContract(contractId, currentUser));
    }

    @Operation(summary = "Ajouter une astreinte")
    @ApiResponse(responseCode = "201", description = "Astreinte créée",
        content = @Content(schema = @Schema(implementation = ContractOnCallDto.class)))
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Contrat introuvable")
    @PostMapping
    public ResponseEntity<ContractOnCallDto> create(
            @Parameter(description = "Identifiant du contrat") @PathVariable Long contractId,
            @Valid @RequestBody CreateContractOnCallRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(contractOnCallService.create(contractId, request, currentUser));
    }

    @Operation(summary = "Modifier une astreinte")
    @ApiResponse(responseCode = "200", description = "Astreinte modifiée",
        content = @Content(schema = @Schema(implementation = ContractOnCallDto.class)))
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Astreinte introuvable")
    @PutMapping("/{onCallId}")
    public ResponseEntity<ContractOnCallDto> update(
            @Parameter(description = "Identifiant du contrat") @PathVariable Long contractId,
            @Parameter(description = "Identifiant de l'astreinte") @PathVariable Long onCallId,
            @Valid @RequestBody UpdateContractOnCallRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(contractOnCallService.update(contractId, onCallId, request, currentUser));
    }

    @Operation(summary = "Supprimer une astreinte")
    @ApiResponse(responseCode = "204", description = "Astreinte supprimée")
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Astreinte introuvable")
    @DeleteMapping("/{onCallId}")
    public ResponseEntity<Void> delete(
            @Parameter(description = "Identifiant du contrat") @PathVariable Long contractId,
            @Parameter(description = "Identifiant de l'astreinte") @PathVariable Long onCallId,
            @AuthenticationPrincipal User currentUser) {
        contractOnCallService.delete(contractId, onCallId, currentUser);
        return ResponseEntity.noContent().build();
    }
}
