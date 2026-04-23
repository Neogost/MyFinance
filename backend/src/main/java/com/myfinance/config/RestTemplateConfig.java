package com.myfinance.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@Configuration
@RequiredArgsConstructor
public class RestTemplateConfig {

    private final MarketDataProperties marketDataProperties;

    @Bean
    RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(marketDataProperties.getTimeoutMs());
        factory.setReadTimeout(marketDataProperties.getTimeoutMs());
        return new RestTemplate(factory);
    }
}
