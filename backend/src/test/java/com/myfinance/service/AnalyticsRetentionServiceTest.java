package com.myfinance.service;

import com.myfinance.config.AnalyticsProperties;
import com.myfinance.repository.AnalyticsEventRepository;
import com.myfinance.repository.ErrorLogRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AnalyticsRetentionServiceTest {

    @Mock AnalyticsEventRepository analyticsEventRepository;
    @Mock ErrorLogRepository errorLogRepository;
    @Mock AnalyticsProperties props;
    @Mock AnalyticsProperties.Retention retention;
    @InjectMocks AnalyticsRetentionService retentionService;

    @Test
    void purge_supprimeEventsEtErreurs() {
        when(props.getRetention()).thenReturn(retention);
        when(retention.isEnabled()).thenReturn(true);
        when(retention.getEventsDays()).thenReturn(180);
        when(retention.getErrorsDays()).thenReturn(365);

        retentionService.purge();

        verify(analyticsEventRepository).deleteByCreatedAtBeforeMs(anyLong());
        verify(errorLogRepository).deleteByCreatedAtBeforeMs(anyLong());
    }

    @Test
    void purge_retentionDesactivee_neSupprimePas() {
        when(props.getRetention()).thenReturn(retention);
        when(retention.isEnabled()).thenReturn(false);

        retentionService.purge();

        verify(analyticsEventRepository, never()).deleteByCreatedAtBeforeMs(anyLong());
        verify(errorLogRepository, never()).deleteByCreatedAtBeforeMs(anyLong());
    }

    @Test
    void purgeOlderThan_retourneLesCompteursDeSuppressions() {
        when(analyticsEventRepository.deleteByCreatedAtBeforeMs(anyLong())).thenReturn(42);
        when(errorLogRepository.deleteByCreatedAtBeforeMs(anyLong())).thenReturn(7);

        var result = retentionService.purgeOlderThan(90, 180);

        org.assertj.core.api.Assertions.assertThat(result.deletedEvents()).isEqualTo(42);
        org.assertj.core.api.Assertions.assertThat(result.deletedErrors()).isEqualTo(7);
        org.assertj.core.api.Assertions.assertThat(result.olderThanDays()).isEqualTo(90);
    }
}
