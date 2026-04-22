package com.myfinance.service;

import com.myfinance.domain.LoginEvent;
import com.myfinance.domain.LoginEventType;
import com.myfinance.dto.LoginEventDto;
import com.myfinance.repository.LoginEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class LoginHistoryService {

    private final LoginEventRepository loginEventRepository;

    public void logSuccess(String login, String ipAddress, String userAgent) {
        persist(login, LoginEventType.SUCCESS, ipAddress, userAgent, null);
    }

    public void logFailure(String login, String ipAddress, String userAgent, Integer failureCount) {
        persist(login, LoginEventType.FAILURE, ipAddress, userAgent, failureCount);
    }

    public void logBlocked(String login, String ipAddress, String userAgent) {
        persist(login, LoginEventType.BLOCKED, ipAddress, userAgent, null);
    }

    public Page<LoginEventDto> getHistory(String login, LoginEventType eventType,
                                          LocalDateTime from, LocalDateTime to,
                                          int page, int size) {
        int clampedSize = Math.min(size, 200);
        return loginEventRepository
                .findWithFilters(
                        login == null || login.isBlank() ? null : login,
                        eventType,
                        from,
                        to,
                        PageRequest.of(page, clampedSize))
                .map(LoginEventDto::from);
    }

    private void persist(String login, LoginEventType type, String ipAddress, String userAgent, Integer failureCount) {
        try {
            LoginEvent event = LoginEvent.builder()
                    .login(login != null ? login : "")
                    .eventType(type)
                    .ipAddress(ipAddress)
                    .userAgent(userAgent != null && userAgent.length() > 500
                            ? userAgent.substring(0, 500) : userAgent)
                    .failureCount(failureCount)
                    .timestamp(LocalDateTime.now())
                    .build();
            loginEventRepository.save(event);
        } catch (Exception ex) {
            log.warn("Impossible de persister l'événement de connexion ({}) pour '{}' : {}",
                    type, login, ex.getMessage());
        }
    }
}
