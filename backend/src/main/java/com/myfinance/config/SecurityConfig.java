package com.myfinance.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.domain.User;
import com.myfinance.service.LoginAttemptService;
import com.myfinance.service.LoginHistoryService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
@Slf4j
public class SecurityConfig {

    private final ObjectMapper objectMapper;

    // Optionnel pour rester compatible avec les @WebMvcTest qui n'incluent pas les @Service
    @Autowired(required = false)
    private LoginAttemptService loginAttemptService;

    @Autowired(required = false)
    private LoginHistoryService loginHistoryService;

    @Value("${cors.allowed-origins}")
    private String allowedOrigins;

    // false en dev (frontend sur port différent) et dans les tests — true en prod
    @Value("${security.csrf.enabled:true}")
    private boolean csrfEnabled;

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(allowedOrigins.split(",")));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Content-Type", "Accept", "X-XSRF-TOKEN"));
        config.setAllowCredentials(true); // nécessaire pour envoyer le cookie de session
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        // CSRF : double-submit cookie (Axios lit XSRF-TOKEN et renvoie X-XSRF-TOKEN)
        // Désactivé en dev (cross-origin :3000/:8080) et dans les tests
        if (csrfEnabled) {
            http.csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
                .ignoringRequestMatchers("/api/auth/login", "/api/auth/register") // endpoints publics
            );
        } else {
            http.csrf(csrf -> csrf.disable());
        }

        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .headers(headers -> headers
                .frameOptions(frame -> frame.deny())
                .contentTypeOptions(Customizer.withDefaults())
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31536000)
                )
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives(
                        "default-src 'self'; " +
                        "style-src 'self' 'unsafe-inline'; " +
                        "script-src 'self'; " +
                        "img-src 'self' data:; " +
                        "font-src 'self' data:; " +
                        "connect-src 'self'; " +
                        "object-src 'none'; " +
                        "base-uri 'self'"
                    )
                )
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/login", "/api/auth/register").permitAll()
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll() // fichiers statiques et routes SPA React
            )
            .formLogin(form -> form
                .loginProcessingUrl("/api/auth/login")
                .successHandler((request, response, authentication) -> {
                    if (loginAttemptService != null) {
                        loginAttemptService.enregistrerSucces(authentication.getName());
                    }
                    if (loginHistoryService != null) {
                        loginHistoryService.logSuccess(
                                authentication.getName(),
                                request.getRemoteAddr(),
                                request.getHeader("User-Agent"));
                    }
                    User user = (User) authentication.getPrincipal();
                    response.setStatus(HttpServletResponse.SC_OK);
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    Map<String, Object> payload = new HashMap<>();
                    payload.put("id",            user.getId());
                    payload.put("login",         user.getLogin());
                    payload.put("firstName",     user.getFirstName());
                    payload.put("lastName",      user.getLastName());
                    payload.put("role",          user.getRole());
                    payload.put("birthDate",     user.getBirthDate());
                    payload.put("familyGroupId", user.getFamilyGroup() != null ? user.getFamilyGroup().getId() : null);
                    objectMapper.writeValue(response.getWriter(), payload);
                })
                .failureHandler((request, response, exception) -> {
                    String login = request.getParameter("username");
                    log.warn("Échec d'authentification — login={} exception={}: {}", login, exception.getClass().getSimpleName(), exception.getMessage());
                    String ip = request.getRemoteAddr();
                    String ua = request.getHeader("User-Agent");
                    if (loginAttemptService != null && login != null && !login.isBlank()) {
                        loginAttemptService.enregistrerEchec(login);
                        int nbEchecs = loginAttemptService.getNbEchecs(login);
                        if (loginHistoryService != null) {
                            loginHistoryService.logFailure(login, ip, ua, nbEchecs);
                        }
                        if (loginAttemptService.estBloque(login)) {
                            long secondes = loginAttemptService.secondesRestantes(login);
                            response.setStatus(429);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            objectMapper.writeValue(response.getWriter(), Map.of(
                                    "message", "Compte bloqué après trop de tentatives. Réessayez dans "
                                               + formaterDuree(secondes) + ".",
                                    "secondesRestantes", secondes
                            ));
                            return;
                        }
                    } else if (loginHistoryService != null && login != null && !login.isBlank()) {
                        loginHistoryService.logFailure(login, ip, ua, null);
                    }
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    objectMapper.writeValue(response.getWriter(),
                            Map.of("message", "Identifiants incorrects"));
                })
            )
            .logout(logout -> logout
                .logoutUrl("/api/auth/logout")
                .logoutSuccessHandler((request, response, authentication) -> {
                    response.setStatus(HttpServletResponse.SC_OK);
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    objectMapper.writeValue(response.getWriter(),
                            Map.of("message", "Déconnexion réussie"));
                })
            )
            .exceptionHandling(ex -> ex
                // Retourne 401 JSON au lieu d'une redirection vers /login
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    objectMapper.writeValue(response.getWriter(),
                            Map.of("message", "Non authentifié"));
                })
            );

        return http.build();
    }

    private String formaterDuree(long secondes) {
        if (secondes >= 3600) return (secondes / 3600) + " h";
        if (secondes >= 60) return (secondes / 60) + " min";
        return secondes + " s";
    }
}
