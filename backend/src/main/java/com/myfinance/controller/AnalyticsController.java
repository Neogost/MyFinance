package com.myfinance.controller;

import com.myfinance.domain.ErrorLevel;
import com.myfinance.domain.ErrorSource;
import com.myfinance.domain.User;
import com.myfinance.dto.TrackErrorRequest;
import com.myfinance.dto.TrackEventRequest;
import com.myfinance.service.AnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@Tag(name = "Analytics", description = "Tracking comportemental et remontée d'erreurs frontend")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @Operation(summary = "Enregistrer un event utilisateur")
    @PostMapping("/track")
    public ResponseEntity<Void> track(
            @Valid @RequestBody TrackEventRequest request,
            @AuthenticationPrincipal User currentUser,
            HttpServletRequest httpRequest) {
        String sessionId = httpRequest.getHeader("X-Session-Id");
        analyticsService.trackEvent(
                currentUser, sessionId,
                request.type(), request.name(), request.page(), request.metadata());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Remonter une erreur frontend")
    @PostMapping("/error")
    public ResponseEntity<Void> trackError(
            @Valid @RequestBody TrackErrorRequest request,
            @AuthenticationPrincipal User currentUser,
            HttpServletRequest httpRequest) {
        String sessionId = httpRequest.getHeader("X-Session-Id");
        analyticsService.logError(
                currentUser, sessionId,
                ErrorSource.FRONTEND, ErrorLevel.ERROR,
                request.errorType(), request.message(), request.stack(),
                null, request.requestPath(), null,
                request.metadata());
        return ResponseEntity.noContent().build();
    }
}
