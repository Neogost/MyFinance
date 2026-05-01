package com.myfinance.service;

import com.myfinance.config.AnalyticsProperties;
import com.myfinance.dto.PurgeResultDto;
import com.myfinance.repository.AnalyticsEventRepository;
import com.myfinance.repository.ErrorLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnalyticsRetentionService {

    private final AnalyticsEventRepository analyticsEventRepository;
    private final ErrorLogRepository errorLogRepository;
    private final AnalyticsProperties props;

    @Scheduled(cron = "0 0 3 1 * ?")
    @Transactional
    public void purge() {
        if (!props.getRetention().isEnabled()) return;
        PurgeResultDto result = purgeOlderThan(
                props.getRetention().getEventsDays(),
                props.getRetention().getErrorsDays());
        log.info("[Analytics] Purge planifiée — {} events, {} erreurs supprimés",
                result.deletedEvents(), result.deletedErrors());
    }

    /** Suppression manuelle déclenchée depuis l'interface admin. */
    @Transactional
    public PurgeResultDto purgeOlderThan(int eventsDays, int errorsDays) {
        long eventsCutoffMs = toMs(LocalDateTime.now().minusDays(eventsDays));
        long errorsCutoffMs = toMs(LocalDateTime.now().minusDays(errorsDays));

        int deletedEvents = analyticsEventRepository.deleteByCreatedAtBeforeMs(eventsCutoffMs);
        int deletedErrors = errorLogRepository.deleteByCreatedAtBeforeMs(errorsCutoffMs);

        log.info("[Analytics] Purge manuelle — {} events (>{} j), {} erreurs (>{} j) supprimés",
                deletedEvents, eventsDays, deletedErrors, errorsDays);
        return new PurgeResultDto(deletedEvents, deletedErrors, eventsDays);
    }

    private static long toMs(LocalDateTime ldt) {
        return ldt.toInstant(ZoneOffset.UTC).toEpochMilli();
    }
}
