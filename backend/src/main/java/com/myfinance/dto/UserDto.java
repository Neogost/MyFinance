package com.myfinance.dto;

import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.User;

public record UserDto(
        Long id,
        String login,
        String firstName,
        String lastName,
        RoleEnum role
) {
    public static UserDto from(User user) {
        return new UserDto(
                user.getId(),
                user.getLogin(),
                user.getFirstName(),
                user.getLastName(),
                user.getRole()
        );
    }
}
