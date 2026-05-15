package com.myfinance.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Order(10)
@Slf4j
public class AnalyticsRateLimitFilter extends OncePerRequestFilter {

    // Une entrée est considérée expirée si sa fenêtre d'1 minute est terminée depuis
    // au moins ce délai supplémentaire — laisse une marge avant la purge pour éviter
    // de re-créer le bucket d'un client juste après l'avoir éjecté.
    private static final long EVICTION_GRACE_SECONDS = 120;

    private final int maxEventsPerMinute;

    // key → [count, windowStartEpochSecond]
    private final ConcurrentHashMap<String, long[]> counters = new ConcurrentHashMap<>();

    public AnalyticsRateLimitFilter(
            @Value("${analytics.rate-limit-events-per-minute:100}") int maxEventsPerMinute) {
        this.maxEventsPerMinute = maxEventsPerMinute;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/analytics/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String key = resolveKey(request);
        if (key != null && isRateLimited(key)) {
            // 204 silencieux — le client fire-and-forget ignore la réponse
            response.setStatus(HttpServletResponse.SC_NO_CONTENT);
            return;
        }
        chain.doFilter(request, response);
    }

    private boolean isRateLimited(String key) {
        long now = Instant.now().getEpochSecond();
        long[] bucket = counters.compute(key, (k, existing) -> {
            if (existing == null || now - existing[1] >= 60) {
                return new long[]{1, now};
            }
            existing[0]++;
            return existing;
        });
        return bucket[0] > maxEventsPerMinute;
    }

    private String resolveKey(HttpServletRequest request) {
        return request.getUserPrincipal() != null
                ? request.getUserPrincipal().getName()
                : request.getRemoteAddr();
    }

    /**
     * Purge les entrées dont la fenêtre est expirée depuis plus de {@link #EVICTION_GRACE_SECONDS}.
     * Sans cette purge, la map croit indéfiniment au fil des IPs/utilisateurs distincts qui frappent
     * /api/analytics/* — un attaquant rotant les IPs pouvait gonfler la heap. Tourne toutes les 5 min.
     */
    @Scheduled(fixedDelay = 5 * 60 * 1000L)
    void evictStaleEntries() {
        long now = Instant.now().getEpochSecond();
        int sizeBefore = counters.size();
        counters.entrySet().removeIf(e -> now - e.getValue()[1] >= 60 + EVICTION_GRACE_SECONDS);
        int evicted = sizeBefore - counters.size();
        if (evicted > 0) {
            log.info("[AnalyticsRateLimit] {} entrée(s) expirée(s) purgée(s), {} restante(s)",
                    evicted, counters.size());
        }
    }
}
