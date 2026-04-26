package com.myfinance.controller;

import com.myfinance.config.BaremeKilometriqueProperties;
import com.myfinance.dto.BaremeKilometriqueDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/fiscal")
@RequiredArgsConstructor
@Tag(name = "Référentiel fiscal", description = "Barèmes et paramètres fiscaux publics")
public class FiscalReferentielController {

    private final BaremeKilometriqueProperties baremeKilometriqueProperties;

    @Operation(summary = "Barème kilométrique fiscal (voitures)")
    @GetMapping("/bareme-kilometrique")
    public ResponseEntity<BaremeKilometriqueDto> getBaremeKilometrique() {
        return ResponseEntity.ok(BaremeKilometriqueDto.from(baremeKilometriqueProperties));
    }
}
