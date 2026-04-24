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

    /** Déclenche la mise à jour complète tous les jours à 2h00 */
    @Scheduled(cron = "0 0 2 * * *")
    public void runDailyUpdate() {
        log.info("[Scheduler] Déclenchement automatique quotidien (cron: tous les jours, 2h00)");
        marketDataService.runFullUpdate();
    }
}
