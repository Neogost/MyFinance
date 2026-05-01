package com.myfinance.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

@Configuration
@EnableAsync
public class AnalyticsAsyncConfig {

    private final AnalyticsProperties props;

    public AnalyticsAsyncConfig(AnalyticsProperties props) {
        this.props = props;
    }

    /**
     * Single-thread executor pour sérialiser les écritures SQLite analytics.
     * DiscardPolicy : si la queue est pleine, l'event est silencieusement ignoré
     * plutôt que de bloquer le thread applicatif.
     */
    @Bean(name = "analyticsExecutor")
    public Executor analyticsExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(1);
        executor.setQueueCapacity(props.getAsync().getQueueCapacity());
        executor.setThreadNamePrefix("analytics-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.DiscardPolicy());
        executor.initialize();
        return executor;
    }
}
