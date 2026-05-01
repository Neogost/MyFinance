package com.myfinance.service;

import com.myfinance.config.AnalyticsProperties;
import com.myfinance.domain.*;
import com.myfinance.dto.*;
import com.myfinance.repository.AnalyticsEventRepository;
import com.myfinance.repository.ErrorLogRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private static final Pattern EVENT_NAME_PATTERN =
            Pattern.compile("^[a-z][a-z0-9_]*\\.[a-z][a-z0-9_]*\\.[a-z][a-z0-9_]*$");

    // Clés autorisées dans metadata — jamais de données financières
    private static final Set<String> ALLOWED_METADATA_KEYS = Set.of(
            "duration_ms", "result_count", "filter_used", "category",
            "view_mode", "contract_type", "envelope"
    );

    // Codes HTTP capturés comme erreurs (hors 5xx géré séparément)
    private static final Set<Integer> TRACKED_4XX = Set.of(403, 404);

    private final AnalyticsEventRepository analyticsEventRepository;
    private final ErrorLogRepository errorLogRepository;
    private final AnalyticsProperties props;
    private final ObjectMapper objectMapper;

    // ── Tracking des events ────────────────────────────────────

    @Async("analyticsExecutor")
    public void trackEvent(User user, String sessionId, EventType eventType,
                           String eventName, String page, String rawMetadata) {
        if (!props.isEnabled()) return;
        if (user != null && user.isAnalyticsOptOut()) return;
        if (!EVENT_NAME_PATTERN.matcher(eventName).matches()) {
            log.warn("[Analytics] event_name rejeté (format invalide) : {}", eventName);
            return;
        }
        try {
            AnalyticsEvent event = AnalyticsEvent.builder()
                    .user(user)
                    .sessionId(sessionId != null ? sessionId : "anonymous")
                    .eventType(eventType)
                    .eventName(eventName)
                    .page(page)
                    .metadata(filterMetadata(rawMetadata))
                    .build();
            analyticsEventRepository.save(event);
        } catch (Exception e) {
            log.warn("[Analytics] Échec persistance event {} : {}", eventName, e.getMessage());
        }
    }

    // ── Logging des erreurs ────────────────────────────────────

    @Async("analyticsExecutor")
    public void logError(User user, String sessionId, ErrorSource source, ErrorLevel level,
                         String errorType, String message, String stackTrace,
                         String requestMethod, String requestPath, Integer httpStatus,
                         String metadata) {
        if (!props.isEnabled()) return;
        try {
            String fingerprint = computeFingerprint(errorType, stackTrace);
            ErrorLog errorLog = ErrorLog.builder()
                    .user(user)
                    .sessionId(sessionId)
                    .source(source)
                    .level(level)
                    .errorType(truncate(errorType, 200))
                    .message(message)
                    .stackTrace(truncate(stackTrace, 4096))
                    .requestMethod(requestMethod)
                    .requestPath(requestPath)
                    .httpStatus(httpStatus)
                    .metadata(metadata)
                    .fingerprint(fingerprint)
                    .build();
            errorLogRepository.save(errorLog);
        } catch (Exception e) {
            log.warn("[Analytics] Échec persistance erreur {} : {}", errorType, e.getMessage());
        }
    }

    // ── Détermination si un status HTTP doit être loggué ──────

    public boolean shouldLogHttpStatus(int status, String path) {
        if (status >= 500) return true;
        if (TRACKED_4XX.contains(status) && path != null && path.startsWith("/api/")) return true;
        return false;
    }

    public ErrorLevel levelForStatus(int status) {
        return status >= 500 ? ErrorLevel.ERROR : ErrorLevel.WARN;
    }

    // ── Agrégations admin ──────────────────────────────────────

    public List<TopEventDto> getTopEvents(EventType eventType, LocalDateTime from,
                                          LocalDateTime to, int limit) {
        String eventTypeStr = eventType != null ? eventType.name() : null;
        return analyticsEventRepository.findTopEvents(eventTypeStr, toMs(from), toMs(to), limit)
                .stream()
                .map(row -> new TopEventDto((String) row[0], ((Number) row[1]).longValue()))
                .toList();
    }

    public List<TimelineDto> getEventTimeline(String eventName, LocalDateTime from, LocalDateTime to) {
        return analyticsEventRepository.findTimeline(eventName, toMs(from), toMs(to))
                .stream()
                .map(row -> new TimelineDto((String) row[0], ((Number) row[1]).longValue()))
                .toList();
    }

    public List<AnalyticsEventDto> getJourney(String sessionId) {
        return analyticsEventRepository.findBySessionIdOrderByCreatedAtAsc(sessionId)
                .stream()
                .map(AnalyticsEventDto::from)
                .toList();
    }

    public List<ErrorLogDto> getJourneyErrors(String sessionId) {
        return errorLogRepository.findBySessionIdOrderByCreatedAtAsc(sessionId)
                .stream()
                .map(ErrorLogDto::from)
                .toList();
    }

    public List<ErrorGroupDto> getErrorGroups(ErrorSource source, ErrorLevel level,
                                              LocalDateTime from, LocalDateTime to) {
        // nativeQuery : passer les enums en String
        String sourceStr = source != null ? source.name() : null;
        String levelStr  = level  != null ? level.name()  : null;
        return errorLogRepository.findErrorGroups(sourceStr, levelStr, toMs(from), toMs(to))
                .stream()
                .map(row -> new ErrorGroupDto(
                        (String) row[0],
                        (String) row[1],
                        ErrorSource.valueOf((String) row[2]),
                        ErrorLevel.valueOf((String) row[3]),
                        (String) row[4],
                        parseNativeDateTime(row[5]),
                        parseNativeDateTime(row[6]),
                        ((Number) row[7]).longValue()))
                .toList();
    }

    public Page<ErrorLogDto> getErrorOccurrences(String fingerprint, Pageable pageable) {
        return errorLogRepository.findByFingerprintOrderByCreatedAtDesc(fingerprint, pageable)
                .map(ErrorLogDto::from);
    }

    public AnalyticsHealthDto getHealth(LocalDateTime from, LocalDateTime to) {
        long fromEpoch = toMs(from);
        long toEpoch   = toMs(to);
        long totalEvents   = analyticsEventRepository.countByCreatedAtBetween(fromEpoch, toEpoch);
        long totalErrors   = errorLogRepository.countByCreatedAtBetween(fromEpoch, toEpoch);
        long backendErrors  = errorLogRepository.countBySourceAndCreatedAtBetween(ErrorSource.BACKEND.name(), fromEpoch, toEpoch);
        long frontendErrors = errorLogRepository.countBySourceAndCreatedAtBetween(ErrorSource.FRONTEND.name(), fromEpoch, toEpoch);
        double errorRate = totalEvents == 0 ? 0.0 : (totalErrors * 100.0) / totalEvents;

        List<ErrorGroupDto> top3 = getErrorGroups(null, null, from, to)
                .stream().limit(3).toList();

        List<AnalyticsHealthDto.TimelinePointDto> timeline = errorLogRepository
                .findErrorTimeline(toMs(from), toMs(to))
                .stream()
                .map(row -> new AnalyticsHealthDto.TimelinePointDto(
                        (String) row[0],
                        (String) row[1],
                        ((Number) row[2]).longValue()))
                .toList();

        return new AnalyticsHealthDto(totalEvents, totalErrors, backendErrors, frontendErrors,
                Math.round(errorRate * 10.0) / 10.0, top3, timeline);
    }

    // ── Utilitaires privés ─────────────────────────────────────

    /** Convertit LocalDateTime en epoch millisecondes — format de stockage SQLite + Hibernate. */
    private static long toMs(LocalDateTime ldt) {
        return ldt.toInstant(ZoneOffset.UTC).toEpochMilli();
    }

    /** SQLite stocke les datetimes en ms epoch — MIN/MAX les retournent en Long. */
    private LocalDateTime parseNativeDateTime(Object obj) {
        if (obj == null) return null;
        if (obj instanceof LocalDateTime ldt) return ldt;
        String s = obj.toString();
        try {
            return LocalDateTime.ofInstant(
                    java.time.Instant.ofEpochMilli(Long.parseLong(s)), ZoneOffset.UTC);
        } catch (NumberFormatException e) {
            s = s.replace(' ', 'T');
            if (s.length() > 19) s = s.substring(0, 19);
            return LocalDateTime.parse(s);
        }
    }

    private String computeFingerprint(String errorType, String stackTrace) {
        try {
            String firstFrame = extractFirstAppFrame(stackTrace);
            String input = errorType + ":" + firstFrame;
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : Arrays.copyOf(hash, 32)) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            return Integer.toHexString(errorType.hashCode());
        }
    }

    private String extractFirstAppFrame(String stackTrace) {
        if (stackTrace == null) return "unknown";
        return Arrays.stream(stackTrace.split("\n"))
                .map(String::trim)
                .filter(line -> line.startsWith("at com.myfinance."))
                .findFirst()
                // Normalise : supprime le numéro de ligne pour regrouper les variantes
                .map(line -> line.replaceAll(":\\d+\\)", ":N)"))
                .orElse("unknown");
    }

    private String truncate(String s, int max) {
        if (s == null || s.length() <= max) return s;
        return s.substring(0, max);
    }

    /**
     * Parse le JSON metadata et ne conserve que les clés de la whitelist.
     * Protège contre les fuites accidentelles de données financières.
     */
    private String filterMetadata(String rawMetadata) {
        if (rawMetadata == null || rawMetadata.isBlank()) return null;
        try {
            ObjectNode parsed = (ObjectNode) objectMapper.readTree(rawMetadata);
            ObjectNode filtered = objectMapper.createObjectNode();
            parsed.fields().forEachRemaining(entry -> {
                if (ALLOWED_METADATA_KEYS.contains(entry.getKey())) {
                    filtered.set(entry.getKey(), entry.getValue());
                }
            });
            return filtered.isEmpty() ? null : objectMapper.writeValueAsString(filtered);
        } catch (Exception e) {
            // Metadata non JSON ou illisible → ignorée silencieusement
            return null;
        }
    }

    // ── DTOs internes d'agrégation ─────────────────────────────

    public record TopEventDto(String eventName, long count) {}
    public record TimelineDto(String day, long count) {}
}
