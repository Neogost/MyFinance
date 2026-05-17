package com.myfinance.controller;

import com.myfinance.domain.User;
import com.myfinance.dto.*;
import com.myfinance.service.UserDashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/dashboards")
@RequiredArgsConstructor
@Tag(name = "Dashboards", description = "Gestion des tableaux de bord multiples")
public class UserDashboardController {

    private final UserDashboardService dashboardService;

    @Operation(summary = "Lister mes dashboards")
    @GetMapping
    public ResponseEntity<List<UserDashboardDto>> list(@AuthenticationPrincipal User user) {
        dashboardService.ensureDefaultDashboard(user);
        return ResponseEntity.ok(dashboardService.listDashboards(user));
    }

    @Operation(summary = "Détail d'un dashboard avec son layout")
    @GetMapping("/{id}")
    public ResponseEntity<UserDashboardWithLayoutDto> get(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(dashboardService.getDashboard(id, user));
    }

    @Operation(summary = "Créer un dashboard (max 5)")
    @PostMapping
    public ResponseEntity<UserDashboardWithLayoutDto> create(
            @Valid @RequestBody CreateDashboardRequest req,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(dashboardService.createDashboard(req, user));
    }

    @Operation(summary = "Renommer / réordonner / définir comme défaut")
    @PutMapping("/{id}")
    public ResponseEntity<UserDashboardDto> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateDashboardRequest req,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(dashboardService.updateDashboard(id, req, user));
    }

    @Operation(summary = "Sauvegarder le layout d'un dashboard")
    @PutMapping("/{id}/layout")
    public ResponseEntity<UserDashboardWithLayoutDto> saveLayout(
            @PathVariable Long id,
            @Valid @RequestBody SaveDashboardLayoutRequest req,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(dashboardService.saveLayout(id, req, user));
    }

    @Operation(summary = "Réordonner tous les dashboards en une requête")
    @PutMapping("/reorder")
    public ResponseEntity<List<UserDashboardDto>> reorder(
            @Valid @RequestBody ReorderDashboardsRequest req,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(dashboardService.reorderDashboards(req, user));
    }

    @Operation(summary = "Supprimer un dashboard (interdit si c'est le seul)")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        dashboardService.deleteDashboard(id, user);
        return ResponseEntity.noContent().build();
    }
}
