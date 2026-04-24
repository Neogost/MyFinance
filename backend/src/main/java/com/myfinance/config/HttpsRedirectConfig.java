package com.myfinance.config;

import org.apache.catalina.connector.Connector;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Ajoute un connecteur HTTP sur le port 8080 qui redirige (302) vers HTTPS.
 * Actif uniquement en profil prod — en dev l'application reste en HTTP.
 */
@Configuration
@Profile("prod")
public class HttpsRedirectConfig {

    @Value("${server.port:8443}")
    private int httpsPort;

    @Bean
    WebServerFactoryCustomizer<TomcatServletWebServerFactory> httpToHttpsRedirect() {
        return factory -> {
            Connector connector = new Connector(TomcatServletWebServerFactory.DEFAULT_PROTOCOL);
            connector.setScheme("http");
            connector.setPort(8080);
            connector.setSecure(false);
            connector.setRedirectPort(httpsPort);
            factory.addAdditionalTomcatConnectors(connector);
        };
    }
}
