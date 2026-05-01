package com.myfinance.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "analytics")
public class AnalyticsProperties {

    private boolean enabled = true;
    private int rateLimitEventsPerMinute = 100;
    private Retention retention = new Retention();
    private Async async = new Async();

    public static class Retention {
        private int eventsDays = 180;
        private int errorsDays = 365;
        private boolean enabled = true;

        public int getEventsDays() { return eventsDays; }
        public void setEventsDays(int v) { this.eventsDays = v; }
        public int getErrorsDays() { return errorsDays; }
        public void setErrorsDays(int v) { this.errorsDays = v; }
        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean v) { this.enabled = v; }
    }

    public static class Async {
        private int queueCapacity = 1000;

        public int getQueueCapacity() { return queueCapacity; }
        public void setQueueCapacity(int v) { this.queueCapacity = v; }
    }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean v) { this.enabled = v; }
    public int getRateLimitEventsPerMinute() { return rateLimitEventsPerMinute; }
    public void setRateLimitEventsPerMinute(int v) { this.rateLimitEventsPerMinute = v; }
    public Retention getRetention() { return retention; }
    public void setRetention(Retention v) { this.retention = v; }
    public Async getAsync() { return async; }
    public void setAsync(Async v) { this.async = v; }
}
