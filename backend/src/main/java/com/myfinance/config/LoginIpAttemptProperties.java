package com.myfinance.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "security.login.ip")
@Data
public class LoginIpAttemptProperties {

    /** Nombre maximum d'échecs de connexion autorisés par IP dans la fenêtre. */
    private int maxAttempts = 20;

    /** Durée de la fenêtre glissante en minutes. */
    private int windowMinutes = 60;
}
