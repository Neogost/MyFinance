package com.myfinance.dto;

import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.SafetyNetMode;
import com.myfinance.domain.User;

import java.time.LocalDate;

public record UserDto(
        Long id,
        String login,
        String firstName,
        String lastName,
        LocalDate birthDate,
        RoleEnum role,
        Float fiscalParts,
        Boolean useFlatRateDeduction,
        Float customProfessionalDeduction,
        Long familyGroupId,
        SafetyNetMode safetyNetMode,
        Double safetyNetMonths,
        Double safetyNetAmount,
        String birthPlace,
        String birthPostalCode,
        String jobTitle
) {
    public static UserDto from(User user) {
        return new UserDto(
                user.getId(),
                user.getLogin(),
                user.getFirstName(),
                user.getLastName(),
                user.getBirthDate(),
                user.getRole(),
                user.getFiscalParts(),
                user.getUseFlatRateDeduction(),
                user.getCustomProfessionalDeduction(),
                user.getFamilyGroup() != null ? user.getFamilyGroup().getId() : null,
                user.getSafetyNetMode(),
                user.getSafetyNetMonths(),
                user.getSafetyNetAmount(),
                user.getBirthPlace(),
                user.getBirthPostalCode(),
                user.getJobTitle()
        );
    }
}
