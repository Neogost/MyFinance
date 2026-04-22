package com.myfinance.dto;

import com.myfinance.domain.User;

public record FamilyMemberDto(
        Long id,
        String firstName,
        String lastName,
        String login
) {
    public static FamilyMemberDto from(User user) {
        return new FamilyMemberDto(
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getLogin()
        );
    }
}
