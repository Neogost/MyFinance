package com.myfinance.controller;

import com.myfinance.domain.User;
import com.myfinance.dto.PatrimoineTargetsDto;
import com.myfinance.dto.SaveTargetsRequest;
import com.myfinance.service.PatrimoineTargetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/patrimoine/targets")
@RequiredArgsConstructor
@Validated
@Tag(name = "Stratégie patrimoniale", description = "Objectifs cibles par catégorie d'actif et sous-objectifs de répartition")
public class PatrimoineTargetController {

    private final PatrimoineTargetService patrimoineTargetService;

    @Operation(summary = "Récupérer les objectifs patrimoniaux de l'utilisateur connecté")
    @ApiResponse(responseCode = "200", description = "Objectifs et sous-objectifs (par catégorie)")
    @GetMapping
    public ResponseEntity<PatrimoineTargetsDto> getTargets(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(patrimoineTargetService.getTargets(currentUser));
    }

    @Operation(summary = "Enregistrer les objectifs patrimoniaux (remplacement complet)")
    @ApiResponse(responseCode = "200", description = "Objectifs et sous-objectifs mis à jour")
    @ApiResponse(responseCode = "400", description = "Validation échouée (somme > 100, dimension non autorisée, …)")
    @PutMapping
    public ResponseEntity<PatrimoineTargetsDto> saveTargets(
            @Valid @RequestBody SaveTargetsRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(patrimoineTargetService.saveTargets(currentUser, request));
    }
}
