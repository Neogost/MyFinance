package com.myfinance.controller;

import com.myfinance.dto.CreateUserRequest;
import com.myfinance.dto.UpdateUserRequest;
import com.myfinance.dto.UserDto;
import com.myfinance.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Utilisateurs", description = "Gestion des utilisateurs (Admin uniquement)")
public class UserController {

    private final UserService userService;

    @Operation(summary = "Lister tous les utilisateurs")
    @ApiResponse(responseCode = "200", description = "Liste des utilisateurs",
        content = @Content(array = @ArraySchema(schema = @Schema(implementation = UserDto.class))))
    @GetMapping
    public ResponseEntity<List<UserDto>> findAll() {
        return ResponseEntity.ok(userService.findAll());
    }

    @Operation(summary = "Détail d'un utilisateur")
    @ApiResponse(responseCode = "200", description = "Utilisateur trouvé",
        content = @Content(schema = @Schema(implementation = UserDto.class)))
    @ApiResponse(responseCode = "404", description = "Utilisateur introuvable")
    @GetMapping("/{id}")
    public ResponseEntity<UserDto> findById(
            @Parameter(description = "Identifiant de l'utilisateur") @PathVariable Long id) {
        return ResponseEntity.ok(userService.findById(id));
    }

    @Operation(summary = "Créer un utilisateur")
    @ApiResponse(responseCode = "201", description = "Utilisateur créé",
        content = @Content(schema = @Schema(implementation = UserDto.class)))
    @ApiResponse(responseCode = "409", description = "Login déjà utilisé")
    @PostMapping
    public ResponseEntity<UserDto> create(
            @Valid @RequestBody CreateUserRequest request,
            Authentication authentication) {
        log.info("[admin:{}] Création utilisateur — login={}, rôle={}",
                authentication.getName(), request.login(), request.role());
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.create(request));
    }

    @Operation(summary = "Modifier un utilisateur")
    @ApiResponse(responseCode = "200", description = "Utilisateur modifié",
        content = @Content(schema = @Schema(implementation = UserDto.class)))
    @ApiResponse(responseCode = "404", description = "Utilisateur introuvable")
    @ApiResponse(responseCode = "409", description = "Login déjà utilisé")
    @PutMapping("/{id}")
    public ResponseEntity<UserDto> update(
            @Parameter(description = "Identifiant de l'utilisateur") @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request,
            Authentication authentication) {
        log.info("[admin:{}] Modification utilisateur #{} — login={}, rôle={}, password={}",
                authentication.getName(), id, request.login(), request.role(),
                request.password() != null && !request.password().isBlank() ? "modifié" : "inchangé");
        return ResponseEntity.ok(userService.update(id, request));
    }

    @Operation(summary = "Supprimer un utilisateur")
    @ApiResponse(responseCode = "204", description = "Utilisateur supprimé")
    @ApiResponse(responseCode = "404", description = "Utilisateur introuvable")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @Parameter(description = "Identifiant de l'utilisateur") @PathVariable Long id,
            Authentication authentication) {
        log.info("[admin:{}] Suppression utilisateur #{}", authentication.getName(), id);
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
