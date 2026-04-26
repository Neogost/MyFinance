package com.myfinance.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "security.registration")
@Data
public class RegistrationRateLimitProperties {

    /** Nombre maximum de demandes d'inscription par IP dans la fenêtre. */
    private int maxAttempts = 5;

    /** Durée de la fenêtre glissante en minutes. */
    private int windowMinutes = 60;
}
