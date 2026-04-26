package com.myfinance.controller;

import com.myfinance.domain.User;
import com.myfinance.service.PatrimoineTargetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/patrimoine/targets")
@RequiredArgsConstructor
@Validated
@Tag(name = "Stratégie patrimoniale", description = "Objectifs cibles par catégorie d'actif")
public class PatrimoineTargetController {

    private final PatrimoineTargetService patrimoineTargetService;

    @Operation(summary = "Récupérer les objectifs patrimoniaux de l'utilisateur connecté")
    @ApiResponse(responseCode = "200", description = "Map catégorie → montant cible en EUR")
    @GetMapping
    public ResponseEntity<Map<String, Double>> getTargets(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(patrimoineTargetService.getTargets(currentUser));
    }

    @Operation(summary = "Enregistrer les objectifs patrimoniaux (remplacement complet)")
    @ApiResponse(responseCode = "200", description = "Map mise à jour")
    @PutMapping
    public ResponseEntity<Map<String, Double>> saveTargets(
            @Size(max = 20, message = "Au maximum 20 catégories d'objectifs autorisées")
            @Valid
            @RequestBody
            Map<
                @Size(max = 50, message = "Nom de catégorie limité à 50 caractères") String,
                @PositiveOrZero @DecimalMax(value = "1000000000", message = "Montant limité à 1 milliard €") Double
            > targets,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(patrimoineTargetService.saveTargets(currentUser, targets));
    }
}
