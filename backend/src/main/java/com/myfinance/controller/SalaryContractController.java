package com.myfinance.controller;

import com.myfinance.domain.User;
import com.myfinance.dto.CreateSalaryContractRequest;
import com.myfinance.dto.SalaryContractDto;
import com.myfinance.dto.UpdateSalaryContractRequest;
import com.myfinance.service.PointValueService;
import com.myfinance.service.SalaryContractService;
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

import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/salary-contracts")
@RequiredArgsConstructor
@Tag(name = "Contrats salariaux", description = "Gestion des contrats de travail et projections salariales")
public class SalaryContractController {

    private final SalaryContractService salaryContractService;
    private final PointValueService     pointValueService;

    @Operation(summary = "Lister mes contrats salariaux")
    @ApiResponse(responseCode = "200", description = "Liste des contrats",
        content = @Content(array = @ArraySchema(schema = @Schema(implementation = SalaryContractDto.class))))
    @GetMapping
    public ResponseEntity<List<SalaryContractDto>> findAll(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(salaryContractService.findAllByUser(currentUser));
    }

    @Operation(summary = "Détail d'un contrat avec projections calculées")
    @ApiResponse(responseCode = "200", description = "Contrat trouvé",
        content = @Content(schema = @Schema(implementation = SalaryContractDto.class)))
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Contrat introuvable")
    @GetMapping("/{id}")
    public ResponseEntity<SalaryContractDto> findById(
            @Parameter(description = "Identifiant du contrat") @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(salaryContractService.findById(id, currentUser));
    }

    @Operation(summary = "Créer un contrat salarial")
    @ApiResponse(responseCode = "201", description = "Contrat créé",
        content = @Content(schema = @Schema(implementation = SalaryContractDto.class)))
    @ApiResponse(responseCode = "409", description = "Un contrat actif existe déjà")
    @PostMapping
    public ResponseEntity<SalaryContractDto> create(
            @Valid @RequestBody CreateSalaryContractRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(salaryContractService.create(request, currentUser));
    }

    @Operation(summary = "Modifier un contrat salarial")
    @ApiResponse(responseCode = "200", description = "Contrat modifié",
        content = @Content(schema = @Schema(implementation = SalaryContractDto.class)))
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Contrat introuvable")
    @ApiResponse(responseCode = "409", description = "Conflit sur le contrat actif")
    @PutMapping("/{id}")
    public ResponseEntity<SalaryContractDto> update(
            @Parameter(description = "Identifiant du contrat") @PathVariable Long id,
            @Valid @RequestBody UpdateSalaryContractRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(salaryContractService.update(id, request, currentUser));
    }

    @Operation(summary = "Supprimer un contrat salarial")
    @ApiResponse(responseCode = "204", description = "Contrat supprimé")
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Contrat introuvable")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @Parameter(description = "Identifiant du contrat") @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        salaryContractService.delete(id, currentUser);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Valeur du point d'indice de la fonction publique à une date donnée")
    @ApiResponse(responseCode = "200", description = "Valeur du point retournée")
    @GetMapping("/public/point-value")
    public ResponseEntity<Map<String, Double>> getPointValue(
            @Parameter(description = "Date de référence (YYYY-MM-DD)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate ref = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(Map.of("pointValue", pointValueService.getAnnualValueAt(ref)));
    }
}
