package com.myfinance.scheduler;

import com.myfinance.service.MarketDataService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "scheduler.enabled", havingValue = "true")
public class MarketDataScheduler {

    private final MarketDataService marketDataService;

    /** Déclenche la mise à jour complète le 1er de chaque mois à 2h00 */
    @Scheduled(cron = "0 0 2 1 * *")
    public void runMonthlyUpdate() {
        log.info("[Scheduler] Déclenchement automatique mensuel (cron: 1er du mois, 2h00)");
        marketDataService.runFullUpdate();
    }
}
