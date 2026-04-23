package com.myfinance.controller;

import com.myfinance.dto.MarketDataReportDto;
import com.myfinance.service.MarketDataService;
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

@Slf4j
@RestController
@RequestMapping("/api/admin/market-data")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Données de marché", description = "Mise à jour automatique des cours et snapshots mensuels")
public class MarketDataController {

    private final MarketDataService marketDataService;

    @PostMapping("/run")
    @Operation(summary = "Déclenche manuellement la mise à jour des cours et le snapshot mensuel")
    public ResponseEntity<MarketDataReportDto> runManually(@AuthenticationPrincipal User currentUser) {
        log.info("[MarketData] Déclenchement manuel par l'administrateur : {}", currentUser.getLogin());
        MarketDataReportDto report = marketDataService.runFullUpdate();
        return ResponseEntity.ok(report);
    }
}
