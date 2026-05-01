package com.myfinance.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.config.AnalyticsProperties;
import com.myfinance.domain.*;
import com.myfinance.repository.AnalyticsEventRepository;
import com.myfinance.repository.ErrorLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTest {

    @Mock AnalyticsEventRepository analyticsEventRepository;
    @Mock ErrorLogRepository errorLogRepository;
    @Mock AnalyticsProperties props;
    @Mock AnalyticsProperties.Retention retention;
    @Spy  ObjectMapper objectMapper;
    @InjectMocks AnalyticsService analyticsService;

    User user;
    User optOutUser;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).login("kevin").role(RoleEnum.USER)
                .analyticsOptOut(false).build();
        optOutUser = User.builder().id(2L).login("jane").role(RoleEnum.USER)
                .analyticsOptOut(true).build();

    }

    // ── trackEvent ─────────────────────────────────────────────

    @Test
    void trackEvent_persisteLevenement() {
        when(props.isEnabled()).thenReturn(true);
        when(analyticsEventRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        analyticsService.trackEvent(user, "sess-1", EventType.FEATURE_USE,
                "patrimoine.position.create", "patrimoine", null);

        ArgumentCaptor<AnalyticsEvent> captor = ArgumentCaptor.forClass(AnalyticsEvent.class);
        verify(analyticsEventRepository).save(captor.capture());
        assertThat(captor.getValue().getEventName()).isEqualTo("patrimoine.position.create");
        assertThat(captor.getValue().getEventType()).isEqualTo(EventType.FEATURE_USE);
        assertThat(captor.getValue().getUser()).isEqualTo(user);
    }

    @Test
    void trackEvent_optOut_nePersistePas() {
        when(props.isEnabled()).thenReturn(true);
        analyticsService.trackEvent(optOutUser, "sess-2", EventType.PAGE_VIEW,
                "patrimoine.position.view", "patrimoine", null);

        verify(analyticsEventRepository, never()).save(any());
    }

    @Test
    void trackEvent_analyticsDesactive_nePersistePas() {
        when(props.isEnabled()).thenReturn(false);

        analyticsService.trackEvent(user, "sess-1", EventType.PAGE_VIEW,
                "patrimoine.position.view", "patrimoine", null);

        verify(analyticsEventRepository, never()).save(any());
    }

    @Test
    void trackEvent_nomInvalide_nePersistePas() {
        when(props.isEnabled()).thenReturn(true);
        analyticsService.trackEvent(user, "sess-1", EventType.FEATURE_USE,
                "mauvais-format", "patrimoine", null);

        verify(analyticsEventRepository, never()).save(any());
    }

    @Test
    void trackEvent_nomADeuxSegments_nePersistePas() {
        when(props.isEnabled()).thenReturn(true);
        analyticsService.trackEvent(user, "sess-1", EventType.FEATURE_USE,
                "patrimoine.position", "patrimoine", null);

        verify(analyticsEventRepository, never()).save(any());
    }

    @Test
    void trackEvent_metadataFiltreLesClesNonAutorisees() {
        when(props.isEnabled()).thenReturn(true);
        when(analyticsEventRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        String metadata = "{\"category\":\"BOURSE\",\"amount\":50000,\"duration_ms\":123}";

        analyticsService.trackEvent(user, "sess-1", EventType.FEATURE_USE,
                "tools.lombard.simulate", "tools", metadata);

        ArgumentCaptor<AnalyticsEvent> captor = ArgumentCaptor.forClass(AnalyticsEvent.class);
        verify(analyticsEventRepository).save(captor.capture());
        String saved = captor.getValue().getMetadata();
        assertThat(saved).contains("category");
        assertThat(saved).contains("duration_ms");
        assertThat(saved).doesNotContain("amount");
    }

    @Test
    void trackEvent_repositoryLanceException_nePropagePas() {
        when(props.isEnabled()).thenReturn(true);
        when(analyticsEventRepository.save(any())).thenThrow(new RuntimeException("DB down"));

        assertThatNoException().isThrownBy(() ->
                analyticsService.trackEvent(user, "sess-1", EventType.FEATURE_USE,
                        "patrimoine.position.create", null, null));
    }

    @Test
    void trackEvent_utilisateurNull_persisteCommeAnonyme() {
        when(props.isEnabled()).thenReturn(true);
        when(analyticsEventRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        analyticsService.trackEvent(null, "sess-anon", EventType.PAGE_VIEW,
                "auth.login.view", "login", null);

        ArgumentCaptor<AnalyticsEvent> captor = ArgumentCaptor.forClass(AnalyticsEvent.class);
        verify(analyticsEventRepository).save(captor.capture());
        assertThat(captor.getValue().getUser()).isNull();
        assertThat(captor.getValue().getSessionId()).isEqualTo("sess-anon");
    }

    // ── logError ───────────────────────────────────────────────

    @Test
    void logError_persisteLErreurAvecFingerprint() {
        when(props.isEnabled()).thenReturn(true);
        when(errorLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        analyticsService.logError(user, "sess-1", ErrorSource.BACKEND, ErrorLevel.ERROR,
                "NullPointerException", "null ref", "at com.myfinance.Foo:42",
                "GET", "/api/positions", 500, null);

        ArgumentCaptor<ErrorLog> captor = ArgumentCaptor.forClass(ErrorLog.class);
        verify(errorLogRepository).save(captor.capture());
        assertThat(captor.getValue().getErrorType()).isEqualTo("NullPointerException");
        assertThat(captor.getValue().getSource()).isEqualTo(ErrorSource.BACKEND);
        assertThat(captor.getValue().getFingerprint()).isNotBlank().hasSize(64);
    }

    @Test
    void logError_stackTropLongue_estTronquee() {
        when(props.isEnabled()).thenReturn(true);
        when(errorLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        String longStack = "at com.myfinance.Foo:1\n".repeat(500);

        analyticsService.logError(user, "sess-1", ErrorSource.BACKEND, ErrorLevel.ERROR,
                "Err", "msg", longStack, "GET", "/api/foo", 500, null);

        ArgumentCaptor<ErrorLog> captor = ArgumentCaptor.forClass(ErrorLog.class);
        verify(errorLogRepository).save(captor.capture());
        assertThat(captor.getValue().getStackTrace()).hasSizeLessThanOrEqualTo(4096);
    }

    @Test
    void logError_repositoryLanceException_nePropagePas() {
        when(props.isEnabled()).thenReturn(true);
        when(errorLogRepository.save(any())).thenThrow(new RuntimeException("DB down"));

        assertThatNoException().isThrownBy(() ->
                analyticsService.logError(user, "sess-1", ErrorSource.FRONTEND, ErrorLevel.ERROR,
                        "TypeError", "msg", null, null, "/patrimoine", null, null));
    }

    // ── shouldLogHttpStatus ────────────────────────────────────

    @Test
    void shouldLog_5xx_toujoursVrai() {
        assertThat(analyticsService.shouldLogHttpStatus(500, "/anything")).isTrue();
        assertThat(analyticsService.shouldLogHttpStatus(503, "/static")).isTrue();
    }

    @Test
    void shouldLog_403_surApiSeulement() {
        assertThat(analyticsService.shouldLogHttpStatus(403, "/api/positions")).isTrue();
        assertThat(analyticsService.shouldLogHttpStatus(403, "/index.html")).isFalse();
    }

    @Test
    void shouldLog_404_surApiSeulement() {
        assertThat(analyticsService.shouldLogHttpStatus(404, "/api/unknown")).isTrue();
        assertThat(analyticsService.shouldLogHttpStatus(404, "/favicon.ico")).isFalse();
    }

    @Test
    void shouldLog_401_toujoursFaux() {
        assertThat(analyticsService.shouldLogHttpStatus(401, "/api/positions")).isFalse();
    }

    @Test
    void shouldLog_400_toujoursFaux() {
        assertThat(analyticsService.shouldLogHttpStatus(400, "/api/positions")).isFalse();
    }

    // ── getHealth ──────────────────────────────────────────────

    @Test
    void getHealth_calculeCorrectementLeTauxErreur() {
        LocalDateTime from = LocalDateTime.now().minusDays(7);
        LocalDateTime to = LocalDateTime.now();

        when(analyticsEventRepository.countByCreatedAtBetween(anyLong(), anyLong())).thenReturn(100L);
        when(errorLogRepository.countByCreatedAtBetween(anyLong(), anyLong())).thenReturn(5L);
        when(errorLogRepository.countBySourceAndCreatedAtBetween(eq("BACKEND"), anyLong(), anyLong())).thenReturn(3L);
        when(errorLogRepository.countBySourceAndCreatedAtBetween(eq("FRONTEND"), anyLong(), anyLong())).thenReturn(2L);
        when(errorLogRepository.findErrorGroups(isNull(), isNull(), anyLong(), anyLong())).thenReturn(List.of());
        when(errorLogRepository.findErrorTimeline(anyLong(), anyLong())).thenReturn(List.of());

        var health = analyticsService.getHealth(from, to);

        assertThat(health.totalEvents7d()).isEqualTo(100L);
        assertThat(health.totalErrors7d()).isEqualTo(5L);
        assertThat(health.errorRatePercent()).isEqualTo(5.0);
    }
}
