package com.myfinance.config;

import org.springframework.boot.web.servlet.ServletContextInitializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Force le cookie de session JSESSIONID à `Secure=true` sur les profils déployés
 * (docker, prod). Empêche que le cookie ne soit transmis en clair si le canal
 * HTTP entre le proxy QNAP et le conteneur Spring se trouvait un jour exposé.
 *
 * Couplé à {@link ForwardedHeadersConfig} (RemoteIpValve qui interprète
 * X-Forwarded-Proto), le cookie est correctement marqué Secure même quand
 * Tomcat ne reçoit que du HTTP interne et que le proxy ajoute le TLS externe.
 *
 * Override programmatique via l'API Servlet standard (SessionCookieConfig) :
 * prend le pas sur un éventuel `server.servlet.session.cookie.secure=false`
 * resté dans application-docker.properties (defense in depth — le code embarque
 * la sécurité, indépendamment d'une éventuelle mauvaise configuration).
 *
 * En profil dev, ce bean n'est pas activé : le cookie reste sans `Secure` car
 * le serveur tourne en HTTP local (le navigateur refuserait un cookie Secure
 * sur HTTP).
 */
@Configuration
@Profile({"docker", "prod"})
public class SessionCookieSecurityConfig {

    @Bean
    ServletContextInitializer secureSessionCookieInitializer() {
        return servletContext -> servletContext.getSessionCookieConfig().setSecure(true);
    }
}
