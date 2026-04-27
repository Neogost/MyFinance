package com.myfinance.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // 4xx métier : pas de log (comportement normal)
    // 5xx inattendu via ResponseStatusException : log ERROR
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleResponseStatus(ResponseStatusException ex) {
        if (ex.getStatusCode().is5xxServerError()) {
            log.error("Erreur serveur - status: {}, message: {}", ex.getStatusCode(), ex.getReason(), ex);
        }
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
    public ResponseEntity<Map<String, String>> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Accès refusé"));
    }

    // Ressource statique introuvable → 404 silencieux.
    // Cas typique : navigateurs (iOS/Safari surtout) qui demandent automatiquement
    // /apple-touch-icon-*.png, /favicon.ico, /robots.txt etc. Sans ce handler, le
    // handler générique loggue en ERROR avec stack trace + renvoie 500, ce qui pollue
    // les logs pour du bruit normal.
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Void> handleNoResourceFound(NoResourceFoundException ex) {
        return ResponseEntity.notFound().build();
    }

    // Exception non typée : toujours ERROR avec stack trace
    // RGPD : on logue l'URI (identifiant technique) mais pas les query params ni les headers
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleUnexpected(Exception ex, HttpServletRequest request) {
        log.error("Exception non gérée sur {} {} - {}",
                request.getMethod(), request.getRequestURI(), ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Erreur interne du serveur"));
    }
}
