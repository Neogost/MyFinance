package com.myfinance.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalyticsRateLimitFilterTest {

    @Mock HttpServletRequest  request;
    @Mock HttpServletResponse response;
    @Mock FilterChain         chain;

    AnalyticsRateLimitFilter filter;
    @SuppressWarnings("unchecked")
    ConcurrentHashMap<String, long[]> counters() {
        return (ConcurrentHashMap<String, long[]>) ReflectionTestUtils.getField(filter, "counters");
    }

    @BeforeEach
    void setUp() {
        filter = new AnalyticsRateLimitFilter(3);
    }

    @Test
    void doFilter_sousLaLimite_laissePasser() throws Exception {
        when(request.getRemoteAddr()).thenReturn("1.2.3.4");
        for (int i = 0; i < 3; i++) {
            filter.doFilterInternal(request, response, chain);
        }
        verify(chain, times(3)).doFilter(request, response);
    }

    @Test
    void doFilter_audessusDeLaLimite_repond204_sansAppelerLaChain() throws Exception {
        when(request.getRemoteAddr()).thenReturn("1.2.3.4");
        // 4 appels avec max=3 → le 4e doit retourner 204
        for (int i = 0; i < 3; i++) {
            filter.doFilterInternal(request, response, chain);
        }
        filter.doFilterInternal(request, response, chain);
        verify(chain, times(3)).doFilter(request, response);
        verify(response).setStatus(HttpServletResponse.SC_NO_CONTENT);
    }

    @Test
    void evictStaleEntries_supprimeUniquementLesBucketsExpires() {
        long now = Instant.now().getEpochSecond();
        counters().put("recent",  new long[]{5, now});
        counters().put("expired", new long[]{99, now - (60 + 180)}); // au-delà de la grâce
        counters().put("limite",  new long[]{1, now - (60 + 60)});   // dans la zone de grâce

        filter.evictStaleEntries();

        assertThat(counters()).containsKeys("recent", "limite").doesNotContainKey("expired");
    }

    @Test
    void evictStaleEntries_mapVide_neLeveRien() {
        filter.evictStaleEntries();
        assertThat(counters()).isEmpty();
        verifyNoInteractions(chain, response);
    }
}
