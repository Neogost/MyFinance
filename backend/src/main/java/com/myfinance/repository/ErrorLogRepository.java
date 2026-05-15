package com.myfinance.repository;

import com.myfinance.domain.ErrorLog;
import com.myfinance.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface ErrorLogRepository extends JpaRepository<ErrorLog, Long> {

    @Modifying
    @Transactional
    @Query(value = "DELETE FROM error_logs WHERE created_at < :cutoffMs", nativeQuery = true)
    int deleteByCreatedAtBeforeMs(@Param("cutoffMs") long cutoffMs);

    void deleteByUser(User user);

    @Query(value = """
        SELECT e.fingerprint, e.error_type, e.source, e.level, e.message,
               MIN(e.created_at) as first_seen, MAX(e.created_at) as last_seen, COUNT(e.id) as cnt
        FROM error_logs e
        WHERE (:source IS NULL OR e.source = :source)
          AND (:level IS NULL OR e.level = :level)
          AND e.created_at >= :fromMs AND e.created_at <= :toMs
        GROUP BY e.fingerprint, e.error_type, e.source, e.level, e.message
        ORDER BY cnt DESC
    """, nativeQuery = true)
    List<Object[]> findErrorGroups(
            @Param("source") String source,
            @Param("level") String level,
            @Param("fromMs") long fromMs,
            @Param("toMs") long toMs);

    Page<ErrorLog> findByFingerprintOrderByCreatedAtDesc(String fingerprint, Pageable pageable);

    List<ErrorLog> findBySessionIdOrderByCreatedAtAsc(String sessionId);

    @Query(value = "SELECT COUNT(*) FROM error_logs WHERE created_at >= :fromMs AND created_at <= :toMs",
           nativeQuery = true)
    long countByCreatedAtBetween(@Param("fromMs") long fromMs, @Param("toMs") long toMs);

    @Query(value = "SELECT COUNT(*) FROM error_logs WHERE source = :source AND created_at >= :fromMs AND created_at <= :toMs",
           nativeQuery = true)
    long countBySourceAndCreatedAtBetween(@Param("source") String source,
                                          @Param("fromMs") long fromMs,
                                          @Param("toMs") long toMs);

    @Query(value = """
        SELECT strftime('%Y-%m-%d', created_at/1000, 'unixepoch') as day, source, COUNT(id) as cnt
        FROM error_logs
        WHERE created_at >= :fromMs AND created_at <= :toMs
        GROUP BY day, source
        ORDER BY day ASC
    """, nativeQuery = true)
    List<Object[]> findErrorTimeline(
            @Param("fromMs") long fromMs,
            @Param("toMs") long toMs);
}
