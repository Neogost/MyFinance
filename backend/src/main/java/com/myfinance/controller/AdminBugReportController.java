package com.myfinance.controller;

import com.myfinance.domain.BugSeverity;
import com.myfinance.domain.BugStatus;
import com.myfinance.dto.BugReportAdminDetailDto;
import com.myfinance.dto.BugReportAdminSummaryDto;
import com.myfinance.dto.LogExcerptDto;
import com.myfinance.dto.PatchBugReportRequest;
import com.myfinance.dto.UpdateBugReportAdminRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import com.myfinance.service.BugReportService;
import com.myfinance.service.LogExcerptService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/bug-reports")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Validated
@Tag(name = "Admin — Signalement de bugs", description = "Triage et suivi admin des bugs signalés")
public class AdminBugReportController {

    private final BugReportService   bugReportService;
    private final LogExcerptService  logExcerptService;

    @Operation(summary = "Liste complète des bugs avec infos admin")
    @ApiResponse(responseCode = "200",
        content = @Content(array = @ArraySchema(schema = @Schema(implementation = BugReportAdminSummaryDto.class))))
    @GetMapping
    public ResponseEntity<List<BugReportAdminSummaryDto>> findAll(
            @Parameter(description = "Filtre sur le statut")
            @RequestParam(required = false) BugStatus status,
            @Parameter(description = "Filtre sur la priorité")
            @RequestParam(required = false) BugSeverity priority) {
        return ResponseEntity.ok(bugReportService.findAllAdmin(status, priority));
    }

    @Operation(summary = "Détail admin d'un bug (login + rôle des commentateurs)")
    @ApiResponse(responseCode = "200", content = @Content(schema = @Schema(implementation = BugReportAdminDetailDto.class)))
    @ApiResponse(responseCode = "404", description = "Bug introuvable")
    @GetMapping("/{id}")
    public ResponseEntity<BugReportAdminDetailDto> findById(@PathVariable Long id) {
        return ResponseEntity.ok(bugReportService.findByIdAdmin(id));
    }

    @Operation(summary = "Modifier le contenu d'un bug (titre, description, impact…)")
    @ApiResponse(responseCode = "200", content = @Content(schema = @Schema(implementation = BugReportAdminDetailDto.class)))
    @ApiResponse(responseCode = "404", description = "Bug introuvable")
    @PutMapping("/{id}")
    public ResponseEntity<BugReportAdminDetailDto> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateBugReportAdminRequest request) {
        return ResponseEntity.ok(bugReportService.adminUpdate(id, request));
    }

    @Operation(summary = "Modifier le statut et/ou la priorité d'un bug")
    @ApiResponse(responseCode = "200", content = @Content(schema = @Schema(implementation = BugReportAdminDetailDto.class)))
    @ApiResponse(responseCode = "400", description = "Aucun champ fourni")
    @ApiResponse(responseCode = "404", description = "Bug introuvable")
    @PatchMapping("/{id}")
    public ResponseEntity<BugReportAdminDetailDto> patch(
            @PathVariable Long id,
            @RequestBody PatchBugReportRequest request) {
        return ResponseEntity.ok(bugReportService.patch(id, request));
    }

    @Operation(summary = "Supprimer un bug (cascade votes et commentaires)")
    @ApiResponse(responseCode = "204", description = "Bug supprimé")
    @ApiResponse(responseCode = "404", description = "Bug introuvable")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        bugReportService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Extraire les lignes de log autour de l'heure du bug (±window minutes)")
    @ApiResponse(responseCode = "200", content = @Content(schema = @Schema(implementation = LogExcerptDto.class)))
    @ApiResponse(responseCode = "404", description = "Bug introuvable")
    @GetMapping("/{id}/logs")
    public ResponseEntity<LogExcerptDto> extractLogs(
            @PathVariable Long id,
            @Parameter(description = "Fenêtre temporelle en minutes (1 à 60, défaut : 1)")
            @RequestParam(defaultValue = "1") @Min(1) @Max(60) int window) {
        return ResponseEntity.ok(logExcerptService.extract(id, window));
    }
}
