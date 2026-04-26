package com.myfinance.controller;

import com.myfinance.domain.User;
import com.myfinance.dto.TaxSimulationDto;
import com.myfinance.service.TaxSimulatorService;
import com.myfinance.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/tax-simulator")
@RequiredArgsConstructor
@Tag(name = "Simulateur des impôts", description = "Estimation de l'IRPP à partir des revenus saisis")
public class TaxSimulatorController {

    private final TaxSimulatorService taxSimulatorService;
    private final UserService userService;

    @Operation(summary = "Simuler son impôt sur le revenu")
    @ApiResponse(responseCode = "200", description = "Simulation calculée",
        content = @Content(schema = @Schema(implementation = TaxSimulationDto.class)))
    @ApiResponse(responseCode = "400", description = "Paramètres invalides ou données manquantes")
    @GetMapping
    public ResponseEntity<TaxSimulationDto> simulate(
            @AuthenticationPrincipal User currentUser,
            @Parameter(description = "Année fiscale (défaut : année en cours)")
            @RequestParam(required = false) Integer year,
            @Parameter(description = "Source des revenus salariaux : PROJECTION_CONTRAT ou BULLETINS_REELS")
            @RequestParam(required = false, defaultValue = TaxSimulatorService.SOURCE_PROJECTION) String salarySource,
            @Parameter(description = "IDs des revenus complémentaires à inclure (absent ou vide = aucun revenu complémentaire)")
            @RequestParam(required = false) List<Long> includedIncomes) {

        User freshUser = userService.findEntityById(currentUser.getId());
        int annee = year != null ? year : LocalDate.now().getYear();
        TaxSimulationDto result = taxSimulatorService.simulate(freshUser, annee, salarySource, includedIncomes);
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "Simuler l'impôt d'un autre utilisateur (Admin uniquement)")
    @ApiResponse(responseCode = "200", description = "Simulation calculée",
        content = @Content(schema = @Schema(implementation = TaxSimulationDto.class)))
    @ApiResponse(responseCode = "400", description = "Paramètres invalides ou données manquantes")
    @ApiResponse(responseCode = "404", description = "Utilisateur introuvable")
    @GetMapping("/users/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TaxSimulationDto> simulateForUser(
            @Parameter(description = "Identifiant de l'utilisateur cible") @PathVariable Long userId,
            @Parameter(description = "Année fiscale (défaut : année en cours)")
            @RequestParam(required = false) Integer year,
            @Parameter(description = "Source des revenus salariaux : PROJECTION_CONTRAT ou BULLETINS_REELS")
            @RequestParam(required = false, defaultValue = TaxSimulatorService.SOURCE_PROJECTION) String salarySource,
            @Parameter(description = "IDs des revenus complémentaires à inclure (absent ou vide = aucun revenu complémentaire)")
            @RequestParam(required = false) List<Long> includedIncomes) {

        User targetUser = userService.findEntityById(userId);
        int annee = year != null ? year : LocalDate.now().getYear();
        TaxSimulationDto result = taxSimulatorService.simulate(targetUser, annee, salarySource, includedIncomes);
        return ResponseEntity.ok(result);
    }
}
