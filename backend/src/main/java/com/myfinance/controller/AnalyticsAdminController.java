package com.myfinance.controller;

import com.myfinance.domain.ErrorLevel;
import com.myfinance.domain.ErrorSource;
import com.myfinance.domain.EventType;
import com.myfinance.dto.*;
import com.myfinance.service.AnalyticsService;
import com.myfinance.service.AnalyticsRetentionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/admin/analytics")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Analytics Admin", description = "Consultation des données analytics (ADMIN)")
public class AnalyticsAdminController {

    private final AnalyticsService analyticsService;
    private final AnalyticsRetentionService retentionService;

    @Operation(summary = "Top events sur une période")
    @GetMapping("/top-events")
    public ResponseEntity<List<AnalyticsService.TopEventDto>> topEvents(
            @RequestParam(required = false) EventType type,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(analyticsService.getTopEvents(type, from, to, limit));
    }

    @Operation(summary = "Série temporelle d'un event")
    @GetMapping("/timeline")
    public ResponseEntity<List<AnalyticsService.TimelineDto>> timeline(
            @RequestParam String name,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return ResponseEntity.ok(analyticsService.getEventTimeline(name, from, to));
    }

    @Operation(summary = "Parcours d'une session")
    @GetMapping("/journey/{sessionId}")
    public ResponseEntity<List<AnalyticsEventDto>> journey(@PathVariable String sessionId) {
        return ResponseEntity.ok(analyticsService.getJourney(sessionId));
    }

    @Operation(summary = "Erreurs survenues pendant une session")
    @GetMapping("/journey/{sessionId}/errors")
    public ResponseEntity<List<ErrorLogDto>> journeyErrors(@PathVariable String sessionId) {
        return ResponseEntity.ok(analyticsService.getJourneyErrors(sessionId));
    }

    @Operation(summary = "Erreurs groupées par fingerprint")
    @GetMapping("/errors")
    public ResponseEntity<List<ErrorGroupDto>> errors(
            @RequestParam(required = false) ErrorSource source,
            @RequestParam(required = false) ErrorLevel level,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return ResponseEntity.ok(analyticsService.getErrorGroups(source, level, from, to));
    }

    @Operation(summary = "Occurrences d'une erreur")
    @GetMapping("/errors/{fingerprint}")
    public ResponseEntity<Page<ErrorLogDto>> errorOccurrences(
            @PathVariable String fingerprint,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
                analyticsService.getErrorOccurrences(fingerprint, PageRequest.of(page, size)));
    }

    @Operation(summary = "Synthèse de santé technique")
    @GetMapping("/health")
    public ResponseEntity<AnalyticsHealthDto> health(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return ResponseEntity.ok(analyticsService.getHealth(from, to));
    }

    @Operation(summary = "Supprimer les données analytics anciennes")
    @DeleteMapping("/purge")
    public ResponseEntity<PurgeResultDto> purge(
            @RequestParam(defaultValue = "90") int eventsDays,
            @RequestParam(defaultValue = "180") int errorsDays) {
        return ResponseEntity.ok(retentionService.purgeOlderThan(eventsDays, errorsDays));
    }
}
