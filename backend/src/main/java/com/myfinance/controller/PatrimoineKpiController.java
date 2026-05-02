package com.myfinance.controller;

import com.myfinance.domain.KpiType;
import com.myfinance.domain.User;
import com.myfinance.dto.KpiValueDto;
import com.myfinance.dto.SaveKpiTargetsRequest;
import com.myfinance.service.PatrimoineKpiService;
import com.myfinance.service.PatrimoineKpiTargetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/patrimoine/kpi")
@RequiredArgsConstructor
@Tag(name = "Stratégie patrimoniale", description = "Objectifs KPI immobiliers et calcul des valeurs réelles")
public class PatrimoineKpiController {

    private final PatrimoineKpiTargetService kpiTargetService;
    private final PatrimoineKpiService kpiService;

    @Operation(summary = "Récupérer les objectifs KPI de l'utilisateur")
    @ApiResponse(responseCode = "200", description = "Map kpiType → valeur cible (%)")
    @GetMapping("/targets")
    public ResponseEntity<Map<KpiType, Double>> getTargets(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(kpiTargetService.getTargets(currentUser));
    }

    @Operation(summary = "Enregistrer les objectifs KPI (remplacement complet)")
    @PutMapping("/targets")
    public ResponseEntity<Map<KpiType, Double>> saveTargets(
            @Valid @RequestBody SaveKpiTargetsRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(kpiTargetService.saveTargets(currentUser, request));
    }

    @Operation(summary = "Calculer les valeurs KPI réelles (rendements, LTV)")
    @ApiResponse(responseCode = "200", description = "Liste des KPI avec valeur réelle et cible")
    @GetMapping("/values")
    public ResponseEntity<List<KpiValueDto>> getValues(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(kpiService.getKpiValues(currentUser));
    }
}
