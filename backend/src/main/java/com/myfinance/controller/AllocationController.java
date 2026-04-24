package com.myfinance.controller;

import com.myfinance.service.AllocationUpdateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.myfinance.domain.User;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/admin/allocations")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Allocations géographiques", description = "Mise à jour de la répartition géographique des ETF")
public class AllocationController {

    private final AllocationUpdateService allocationUpdateService;

    @PostMapping("/run")
    @Operation(summary = "Déclenche manuellement la mise à jour des allocations géographiques")
    public ResponseEntity<Map<String, Integer>> runManually(@AuthenticationPrincipal User currentUser) {
        log.info("[Allocation] Déclenchement manuel par l'administrateur : {}", currentUser.getLogin());
        int updated = allocationUpdateService.updateAll();
        return ResponseEntity.ok(Map.of("instrumentsUpdated", updated));
    }
}
