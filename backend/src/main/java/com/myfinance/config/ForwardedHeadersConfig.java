package com.myfinance.config;

import org.apache.catalina.valves.RemoteIpValve;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Active la valve Tomcat RemoteIpValve sur les profils déployés derrière un reverse proxy
 * (docker, prod). La valve lit l'en-tête `X-Forwarded-For` envoyé par le proxy et met à jour
 * `request.getRemoteAddr()` avec la vraie IP du client final, ainsi que le scheme via
 * `X-Forwarded-Proto`.
 *
 * Sans cette config, toutes les requêtes paraissent provenir de l'IP du proxy, ce qui 
 * rend l'historique de connexion et le rate-limit IP totalement inopérants.
 *
 * Sécurité : par défaut RemoteIpValve ne fait confiance qu'aux IPs internes RFC 1918
 * (10/8, 172.16/12, 192.168/16) et loopback. Comme le conteneur Spring n'est pas exposé
 * directement sur internet (seul le proxy QNAP l'est), il est sûr de faire confiance
 * à l'en-tête X-Forwarded-For envoyé par ce proxy.
 *
 * Action requise côté QNAP : vérifier que le reverse proxy (Application Portal /
 * myQNAPcloud) ajoute bien `X-Forwarded-For` aux requêtes proxifiées. Sur la plupart
 * des installations nginx-based, c'est par défaut.
 */
@Configuration
@Profile({"docker", "prod"})
public class ForwardedHeadersConfig {

    @Bean
    WebServerFactoryCustomizer<TomcatServletWebServerFactory> remoteIpValveCustomizer() {
        return factory -> {
            RemoteIpValve valve = new RemoteIpValve();
            valve.setRemoteIpHeader("X-Forwarded-For");
            valve.setProtocolHeader("X-Forwarded-Proto");
            factory.addContextValves(valve);
        };
    }
}
