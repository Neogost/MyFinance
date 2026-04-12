package com.myfinance.controller;

import com.myfinance.domain.User;
import com.myfinance.dto.SalaryEvolutionPointDto;
import com.myfinance.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Tag(name = "Tableau de bord", description = "Données agrégées pour les graphiques du tableau de bord")
public class DashboardController {

    private final DashboardService dashboardService;

    @Operation(summary = "Évolution salariale",
               description = "Retourne tous les bulletins de paie de l'utilisateur, tous contrats confondus, triés chronologiquement.")
    @ApiResponse(responseCode = "200", description = "Liste des points d'évolution salariale",
            content = @Content(array = @ArraySchema(schema = @Schema(implementation = SalaryEvolutionPointDto.class))))
    @GetMapping("/salary-evolution")
    public ResponseEntity<List<SalaryEvolutionPointDto>> getSalaryEvolution(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(dashboardService.getSalaryEvolution(currentUser));
    }
}
