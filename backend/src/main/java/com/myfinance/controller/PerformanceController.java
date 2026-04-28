package com.myfinance.controller;

import com.myfinance.domain.User;
import com.myfinance.dto.PerformanceDto;
import com.myfinance.dto.PositionPerformanceDto;
import com.myfinance.service.PerformanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Performance patrimoniale (TWR / MWR).
 *
 * Restreint au rôle ADMIN tant que la fonctionnalité est en travaux.
 * Voir {@code docs/architecture/patrimoine-performance.md} pour les limites assumées.
 */
@RestController
@RequestMapping("/api/patrimoine/performance")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Performance patrimoniale", description = "TWR et MWR du patrimoine financier (ADMIN — en travaux)")
public class PerformanceController {

    private final PerformanceService performanceService;

    @Operation(summary = "Performance globale (toutes catégories éligibles)")
    @ApiResponse(responseCode = "200", description = "Performance calculée",
            content = @Content(schema = @Schema(implementation = PerformanceDto.class)))
    @GetMapping
    public ResponseEntity<PerformanceDto> getGlobal(
            @AuthenticationPrincipal User currentUser,
            @Parameter(description = "Date de début (YYYY-MM-DD)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @Parameter(description = "Date de fin (YYYY-MM-DD)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @Parameter(description = "Rendement de référence en % (ex. 8.0 pour 8 %/an)")
            @RequestParam(required = false) Double benchmarkRate) {
        return ResponseEntity.ok(performanceService.computeGlobal(currentUser, from, to, benchmarkRate));
    }

    @Operation(summary = "Performance par position (triée par TWR décroissant)")
    @ApiResponse(responseCode = "200", description = "Liste des positions avec leur performance")
    @GetMapping("/positions")
    public ResponseEntity<List<PositionPerformanceDto>> getPositions(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(performanceService.computePositions(currentUser, from, to));
    }

    @Operation(summary = "Performance d'une position individuelle")
    @ApiResponse(responseCode = "200", description = "Performance calculée")
    @ApiResponse(responseCode = "400", description = "Catégorie non éligible")
    @ApiResponse(responseCode = "403", description = "Position appartenant à un autre utilisateur")
    @ApiResponse(responseCode = "404", description = "Position introuvable")
    @GetMapping("/positions/{id}")
    public ResponseEntity<PositionPerformanceDto> getPosition(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(performanceService.computePosition(id, currentUser, from, to));
    }
}
