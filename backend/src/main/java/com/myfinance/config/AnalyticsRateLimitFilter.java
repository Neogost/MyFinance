package com.myfinance.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Order(10)
public class AnalyticsRateLimitFilter extends OncePerRequestFilter {

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
}
