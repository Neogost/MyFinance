package com.myfinance.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "login_events")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String login;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LoginEventType eventType;

    private String ipAddress;

    @Column(length = 500)
    private String userAgent;

    // Nombre d'échecs consécutifs au moment de l'événement (null pour SUCCESS)
    private Integer failureCount;

    @Column(nullable = false)
    private LocalDateTime timestamp;
}
