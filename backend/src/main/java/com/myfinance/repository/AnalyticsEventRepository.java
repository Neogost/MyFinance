package com.myfinance.repository;

import com.myfinance.domain.AnalyticsEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface AnalyticsEventRepository extends JpaRepository<AnalyticsEvent, Long> {

    @Modifying
    @Transactional
    @Query(value = "DELETE FROM analytics_events WHERE created_at < :cutoffMs", nativeQuery = true)
    int deleteByCreatedAtBeforeMs(@Param("cutoffMs") long cutoffMs);

    // from/to en epoch ms (Long) — SQLite stocke les LocalDateTime en ms Unix
    @Query(value = """
        SELECT a.event_name, COUNT(a.id) as cnt
        FROM analytics_events a
        WHERE (:eventType IS NULL OR a.event_type = :eventType)
          AND a.created_at >= :fromMs AND a.created_at <= :toMs
        GROUP BY a.event_name
        ORDER BY cnt DESC
        LIMIT :lim
    """, nativeQuery = true)
    List<Object[]> findTopEvents(
            @Param("eventType") String eventType,
            @Param("fromMs") long fromMs,
            @Param("toMs") long toMs,
            @Param("lim") int lim);

    @Query(value = """
        SELECT strftime('%Y-%m-%d', created_at/1000, 'unixepoch') as day, COUNT(id) as cnt
        FROM analytics_events
        WHERE event_name = :eventName
          AND created_at >= :fromMs AND created_at <= :toMs
        GROUP BY day
        ORDER BY day ASC
    """, nativeQuery = true)
    List<Object[]> findTimeline(
            @Param("eventName") String eventName,
            @Param("fromMs") long fromMs,
            @Param("toMs") long toMs);

    List<AnalyticsEvent> findBySessionIdOrderByCreatedAtAsc(String sessionId);

    @Query(value = "SELECT COUNT(*) FROM analytics_events WHERE created_at >= :fromMs AND created_at <= :toMs",
           nativeQuery = true)
    long countByCreatedAtBetween(@Param("fromMs") long fromMs, @Param("toMs") long toMs);

    @Query(value = "SELECT COUNT(DISTINCT session_id) FROM analytics_events WHERE created_at >= :fromMs AND created_at <= :toMs",
           nativeQuery = true)
    long countDistinctSessionsByCreatedAtBetween(@Param("fromMs") long fromMs, @Param("toMs") long toMs);

    @Query(value = """
        SELECT strftime('%Y-%m-%d', created_at/1000, 'unixepoch') as day,
               COUNT(DISTINCT session_id) as sessions,
               COUNT(id) as events
        FROM analytics_events
        WHERE created_at >= :fromMs AND created_at <= :toMs
        GROUP BY day
        ORDER BY day ASC
    """, nativeQuery = true)
    List<Object[]> findDailyRetention(@Param("fromMs") long fromMs, @Param("toMs") long toMs);
}
