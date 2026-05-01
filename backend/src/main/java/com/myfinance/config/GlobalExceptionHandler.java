package com.myfinance.config;

import com.myfinance.domain.ErrorLevel;
import com.myfinance.domain.ErrorSource;
import com.myfinance.domain.User;
import com.myfinance.service.AnalyticsService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // Optional pour éviter les dépendances circulaires à l'initialisation
    @Autowired(required = false)
    private AnalyticsService analyticsService;

    // 4xx métier : pas de log (comportement normal)
    // 5xx inattendu via ResponseStatusException : log ERROR
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleResponseStatus(ResponseStatusException ex,
                                                                     HttpServletRequest request) {
        int status = ex.getStatusCode().value();
        if (ex.getStatusCode().is5xxServerError()) {
            log.error("Erreur serveur - status: {}, message: {}", ex.getStatusCode(), ex.getReason(), ex);
        }
        trackError(request, ex.getClass().getSimpleName(), ex.getReason() != null ? ex.getReason() : ex.getMessage(),
                null, status);
        String message = ex.getReason() != null ? ex.getReason() : ex.getMessage();
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of("error", message));
    }

    // Échec de validation @Valid @RequestBody → 400
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + " " + f.getDefaultMessage())
                .findFirst()
                .orElse("Requête invalide");
        return ResponseEntity.badRequest().body(Map.of("error", message));
    }

    // Échec de validation method-level (@Validated + @Size sur paramètre, etc.) → 400
    // Notamment levé pour les contraintes sur Map/List @RequestBody dans les controllers @Validated.
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, String>> handleConstraintViolation(ConstraintViolationException ex) {
        String message = ex.getConstraintViolations().stream()
                .map(v -> v.getMessage())
                .findFirst()
                .orElse("Requête invalide");
        return ResponseEntity.badRequest().body(Map.of("error", message));
    }

    // Accès refusé Spring Security 6 (@PreAuthorize) → 403
    // AuthorizationDeniedException extends AccessDeniedException
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> handleAccessDenied(AccessDeniedException ex,
                                                                   HttpServletRequest request) {
        trackError(request, "AccessDeniedException", ex.getMessage(), null, 403);
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Accès refusé"));
    }

    // Ressource statique introuvable → 404 silencieux.
    // Cas typique : navigateurs (iOS/Safari surtout) qui demandent automatiquement
    // /apple-touch-icon-*.png, /favicon.ico, /robots.txt etc. Sans ce handler, le
    // handler générique loggue en ERROR avec stack trace + renvoie 500, ce qui pollue
    // les logs pour du bruit normal.
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Void> handleNoResourceFound(NoResourceFoundException ex,
                                                       HttpServletRequest request) {
        trackError(request, "NoResourceFoundException", ex.getMessage(), null, 404);
        return ResponseEntity.notFound().build();
    }

    // Exception non typée : toujours ERROR avec stack trace
    // RGPD : on logue l'URI (identifiant technique) mais pas les query params ni les headers
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleUnexpected(Exception ex, HttpServletRequest request) {
        log.error("Exception non gérée sur {} {} - {}",
                request.getMethod(), request.getRequestURI(), ex.getMessage(), ex);
        trackError(request, ex.getClass().getSimpleName(), ex.getMessage(), stackTraceOf(ex), 500);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Erreur interne du serveur"));
    }

    // ── Utilitaire analytics ───────────────────────────────────

    private void trackError(HttpServletRequest request, String errorType, String message,
                             String stackTrace, int httpStatus) {
        if (analyticsService == null) return;
        if (!analyticsService.shouldLogHttpStatus(httpStatus, request.getRequestURI())) return;

        User currentUser = resolveUser();
        String sessionId = request.getHeader("X-Session-Id");
        ErrorLevel level = analyticsService.levelForStatus(httpStatus);

        analyticsService.logError(currentUser, sessionId, ErrorSource.BACKEND, level,
                errorType, message != null ? message : "no message", stackTrace,
                request.getMethod(), request.getRequestURI(), httpStatus, null);
    }

    private User resolveUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User u) return u;
        return null;
    }

    private String stackTraceOf(Exception ex) {
        StringBuilder sb = new StringBuilder();
        sb.append(ex).append("\n");
        for (StackTraceElement el : ex.getStackTrace()) {
            sb.append("\tat ").append(el).append("\n");
            if (sb.length() > 4000) break;
        }
        return sb.toString();
    }
}
