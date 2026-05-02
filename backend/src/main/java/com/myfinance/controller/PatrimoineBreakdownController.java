package com.myfinance.controller;

import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.BreakdownDimension;
import com.myfinance.domain.User;
import com.myfinance.dto.PortfolioBreakdownDto;
import com.myfinance.service.PatrimoineBreakdownService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/patrimoine/breakdown")
@RequiredArgsConstructor
@Tag(name = "Stratégie patrimoniale", description = "Répartition réelle du portefeuille pour les vues de diversification")
public class PatrimoineBreakdownController {

    private final PatrimoineBreakdownService patrimoineBreakdownService;

    @Operation(summary = "Répartition réelle des positions par dimension")
    @ApiResponse(responseCode = "200", description = "Ventilation par bucket + ratio de couverture")
    @ApiResponse(responseCode = "400", description = "Dimension inconnue ou catégorie incompatible")
    @GetMapping("/{dimension}")
    public ResponseEntity<PortfolioBreakdownDto> getBreakdown(
            @Parameter(description = "Dimension : sector | country | continent | currency | asset-subtype | crypto-type | crypto-network | property-usage | instrument")
            @PathVariable String dimension,
            @Parameter(description = "Catégorie : BOURSE (défaut) ou CRYPTO — utile pour la dimension currency")
            @RequestParam(required = false) AssetCategory category,
            @AuthenticationPrincipal User currentUser) {
        BreakdownDimension dim = parseDimension(dimension);
        return ResponseEntity.ok(patrimoineBreakdownService.getBreakdown(currentUser, dim, category));
    }

    private static BreakdownDimension parseDimension(String raw) {
        try {
            return BreakdownDimension.valueOf(raw.toUpperCase().replace('-', '_'));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Dimension inconnue : " + raw + " (attendu : sector | country | continent | currency | asset-subtype | crypto-type | crypto-network | property-usage | instrument)");
        }
    }
}
