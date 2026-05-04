package com.myfinance.controller;

import com.myfinance.domain.User;
import com.myfinance.dto.PerformanceDto;
import com.myfinance.service.PerformanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/patrimoine/performance")
@RequiredArgsConstructor
@Tag(name = "Performance patrimoniale", description = "TWR + MWR — ADMIN uniquement, en cours de validation")
public class PerformanceController {

    private final PerformanceService performanceService;

    @Operation(summary = "Performance globale du patrimoine (TWR + MWR)",
            description = "Calcul depuis le premier ordre jusqu'à aujourd'hui. ADMIN uniquement.")
    @ApiResponse(responseCode = "200", description = "Performance calculée",
            content = @Content(schema = @Schema(implementation = PerformanceDto.class)))
    @ApiResponse(responseCode = "401", description = "Non authentifié")
    @ApiResponse(responseCode = "403", description = "Rôle ADMIN requis")
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PerformanceDto> getGlobalPerformance(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(performanceService.computeGlobal(currentUser));
    }
}
