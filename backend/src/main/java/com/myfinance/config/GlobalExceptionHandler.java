package com.myfinance.config;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

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

    // Accès refusé Spring Security 6 (@PreAuthorize) → 403
    // AuthorizationDeniedException extends AccessDeniedException
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Accès refusé"));
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
