package com.myfinance.controller;

import com.myfinance.domain.User;
import com.myfinance.dto.CreateInfoBannerRequest;
import com.myfinance.dto.InfoBannerAdminDto;
import com.myfinance.dto.UpdateInfoBannerRequest;
import com.myfinance.service.InfoBannerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/info-banners")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin — Bannières d'information", description = "Gestion des bannières d'information")
public class AdminInfoBannerController {

    private final InfoBannerService infoBannerService;

    @Operation(summary = "Lister toutes les bannières (actives, programmées, expirées)")
    @ApiResponse(responseCode = "200", description = "Liste triée par startAt décroissant",
        content = @Content(array = @ArraySchema(schema = @Schema(implementation = InfoBannerAdminDto.class))))
    @GetMapping
    public ResponseEntity<List<InfoBannerAdminDto>> findAll() {
        return ResponseEntity.ok(infoBannerService.findAll());
    }

    @Operation(summary = "Détail d'une bannière")
    @ApiResponse(responseCode = "200", description = "Bannière trouvée",
        content = @Content(schema = @Schema(implementation = InfoBannerAdminDto.class)))
    @ApiResponse(responseCode = "404", description = "Bannière introuvable")
    @GetMapping("/{id}")
    public ResponseEntity<InfoBannerAdminDto> findById(
            @Parameter(description = "Identifiant de la bannière") @PathVariable Long id) {
        return ResponseEntity.ok(infoBannerService.findById(id));
    }

    @Operation(summary = "Créer une bannière")
    @ApiResponse(responseCode = "201", description = "Bannière créée",
        content = @Content(schema = @Schema(implementation = InfoBannerAdminDto.class)))
    @ApiResponse(responseCode = "400", description = "Validation échouée (endAt ≤ startAt, message vide…)")
    @PostMapping
    public ResponseEntity<InfoBannerAdminDto> create(
            @Valid @RequestBody CreateInfoBannerRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(infoBannerService.create(request, currentUser));
    }

    @Operation(summary = "Modifier une bannière")
    @ApiResponse(responseCode = "200", description = "Bannière mise à jour",
        content = @Content(schema = @Schema(implementation = InfoBannerAdminDto.class)))
    @ApiResponse(responseCode = "400", description = "Validation échouée")
    @ApiResponse(responseCode = "404", description = "Bannière introuvable")
    @PutMapping("/{id}")
    public ResponseEntity<InfoBannerAdminDto> update(
            @Parameter(description = "Identifiant de la bannière") @PathVariable Long id,
            @Valid @RequestBody UpdateInfoBannerRequest request) {
        return ResponseEntity.ok(infoBannerService.update(id, request));
    }

    @Operation(summary = "Supprimer une bannière")
    @ApiResponse(responseCode = "204", description = "Bannière supprimée")
    @ApiResponse(responseCode = "404", description = "Bannière introuvable")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @Parameter(description = "Identifiant de la bannière") @PathVariable Long id) {
        infoBannerService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
