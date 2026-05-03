package com.myfinance.controller;

import com.myfinance.dto.MigrateAmountEurReport;
import com.myfinance.service.MigrateAmountEurService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminMigrationController {

    private final MigrateAmountEurService migrateAmountEurService;

    // ⚠ MIGRATION ONE-SHOT — À SUPPRIMER après exécution confirmée en dev ET en prod.
    // Classes à supprimer : AdminMigrationController, MigrateAmountEurService,
    //                       MigrateAmountEurReport, MigrateAmountEurServiceTest.
    // Classes à garder   : computeAmountEur() dans PositionService,
    //                       findAllNonEurOrders() dans PositionOrderRepository.
    // Procédure : dryRun=true → vérifier le rapport → dryRun=false → vérifier → supprimer.
    /**
     * Recalcule amountEur sur tous les ordres en devise non-EUR.
     * dryRun=true (défaut) : analyse sans modifier la base, retourne le rapport.
     * dryRun=false : applique les corrections et retourne le rapport.
     */
    @PostMapping("/api/admin/orders/migrate-amount-eur")
    public ResponseEntity<MigrateAmountEurReport> migrateAmountEur(
            @RequestParam(defaultValue = "true") boolean dryRun) {
        return ResponseEntity.ok(migrateAmountEurService.migrate(dryRun));
    }
}
