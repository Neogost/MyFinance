package com.myfinance.controller;

import com.myfinance.domain.User;
import com.myfinance.dto.ChangePasswordRequest;
import com.myfinance.dto.UserDto;
import com.myfinance.service.UserService;
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
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentification", description = "Login, logout et session courante")
public class AuthController {

    private final UserService userService;

    @Operation(summary = "Utilisateur connecté",
        description = "Retourne les informations de l'utilisateur associé à la session courante.")
    @ApiResponse(responseCode = "200", description = "Session active",
        content = @Content(schema = @Schema(implementation = UserDto.class)))
    @ApiResponse(responseCode = "401", description = "Non authentifié")
    @GetMapping("/me")
    public ResponseEntity<UserDto> me(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(UserDto.from(userService.findEntityById(user.getId())));
    }

    @Operation(summary = "Changer son mot de passe",
        description = "Permet à l'utilisateur connecté de changer son propre mot de passe.")
    @ApiResponse(responseCode = "204", description = "Mot de passe modifié")
    @ApiResponse(responseCode = "401", description = "Mot de passe actuel incorrect")
    @PutMapping("/password")
    public ResponseEntity<Void> changePassword(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(currentUser.getId(), request);
        return ResponseEntity.noContent().build();
    }
}
