package com.myfinance.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "market.data")
@Data
public class MarketDataProperties {

    /** Timeout des appels HTTP vers Twelve Data, CoinGecko et ECB (en ms). */
    private int timeoutMs = 10_000;
}
