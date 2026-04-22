package com.myfinance.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.domain.User;
import com.myfinance.service.LoginAttemptService;
import com.myfinance.service.LoginHistoryService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity // active @PreAuthorize sur les controllers
@RequiredArgsConstructor
public class SecurityConfig {

    private final ObjectMapper objectMapper;

    // Optionnel pour rester compatible avec les @WebMvcTest qui n'incluent pas les @Service
    @Autowired(required = false)
    private LoginAttemptService loginAttemptService;

    @Autowired(required = false)
    private LoginHistoryService loginHistoryService;

    @Value("${cors.allowed-origins}")
    private String allowedOrigins;

    // UserDetailsService + PasswordEncoder sont déclarés comme beans séparément.
    // Spring Security les détecte automatiquement et construit le DaoAuthenticationProvider.

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(allowedOrigins.split(",")));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true); // nécessaire pour envoyer le cookie de session

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable()) // acceptable pour une app locale mono-utilisateur
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/login").permitAll()
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
                .anyRequest().authenticated()
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
                    payload.put("id",        user.getId());
                    payload.put("login",     user.getLogin());
                    payload.put("firstName", user.getFirstName());
                    payload.put("lastName",  user.getLastName());
                    payload.put("role",      user.getRole());
                    payload.put("birthDate", user.getBirthDate());
                    objectMapper.writeValue(response.getWriter(), payload);
                })
                .failureHandler((request, response, exception) -> {
                    String login = request.getParameter("username");
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
