package com.myfinance.repository;

import com.myfinance.domain.LoginEvent;
import com.myfinance.domain.LoginEventType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface LoginEventRepository extends JpaRepository<LoginEvent, Long> {

    /** Connexions réussies d'un login donné, ordonnées les plus récentes en tête — pour le calcul du streak quotidien. */
    @Query("SELECT e FROM LoginEvent e WHERE e.login = :login AND e.eventType = com.myfinance.domain.LoginEventType.SUCCESS ORDER BY e.timestamp DESC")
    List<LoginEvent> findSuccessfulByLoginOrderByTimestampDesc(@Param("login") String login);


    @Query(value = """
            SELECT e FROM LoginEvent e
            WHERE (:login IS NULL OR LOWER(e.login) LIKE LOWER(CONCAT('%', :login, '%')))
            AND (:eventType IS NULL OR e.eventType = :eventType)
            AND (:from IS NULL OR e.timestamp >= :from)
            AND (:to IS NULL OR e.timestamp <= :to)
            ORDER BY e.timestamp DESC
            """,
           countQuery = """
            SELECT COUNT(e) FROM LoginEvent e
            WHERE (:login IS NULL OR LOWER(e.login) LIKE LOWER(CONCAT('%', :login, '%')))
            AND (:eventType IS NULL OR e.eventType = :eventType)
            AND (:from IS NULL OR e.timestamp >= :from)
            AND (:to IS NULL OR e.timestamp <= :to)
            """)
    Page<LoginEvent> findWithFilters(
            @Param("login") String login,
            @Param("eventType") LoginEventType eventType,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            Pageable pageable);
}
