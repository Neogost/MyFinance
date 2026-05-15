package com.myfinance.controller;

import com.myfinance.domain.User;
import com.myfinance.dto.ConfirmCryptoHistoryRequest;
import com.myfinance.dto.CryptoCessionDto;
import com.myfinance.dto.CryptoTaxStateDto;
import com.myfinance.dto.CryptoTaxSummaryDto;
import com.myfinance.service.CryptoTaxService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/crypto-tax")
@RequiredArgsConstructor
@Validated
@Tag(name = "Fiscalité crypto", description = "Calcul des plus-values et export 2086 (article 150 VH bis CGI)")
public class CryptoTaxController {

    private final CryptoTaxService cryptoTaxService;

    @Operation(summary = "État courant (PTA, valorisation portefeuille, historique confirmé)")
    @ApiResponse(responseCode = "200", content = @Content(schema = @Schema(implementation = CryptoTaxStateDto.class)))
    @GetMapping("/state")
    public ResponseEntity<CryptoTaxStateDto> getState(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(cryptoTaxService.getState(currentUser));
    }

    @Operation(summary = "Synthèse fiscale annuelle (PTA, cessions, plus-value nette, impôt estimé)")
    @ApiResponse(responseCode = "200", content = @Content(schema = @Schema(implementation = CryptoTaxSummaryDto.class)))
    @GetMapping("/summary")
    public ResponseEntity<CryptoTaxSummaryDto> getSummary(
            @Parameter(description = "Année fiscale (défaut : année en cours)")
            @RequestParam(defaultValue = "#{T(java.time.LocalDate).now().getYear()}")
            @Min(1900) @Max(2200) int year,
            @Parameter(description = "Option d'imposition : PFU (défaut) ou BAREME")
            @RequestParam(defaultValue = "PFU")
            @Pattern(regexp = "^(PFU|BAREME)$", message = "taxOption doit être PFU ou BAREME")
            String taxOption,
            @Parameter(description = "TMI en % pour l'option BAREME (ex : 30.0)")
            @RequestParam(required = false)
            @DecimalMin("0") @DecimalMax("100") Float tmi,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(cryptoTaxService.getSummary(currentUser, year, taxOption, tmi));
    }

    @Operation(summary = "Détail des cessions de l'année (format 2086 — une ligne par cession)")
    @ApiResponse(responseCode = "200", content = @Content(
            array = @ArraySchema(schema = @Schema(implementation = CryptoCessionDto.class))))
    @GetMapping("/cessions")
    public ResponseEntity<List<CryptoCessionDto>> getCessions(
            @Parameter(description = "Année fiscale (défaut : année en cours)")
            @RequestParam(defaultValue = "#{T(java.time.LocalDate).now().getYear()}")
            @Min(1900) @Max(2200) int year,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(cryptoTaxService.getCessions(currentUser, year));
    }

    @Operation(summary = "Export CSV du formulaire 2086")
    @ApiResponse(responseCode = "200", description = "Fichier CSV à recopier dans la 2086")
    @GetMapping("/form-2086.csv")
    public ResponseEntity<String> exportCsv(
            @Parameter(description = "Année fiscale (défaut : année en cours)")
            @RequestParam(defaultValue = "#{T(java.time.LocalDate).now().getYear()}")
            @Min(1900) @Max(2200) int year,
            @AuthenticationPrincipal User currentUser) {
        String csv = cryptoTaxService.exportCsv(currentUser, year);
        String filename = "fiscalite-crypto-2086-" + year + ".csv";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csv);
    }

    @Operation(summary = "Confirmer (ou infirmer) la complétude de l'historique crypto")
    @ApiResponse(responseCode = "204", description = "Confirmation enregistrée")
    @PutMapping("/historical-data-confirmation")
    public ResponseEntity<Void> confirmHistoricalData(
            @Valid @RequestBody ConfirmCryptoHistoryRequest request,
            @AuthenticationPrincipal User currentUser) {
        cryptoTaxService.confirmHistoricalData(currentUser, request);
        return ResponseEntity.noContent().build();
    }
}
