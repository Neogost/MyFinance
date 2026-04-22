package com.myfinance.controller;

import com.myfinance.domain.LoginEventType;
import com.myfinance.dto.LoginEventDto;
import com.myfinance.service.LoginHistoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/admin/login-history")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin — Historique des connexions", description = "Consultation des événements d'authentification")
public class AdminLoginHistoryController {

    private final LoginHistoryService loginHistoryService;

    @Operation(summary = "Lister l'historique des connexions")
    @ApiResponse(responseCode = "200", description = "Liste paginée des événements")
    @ApiResponse(responseCode = "403", description = "Accès non autorisé (rôle ADMIN requis)")
    @GetMapping
    public ResponseEntity<Page<LoginEventDto>> getHistory(
            @Parameter(description = "Filtre sur le login (recherche partielle)")
            @RequestParam(required = false) String login,

            @Parameter(description = "Filtre sur le type : SUCCESS, FAILURE, BLOCKED")
            @RequestParam(required = false) LoginEventType type,

            @Parameter(description = "Borne inférieure de la période (ISO-8601)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,

            @Parameter(description = "Borne supérieure de la période (ISO-8601)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,

            @Parameter(description = "Numéro de page (défaut : 0)")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Taille de page (défaut : 50, max : 200)")
            @RequestParam(defaultValue = "50") int size) {

        return ResponseEntity.ok(loginHistoryService.getHistory(login, type, from, to, page, size));
    }
}
