package com.myfinance.controller;

import com.myfinance.domain.User;
import com.myfinance.dto.UpdateFiscalProfileRequest;
import com.myfinance.dto.UpdatePersonalInfoRequest;
import com.myfinance.dto.UpdateSafetyNetRequest;
import com.myfinance.dto.UserDto;
import com.myfinance.service.ProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
@Tag(name = "Profil", description = "Paramètres personnels de l'utilisateur connecté")
public class ProfileController {

    private final ProfileService profileService;

    @Operation(summary = "Mettre à jour le matelas de sécurité")
    @ApiResponse(responseCode = "200", description = "Paramètres mis à jour",
        content = @Content(schema = @Schema(implementation = UserDto.class)))
    @ApiResponse(responseCode = "400", description = "Données invalides")
    @PutMapping("/safety-net")
    public ResponseEntity<UserDto> updateSafetyNet(
            @Valid @RequestBody UpdateSafetyNetRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(profileService.updateSafetyNet(currentUser, request));
    }

    @Operation(summary = "Mettre à jour le profil fiscal")
    @ApiResponse(responseCode = "200", description = "Profil fiscal mis à jour",
        content = @Content(schema = @Schema(implementation = UserDto.class)))
    @PutMapping("/fiscal")
    public ResponseEntity<UserDto> updateFiscalProfile(
            @Valid @RequestBody UpdateFiscalProfileRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(profileService.updateFiscalProfile(currentUser, request));
    }

    @Operation(summary = "Mettre à jour les informations personnelles")
    @ApiResponse(responseCode = "200", description = "Informations mises à jour",
        content = @Content(schema = @Schema(implementation = UserDto.class)))
    @PutMapping("/personal-info")
    public ResponseEntity<UserDto> updatePersonalInfo(
            @Valid @RequestBody UpdatePersonalInfoRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(profileService.updatePersonalInfo(currentUser, request));
    }

    @Operation(summary = "Activer ou désactiver le tracking analytics")
    @ApiResponse(responseCode = "200", description = "Préférence mise à jour",
        content = @Content(schema = @Schema(implementation = UserDto.class)))
    @PutMapping("/analytics-opt-out")
    public ResponseEntity<UserDto> updateAnalyticsOptOut(
            @RequestParam boolean optOut,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(profileService.updateAnalyticsOptOut(currentUser, optOut));
    }
}
