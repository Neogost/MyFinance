package com.myfinance.scheduler;

import com.myfinance.service.AllocationUpdateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "scheduler.enabled", havingValue = "true")
public class AllocationScheduler {

    private final AllocationUpdateService allocationUpdateService;

    /** Déclenche la mise à jour de la composition géographique le 1er de chaque mois à 3h00
     *  (1h après le scheduler de prix MarketDataScheduler). */
    @Scheduled(cron = "0 0 3 1 * *")
    public void runMonthlyAllocationUpdate() {
        log.info("[Allocation] Démarrage de la mise à jour de la composition géographique");
        int updated = allocationUpdateService.updateAll();
        log.info("[Allocation] Terminé — {} instrument(s) mis à jour", updated);
    }
}
