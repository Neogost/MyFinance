package com.myfinance.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.service.RegistrationRateLimitService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;

/**
 * Filtre IP-based sur POST /api/auth/register pour empêcher le flooding
 * de l'endpoint public (DoS BCrypt + saturation table user_registration_requests).
 *
 * Ordre HIGHEST_PRECEDENCE + 1 : exécuté juste après LoginRateLimitFilter,
 * avant Spring Security et tout traitement métier.
 *
 * IMPORTANT : derrière un reverse proxy, configurer
 * `server.forward-headers-strategy=NATIVE` (cf. SecurityConfig docs).
 * Sans cela, request.getRemoteAddr() retourne l'IP du proxy → toutes les
 * requêtes seraient comptabilisées comme provenant d'une même IP.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
@RequiredArgsConstructor
public class RegistrationRateLimitFilter extends OncePerRequestFilter {

    private final ObjectMapper objectMapper;

    // Optionnel pour rester compatible avec les @WebMvcTest qui n'incluent pas les @Service
    @Autowired(required = false)
    private RegistrationRateLimitService rateLimitService;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !("/api/auth/register".equals(request.getServletPath())
                && "POST".equalsIgnoreCase(request.getMethod()));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (rateLimitService != null) {
            String ip = request.getRemoteAddr();
            if (rateLimitService.estBloque(ip)) {
                long secondes = rateLimitService.secondesRestantes(ip);
                response.setStatus(429);
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.setCharacterEncoding("UTF-8");
                objectMapper.writeValue(response.getWriter(), Map.of(
                        "message", "Trop de demandes. Réessayez dans " + formaterDuree(secondes) + ".",
                        "secondesRestantes", secondes
                ));
                return;
            }
            // Comptabilise la tentative AVANT le traitement, pour rate-limit
            // même quand la requête est rejetée (validation 400, doublon no-op…).
            rateLimitService.enregistrerTentative(ip);
        }
        filterChain.doFilter(request, response);
    }

    private String formaterDuree(long secondes) {
        if (secondes >= 3600) return (secondes / 3600) + " h";
        if (secondes >= 60) return (secondes / 60) + " min";
        return secondes + " s";
    }
}
