package com.myfinance.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "security.login")
@Data
public class LoginRateLimitProperties {

    /** Nombre d'échecs consécutifs avant le premier blocage. */
    private int maxAttempts = 5;

    /** Durée du premier blocage en minutes (doublement à chaque tranche). */
    private long baseLockMinutes = 5;

    /** Durée maximale de blocage en minutes (plafond). */
    private long maxLockMinutes = 80;
}
