package com.myfinance.controller;

import com.myfinance.domain.RegistrationStatus;
import com.myfinance.domain.User;
import com.myfinance.dto.CreateRegistrationRequest;
import com.myfinance.dto.RegistrationRequestDto;
import com.myfinance.service.UserRegistrationService;
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
@RequiredArgsConstructor
@Tag(name = "Inscriptions", description = "Demandes de création de compte et validation admin")
public class UserRegistrationController {

    private final UserRegistrationService registrationService;

    @Operation(summary = "Soumettre une demande de création de compte (public)")
    @ApiResponse(responseCode = "201", description = "Demande enregistrée",
            content = @Content(schema = @Schema(implementation = RegistrationRequestDto.class)))
    @ApiResponse(responseCode = "409", description = "Login déjà utilisé ou demande PENDING existante")
    @PostMapping("/api/auth/register")
    public ResponseEntity<RegistrationRequestDto> register(
            @Valid @RequestBody CreateRegistrationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(registrationService.create(request));
    }

    @Operation(summary = "Lister les demandes d'inscription (admin)")
    @ApiResponse(responseCode = "200", description = "Liste des demandes",
            content = @Content(array = @ArraySchema(schema = @Schema(implementation = RegistrationRequestDto.class))))
    @GetMapping("/api/admin/registrations")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<RegistrationRequestDto>> findAll(
            @Parameter(description = "Filtrer par statut") @RequestParam(required = false) RegistrationStatus status) {
        return ResponseEntity.ok(registrationService.findAll(status));
    }

    @Operation(summary = "Approuver une demande et créer le compte (admin)")
    @ApiResponse(responseCode = "200", description = "Demande approuvée, compte créé",
            content = @Content(schema = @Schema(implementation = RegistrationRequestDto.class)))
    @ApiResponse(responseCode = "404", description = "Demande introuvable")
    @ApiResponse(responseCode = "409", description = "Demande déjà traitée")
    @PostMapping("/api/admin/registrations/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RegistrationRequestDto> approve(
            @Parameter(description = "Identifiant de la demande") @PathVariable Long id,
            @AuthenticationPrincipal User admin) {
        return ResponseEntity.ok(registrationService.approve(id, admin.getLogin()));
    }

    @Operation(summary = "Rejeter une demande (admin)")
    @ApiResponse(responseCode = "200", description = "Demande rejetée",
            content = @Content(schema = @Schema(implementation = RegistrationRequestDto.class)))
    @ApiResponse(responseCode = "404", description = "Demande introuvable")
    @ApiResponse(responseCode = "409", description = "Demande déjà traitée")
    @PostMapping("/api/admin/registrations/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RegistrationRequestDto> reject(
            @Parameter(description = "Identifiant de la demande") @PathVariable Long id,
            @AuthenticationPrincipal User admin) {
        return ResponseEntity.ok(registrationService.reject(id, admin.getLogin()));
    }
}
