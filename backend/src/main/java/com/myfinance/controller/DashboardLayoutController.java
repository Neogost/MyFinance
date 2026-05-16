package com.myfinance.controller;

import com.myfinance.domain.User;
import com.myfinance.dto.DashboardLayoutDto;
import com.myfinance.dto.SaveDashboardLayoutRequest;
import com.myfinance.service.DashboardLayoutService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Tag(name = "Tableau de bord", description = "Données agrégées pour les graphiques du tableau de bord")
public class DashboardLayoutController {

    private final DashboardLayoutService dashboardLayoutService;

    @Operation(summary = "Layout du tableau de bord",
               description = "Retourne le layout personnalisé de l'utilisateur, ou null si jamais sauvegardé (le frontend applique le layout par défaut).")
    @GetMapping("/layout")
    public ResponseEntity<DashboardLayoutDto> getLayout(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(dashboardLayoutService.getLayout(currentUser));
    }

    @Operation(summary = "Sauvegarder le layout",
               description = "Upsert du layout JSON. Retourne le layout persisté avec son updatedAt.")
    @PutMapping("/layout")
    public ResponseEntity<DashboardLayoutDto> saveLayout(
            @Valid @RequestBody SaveDashboardLayoutRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(dashboardLayoutService.saveLayout(request, currentUser));
    }
}
