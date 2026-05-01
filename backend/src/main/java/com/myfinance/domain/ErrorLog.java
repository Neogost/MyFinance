package com.myfinance.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "error_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ErrorLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(length = 36)
    private String sessionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ErrorSource source;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ErrorLevel level;

    @Column(nullable = false, length = 200)
    private String errorType;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(columnDefinition = "TEXT")
    private String stackTrace;

    @Column(length = 10)
    private String requestMethod;

    @Column(length = 500)
    private String requestPath;

    private Integer httpStatus;

    @Column(columnDefinition = "TEXT")
    private String metadata;

    @Column(nullable = false, length = 64)
    private String fingerprint;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
