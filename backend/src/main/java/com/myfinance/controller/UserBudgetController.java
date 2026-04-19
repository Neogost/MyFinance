package com.myfinance.controller;

import com.myfinance.domain.ExpenseCategoryEnum;
import com.myfinance.domain.User;
import com.myfinance.dto.UpsertUserBudgetsRequest;
import com.myfinance.service.UserBudgetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/expense-budgets")
@RequiredArgsConstructor
@Tag(name = "Budgets par catégorie", description = "Plafonds mensuels de dépenses par catégorie")
public class UserBudgetController {

    private final UserBudgetService userBudgetService;

    @Operation(summary = "Récupérer les budgets de l'utilisateur connecté")
    @ApiResponse(responseCode = "200", description = "Map catégorie → plafond mensuel")
    @GetMapping
    public ResponseEntity<Map<ExpenseCategoryEnum, Float>> getBudgets(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(userBudgetService.getBudgets(currentUser));
    }

    @Operation(summary = "Enregistrer tous les budgets (remplace l'existant)")
    @ApiResponse(responseCode = "200", description = "Map mise à jour")
    @PutMapping
    public ResponseEntity<Map<ExpenseCategoryEnum, Float>> upsertAll(
            @Valid @RequestBody UpsertUserBudgetsRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(userBudgetService.upsertAll(request, currentUser));
    }
}
