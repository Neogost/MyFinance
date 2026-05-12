package com.myfinance.controller;

import com.myfinance.domain.User;
import com.myfinance.dto.CtoCessionsSummaryDto;
import com.myfinance.dto.CryptoCessionDto;
import com.myfinance.dto.TaxLossSummaryDto;
import com.myfinance.service.CryptoTaxService;
import com.myfinance.service.TaxLossHarvestingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/tax-loss-harvesting")
@RequiredArgsConstructor
@Tag(name = "Optimisation fiscale", description = "Tax-loss harvesting — détection des positions en moins-value compensables")
public class TaxLossHarvestingController {

    private final TaxLossHarvestingService taxLossHarvestingService;
    private final CryptoTaxService cryptoTaxService;

    @Operation(summary = "Synthèse tax-loss harvesting",
            description = "Calcule les plus-values réalisées de l'année et les positions candidates à la vente pour réduire l'imposition au PFU (30 %).")
    @ApiResponse(responseCode = "200", description = "Synthèse CTO + CRYPTO",
            content = @Content(schema = @Schema(implementation = TaxLossSummaryDto.class)))
    @GetMapping
    public ResponseEntity<TaxLossSummaryDto> getSummary(
            @Parameter(description = "Année fiscale (défaut : année courante)")
            @RequestParam(required = false) Integer year,
            @Parameter(description = "Option fiscale : PFU (défaut) ou BAREME")
            @RequestParam(required = false, defaultValue = "PFU") String taxOption,
            @Parameter(description = "Tranche marginale d'imposition en % (ex. 30). Requis si taxOption=BAREME.")
            @RequestParam(required = false) Float tmi,
            @Parameter(description = "Moins-values CTO reportées des années précédentes (€)")
            @RequestParam(required = false) java.math.BigDecimal mvReporteesCto,
            @Parameter(description = "Moins-values CRYPTO reportées des années précédentes (€)")
            @RequestParam(required = false) java.math.BigDecimal mvReporteesCrypto,
            @AuthenticationPrincipal User currentUser) {
        int targetYear = year != null ? year : LocalDate.now().getYear();
        return ResponseEntity.ok(taxLossHarvestingService.computeSummary(
                currentUser, targetYear, taxOption, tmi, mvReporteesCto, mvReporteesCrypto));
    }

    @Operation(summary = "Cessions CRYPTO de l'année",
            description = "Liste les cessions crypto (SELL_FIAT) avec PTA et PV/MV par opération, pour le récapitulatif fiscal.")
    @ApiResponse(responseCode = "200", description = "Liste des cessions crypto")
    @GetMapping("/cessions/crypto")
    public ResponseEntity<List<CryptoCessionDto>> getCryptoCessions(
            @Parameter(description = "Année fiscale (défaut : année courante)")
            @RequestParam(required = false) Integer year,
            @AuthenticationPrincipal User currentUser) {
        int targetYear = year != null ? year : LocalDate.now().getYear();
        return ResponseEntity.ok(cryptoTaxService.getCessions(currentUser, targetYear));
    }

    @Operation(summary = "Récapitulatif des cessions CTO",
            description = "Liste toutes les ventes BOURSE/CTO de l'année avec coût d'acquisition (CMP), plus/moins-value et cumul. Indique les cases 3VG et 3VH de la déclaration 2042C.")
    @ApiResponse(responseCode = "200", description = "Récapitulatif des cessions",
            content = @Content(schema = @Schema(implementation = CtoCessionsSummaryDto.class)))
    @GetMapping("/cessions")
    public ResponseEntity<CtoCessionsSummaryDto> getCessions(
            @Parameter(description = "Année fiscale (défaut : année courante)")
            @RequestParam(required = false) Integer year,
            @AuthenticationPrincipal User currentUser) {
        int targetYear = year != null ? year : LocalDate.now().getYear();
        return ResponseEntity.ok(taxLossHarvestingService.getCtoCessions(currentUser, targetYear));
    }

    @Operation(summary = "Export CSV des cessions CTO (déclaration 2042C)")
    @ApiResponse(responseCode = "200", description = "Fichier CSV prêt à utiliser pour la déclaration")
    @GetMapping("/cessions.csv")
    public ResponseEntity<String> exportCessionsCsv(
            @Parameter(description = "Année fiscale (défaut : année courante)")
            @RequestParam(required = false) Integer year,
            @AuthenticationPrincipal User currentUser) {
        int targetYear = year != null ? year : LocalDate.now().getYear();
        String csv = taxLossHarvestingService.exportCtoCessionsCsv(currentUser, targetYear);
        String filename = "cessions-cto-" + targetYear + ".csv";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csv);
    }
}
