package com.myfinance.service;

import com.myfinance.domain.LoginEvent;
import com.myfinance.domain.LoginEventType;
import com.myfinance.dto.LoginEventDto;
import com.myfinance.repository.LoginEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LoginHistoryServiceTest {

    @Mock LoginEventRepository loginEventRepository;
    @InjectMocks LoginHistoryService loginHistoryService;

    LoginEvent successEvent;
    LoginEvent failureEvent;

    @BeforeEach
    void setUp() {
        successEvent = LoginEvent.builder()
                .id(1L).login("kevin").eventType(LoginEventType.SUCCESS)
                .ipAddress("127.0.0.1").userAgent("Mozilla/5.0")
                .failureCount(null).timestamp(LocalDateTime.now())
                .build();
        failureEvent = LoginEvent.builder()
                .id(2L).login("kevin").eventType(LoginEventType.FAILURE)
                .ipAddress("127.0.0.1").userAgent("Mozilla/5.0")
                .failureCount(2).timestamp(LocalDateTime.now())
                .build();
    }

    // ── logSuccess ─────────────────────────────────────────────

    @Test
    void logSuccess_persisteUnEvenementSuccess() {
        when(loginEventRepository.save(any())).thenReturn(successEvent);

        loginHistoryService.logSuccess("kevin", "127.0.0.1", "Mozilla/5.0");

        ArgumentCaptor<LoginEvent> captor = ArgumentCaptor.forClass(LoginEvent.class);
        verify(loginEventRepository).save(captor.capture());
        assertThat(captor.getValue().getEventType()).isEqualTo(LoginEventType.SUCCESS);
        assertThat(captor.getValue().getLogin()).isEqualTo("kevin");
        assertThat(captor.getValue().getFailureCount()).isNull();
    }

    // ── logFailure ─────────────────────────────────────────────

    @Test
    void logFailure_persisteUnEvenementFailureAvecCompteur() {
        when(loginEventRepository.save(any())).thenReturn(failureEvent);

        loginHistoryService.logFailure("kevin", "127.0.0.1", "Mozilla/5.0", 2);

        ArgumentCaptor<LoginEvent> captor = ArgumentCaptor.forClass(LoginEvent.class);
        verify(loginEventRepository).save(captor.capture());
        assertThat(captor.getValue().getEventType()).isEqualTo(LoginEventType.FAILURE);
        assertThat(captor.getValue().getFailureCount()).isEqualTo(2);
    }

    // ── logBlocked ─────────────────────────────────────────────

    @Test
    void logBlocked_persisteUnEvenementBlocked() {
        when(loginEventRepository.save(any())).thenReturn(successEvent);

        loginHistoryService.logBlocked("kevin", "10.0.0.1", "curl/8.0");

        ArgumentCaptor<LoginEvent> captor = ArgumentCaptor.forClass(LoginEvent.class);
        verify(loginEventRepository).save(captor.capture());
        assertThat(captor.getValue().getEventType()).isEqualTo(LoginEventType.BLOCKED);
    }

    @Test
    void logBlocked_loginNull_persisteAvecLoginVide() {
        when(loginEventRepository.save(any())).thenReturn(successEvent);

        assertThatNoException().isThrownBy(
                () -> loginHistoryService.logBlocked(null, "10.0.0.1", null));

        ArgumentCaptor<LoginEvent> captor = ArgumentCaptor.forClass(LoginEvent.class);
        verify(loginEventRepository).save(captor.capture());
        assertThat(captor.getValue().getLogin()).isEmpty();
    }

    @Test
    void persist_siRepositoryLanceUneException_nePropagePas() {
        when(loginEventRepository.save(any())).thenThrow(new RuntimeException("DB error"));

        assertThatNoException().isThrownBy(
                () -> loginHistoryService.logSuccess("kevin", "127.0.0.1", "Mozilla/5.0"));
    }

    @Test
    void persist_userAgentTropLong_estTronque() {
        when(loginEventRepository.save(any())).thenReturn(successEvent);
        String longUa = "A".repeat(600);

        loginHistoryService.logSuccess("kevin", "127.0.0.1", longUa);

        ArgumentCaptor<LoginEvent> captor = ArgumentCaptor.forClass(LoginEvent.class);
        verify(loginEventRepository).save(captor.capture());
        assertThat(captor.getValue().getUserAgent()).hasSize(500);
    }

    // ── getHistory ─────────────────────────────────────────────

    @Test
    void getHistory_retourneLaPageMappeeEnDtos() {
        Page<LoginEvent> page = new PageImpl<>(List.of(successEvent, failureEvent),
                PageRequest.of(0, 50), 2);
        when(loginEventRepository.findWithFilters(any(), any(), any(), any(), any()))
                .thenReturn(page);

        Page<LoginEventDto> result = loginHistoryService.getHistory(null, null, null, null, 0, 50);

        assertThat(result.getContent()).hasSize(2);
        assertThat(result.getContent().get(0).eventType()).isEqualTo(LoginEventType.SUCCESS);
        assertThat(result.getContent().get(1).failureCount()).isEqualTo(2);
    }

    @Test
    void getHistory_loginVide_passedNullAuRepository() {
        Page<LoginEvent> page = new PageImpl<>(List.of(), PageRequest.of(0, 50), 0);
        when(loginEventRepository.findWithFilters(isNull(), any(), any(), any(), any()))
                .thenReturn(page);

        loginHistoryService.getHistory("  ", null, null, null, 0, 50);

        verify(loginEventRepository).findWithFilters(isNull(), any(), any(), any(), any());
    }

    @Test
    void getHistory_sizePlafonneeA200() {
        Page<LoginEvent> page = new PageImpl<>(List.of(), PageRequest.of(0, 200), 0);
        when(loginEventRepository.findWithFilters(any(), any(), any(), any(), any()))
                .thenReturn(page);

        loginHistoryService.getHistory(null, null, null, null, 0, 999);

        ArgumentCaptor<org.springframework.data.domain.Pageable> captor =
                ArgumentCaptor.forClass(org.springframework.data.domain.Pageable.class);
        verify(loginEventRepository).findWithFilters(any(), any(), any(), any(), captor.capture());
        assertThat(captor.getValue().getPageSize()).isEqualTo(200);
    }
}
