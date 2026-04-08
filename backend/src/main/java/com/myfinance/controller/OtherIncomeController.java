package com.myfinance.controller;

import com.myfinance.domain.User;
import com.myfinance.dto.CreateOtherIncomeRequest;
import com.myfinance.dto.OtherIncomeDto;
import com.myfinance.dto.UpdateOtherIncomeRequest;
import com.myfinance.service.OtherIncomeService;
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
@RequestMapping("/api/other-incomes")
@RequiredArgsConstructor
@Tag(name = "Revenus complémentaires", description = "Revenus non salariés (locatif, dividendes, aides…)")
public class OtherIncomeController {

    private final OtherIncomeService otherIncomeService;

    @Operation(summary = "Lister mes revenus complémentaires")
    @ApiResponse(responseCode = "200", description = "Liste des revenus",
        content = @Content(array = @ArraySchema(schema = @Schema(implementation = OtherIncomeDto.class))))
    @GetMapping
    public ResponseEntity<List<OtherIncomeDto>> findAll(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(otherIncomeService.findAllByUser(currentUser));
    }

    @Operation(summary = "Ajouter un revenu complémentaire")
    @ApiResponse(responseCode = "201", description = "Revenu créé",
        content = @Content(schema = @Schema(implementation = OtherIncomeDto.class)))
    @PostMapping
    public ResponseEntity<OtherIncomeDto> create(
            @Valid @RequestBody CreateOtherIncomeRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(otherIncomeService.create(request, currentUser));
    }

    @Operation(summary = "Modifier un revenu complémentaire")
    @ApiResponse(responseCode = "200", description = "Revenu modifié",
        content = @Content(schema = @Schema(implementation = OtherIncomeDto.class)))
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Revenu introuvable")
    @PutMapping("/{id}")
    public ResponseEntity<OtherIncomeDto> update(
            @Parameter(description = "Identifiant du revenu") @PathVariable Long id,
            @Valid @RequestBody UpdateOtherIncomeRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(otherIncomeService.update(id, request, currentUser));
    }

    @Operation(summary = "Supprimer un revenu complémentaire")
    @ApiResponse(responseCode = "204", description = "Revenu supprimé")
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Revenu introuvable")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @Parameter(description = "Identifiant du revenu") @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        otherIncomeService.delete(id, currentUser);
        return ResponseEntity.noContent().build();
    }
}
