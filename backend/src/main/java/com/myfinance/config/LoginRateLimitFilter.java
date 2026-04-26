package com.myfinance.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.service.LoginAttemptService;
import com.myfinance.service.LoginHistoryService;
import com.myfinance.service.LoginIpAttemptService;
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
 * Filtre de rate-limit sur POST /api/auth/login. Deux niveaux de protection :
 *
 *   1. Rate-limit IP (LoginIpAttemptService) : si l'IP a dépassé son quota d'échecs récents,
 *      retourne 429 avec secondesRestantes. Couvre le balayage massif et empêche qu'un
 *      attaquant ne DoS un compte précis (il sera lui-même rate-limité par IP).
 *
 *   2. Verrou par login (LoginAttemptService) : si le login est verrouillé suite à des échecs
 *      consécutifs, retourne 401 SANS révéler l'existence du compte (anti-énumération).
 *      Spring Security ne valide pas les credentials — la réponse est identique à un
 *      « identifiants incorrects » classique.
 *
 * Ordre HIGHEST_PRECEDENCE : exécuté avant Spring Security et avant le service métier.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@RequiredArgsConstructor
public class LoginRateLimitFilter extends OncePerRequestFilter {

    private final ObjectMapper objectMapper;

    // Optionnel pour rester compatible avec les @WebMvcTest qui n'incluent pas les @Service
    @Autowired(required = false)
    private LoginAttemptService loginAttemptService;

    @Autowired(required = false)
    private LoginIpAttemptService loginIpAttemptService;

    @Autowired(required = false)
    private LoginHistoryService loginHistoryService;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !("/api/auth/login".equals(request.getServletPath())
                && "POST".equalsIgnoreCase(request.getMethod()));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String login = request.getParameter("username");
        String ip = request.getRemoteAddr();
        String ua = request.getHeader("User-Agent");

        // 1. Rate-limit IP — réponse 429 explicite (l'IP est blâmée, pas un compte précis)
        if (loginIpAttemptService != null && loginIpAttemptService.estBloque(ip)) {
            if (loginHistoryService != null) {
                loginHistoryService.logBlocked(login, ip, ua);
            }
            long secondes = loginIpAttemptService.secondesRestantes(ip);
            response.setStatus(429);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            objectMapper.writeValue(response.getWriter(), Map.of(
                    "message", "Trop de tentatives depuis votre connexion. Réessayez dans " + formaterDuree(secondes) + ".",
                    "secondesRestantes", secondes
            ));
            return;
        }

        // 2. Verrou par login — réponse 401 SILENCIEUSE (anti-énumération de comptes)
        // Le client ne peut pas distinguer « compte existant verrouillé » de « identifiants incorrects ».
        if (loginAttemptService != null && loginAttemptService.estBloque(login)) {
            if (loginHistoryService != null) {
                loginHistoryService.logBlocked(login, ip, ua);
            }
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            objectMapper.writeValue(response.getWriter(),
                    Map.of("message", "Identifiants incorrects"));
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String formaterDuree(long secondes) {
        if (secondes >= 3600) return (secondes / 3600) + " h";
        if (secondes >= 60) return (secondes / 60) + " min";
        return secondes + " s";
    }
}
