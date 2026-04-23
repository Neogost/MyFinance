package com.myfinance.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "scheduler")
@Data
public class SchedulerProperties {

    /** Active le scheduler mensuel (Yahoo Finance, CoinGecko, ECB, snapshots). Désactivé par défaut, activé en profil prod. */
    private boolean enabled = false;
}
