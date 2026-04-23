package com.myfinance.controller;

import com.myfinance.domain.User;
import com.myfinance.dto.PatrimoineScoreDto;
import com.myfinance.service.PatrimoineScoreService;
import io.swagger.v3.oas.annotations.Operation;
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

@RestController
@RequestMapping("/api/patrimoine/score")
@RequiredArgsConstructor
@Tag(name = "Scoring patrimonial", description = "Score de cohérence et solidité du patrimoine")
public class PatrimoineScoreController {

    private final PatrimoineScoreService patrimoineScoreService;

    @Operation(summary = "Calculer le score patrimonial de l'utilisateur connecté")
    @ApiResponse(responseCode = "200", description = "Score calculé avec détail par axe",
            content = @Content(schema = @Schema(implementation = PatrimoineScoreDto.class)))
    @GetMapping
    public ResponseEntity<PatrimoineScoreDto> getScore(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(patrimoineScoreService.computeScore(currentUser));
    }
}
