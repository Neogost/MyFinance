package com.myfinance.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.domain.User;
import com.myfinance.dto.UserDto;
import com.myfinance.service.LoginAttemptService;
import com.myfinance.service.LoginHistoryService;
import com.myfinance.service.LoginIpAttemptService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.ServletListenerRegistrationBean;
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
import org.springframework.security.web.session.HttpSessionEventPublisher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

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
    private LoginIpAttemptService loginIpAttemptService;

    @Autowired(required = false)
    private LoginHistoryService loginHistoryService;

    @Value("${cors.allowed-origins}")
    private String allowedOrigins;

    // false en dev (frontend sur port différent) et dans les tests — true en prod
    @Value("${security.csrf.enabled:true}")
    private boolean csrfEnabled;

    // Swagger UI exposé uniquement en dev (à activer manuellement dans application-dev.properties).
    // En prod/docker, l'UI est volontairement bloquée pour ne pas faciliter l'énumération des
    // endpoints par un attaquant. Pour une protection en profondeur, l'admin peut aussi désactiver
    // springdoc côté backend via springdoc.api-docs.enabled=false et springdoc.swagger-ui.enabled=false.
    @Value("${myfinance.swagger.enabled:false}")
    private boolean swaggerEnabled;

    /**
     * Publie les évènements `HttpSessionEvent` (création/destruction) au contexte Spring,
     * ce qui permet au {@code SessionRegistry} de détecter les sessions expirées et de les
     * retirer de la liste des sessions actives. Sans ce bean, une session expirée resterait
     * comptabilisée et empêcherait `maximumSessions(1)` de fonctionner correctement.
     */
    @Bean
    ServletListenerRegistrationBean<HttpSessionEventPublisher> httpSessionEventPublisher() {
        return new ServletListenerRegistrationBean<>(new HttpSessionEventPublisher());
    }

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
                .referrerPolicy(referrer -> referrer.policy(
                        org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter
                                .ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                .permissionsPolicyHeader(permissions -> permissions.policy(
                        // Désactive toutes les API navigateur sensibles : même en cas de XSS,
                        // l'attaquant ne peut pas accéder à la caméra, au micro, à la géoloc, etc.
                        "accelerometer=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), "
                                + "fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), "
                                + "midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), "
                                + "screen-wake-lock=(), sync-xhr=(), usb=(), web-share=(), xr-spatial-tracking=()"))
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
            .authorizeHttpRequests(auth -> {
                auth.requestMatchers("/api/auth/login", "/api/auth/register", "/api/version").permitAll();
                auth.requestMatchers("/api/retirement/parameters").permitAll();
                auth.requestMatchers("/api/analytics/track", "/api/analytics/error").permitAll();
                if (swaggerEnabled) {
                    auth.requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll();
                } else {
                    // denyAll explicite : sans cette règle, Swagger UI tomberait sur anyRequest().permitAll()
                    // car ses URLs ne sont pas sous /api/**
                    auth.requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").denyAll();
                }
                auth.requestMatchers("/api/**").authenticated();
                auth.anyRequest().permitAll(); // fichiers statiques et routes SPA React
            })
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
                    writeJson(response, HttpServletResponse.SC_OK, UserDto.from(user));
                })
                .failureHandler((request, response, exception) -> {
                    String login = request.getParameter("username");
                    log.warn("Échec d'authentification — login={} exception={}: {}", login, exception.getClass().getSimpleName(), exception.getMessage());
                    String ip = request.getRemoteAddr();
                    String ua = request.getHeader("User-Agent");

                    // Incrémente les compteurs (par login + par IP). Le verrou par-login
                    // n'est PAS exposé via 429 pour empêcher l'énumération de comptes :
                    // l'attaquant ne peut pas distinguer « compte existant verrouillé » de
                    // « identifiants incorrects ». Le 429 est réservé au rate-limit IP,
                    // qui blâme la source de l'attaque sans révéler l'existence d'un compte.
                    Integer nbEchecs = null;
                    if (loginAttemptService != null && login != null && !login.isBlank()) {
                        loginAttemptService.enregistrerEchec(login);
                        nbEchecs = loginAttemptService.getNbEchecs(login);
                    }
                    if (loginIpAttemptService != null) {
                        loginIpAttemptService.enregistrerEchec(ip);
                    }
                    if (loginHistoryService != null && login != null && !login.isBlank()) {
                        loginHistoryService.logFailure(login, ip, ua, nbEchecs);
                    }

                    // Si l'IP vient de basculer au-dessus du seuil, on retourne 429
                    // immédiatement (sans attendre la requête suivante).
                    if (loginIpAttemptService != null && loginIpAttemptService.estBloque(ip)) {
                        long secondes = loginIpAttemptService.secondesRestantes(ip);
                        writeJson(response, 429, Map.of(
                                "message", "Trop de tentatives depuis votre connexion. Réessayez dans "
                                           + formaterDuree(secondes) + ".",
                                "secondesRestantes", secondes
                        ));
                        return;
                    }

                    writeJson(response, HttpServletResponse.SC_UNAUTHORIZED,
                            Map.of("message", "Identifiants incorrects"));
                })
            )
            .logout(logout -> logout
                .logoutUrl("/api/auth/logout")
                .logoutSuccessHandler((request, response, authentication) -> {
                    writeJson(response, HttpServletResponse.SC_OK,
                            Map.of("message", "Déconnexion réussie"));
                })
            )
            .sessionManagement(session -> session
                // Une seule session active par utilisateur. Un nouveau login invalide la
                // session précédente du même utilisateur (un cookie volé devient inutilisable
                // dès que le propriétaire légitime se reconnecte).
                // maxSessionsPreventsLogin(false) → la nouvelle session gagne, l'ancienne est tuée.
                .maximumSessions(1)
                .maxSessionsPreventsLogin(false)
            )
            .exceptionHandling(ex -> ex
                // Retourne 401 JSON au lieu d'une redirection vers /login
                .authenticationEntryPoint((request, response, authException) -> {
                    writeJson(response, HttpServletResponse.SC_UNAUTHORIZED,
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

    /**
     * Écrit une réponse JSON avec encodage UTF-8 forcé. Sans setCharacterEncoding,
     * response.getWriter() retombe sur l'ISO-8859-1 par défaut de Tomcat et les caractères
     * accentués sortent mojibakés ("Non authentifié" → "Non authentifi\xe9").
     */
    private void writeJson(HttpServletResponse response, int status, Object body) throws java.io.IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getWriter(), body);
    }
}
