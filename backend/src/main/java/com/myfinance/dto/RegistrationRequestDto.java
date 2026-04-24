package com.myfinance.dto;

import com.myfinance.domain.RegistrationStatus;
import com.myfinance.domain.UserRegistrationRequest;

import java.time.LocalDateTime;

public record RegistrationRequestDto(
        Long id,
        String login,
        String firstName,
        String lastName,
        RegistrationStatus status,
        LocalDateTime createdAt,
        LocalDateTime reviewedAt,
        String reviewedBy
) {
    public static RegistrationRequestDto from(UserRegistrationRequest r) {
        return new RegistrationRequestDto(
                r.getId(),
                r.getLogin(),
                r.getFirstName(),
                r.getLastName(),
                r.getStatus(),
                r.getCreatedAt(),
                r.getReviewedAt(),
                r.getReviewedBy()
        );
    }
}
