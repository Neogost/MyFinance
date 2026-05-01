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
        String jobTitle,
        Integer realExpensesTransportKm,
        Integer realExpensesTransportCv,
        Boolean realExpensesTransportElectric,
        Float realExpensesPublicTransport,
        Float realExpensesMeals,
        Float realExpensesClothing,
        Float realExpensesTraining,
        Float realExpensesEquipment,
        Float realExpensesPhone,
        Float realExpensesDoubleResidence,
        Float realExpensesOther,
        Integer realExpensesTeleworkDays,
        Float realExpensesTeleworkEmployerDaily,
        boolean analyticsOptOut
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
                user.getJobTitle(),
                user.getRealExpensesTransportKm(),
                user.getRealExpensesTransportCv(),
                user.getRealExpensesTransportElectric(),
                user.getRealExpensesPublicTransport(),
                user.getRealExpensesMeals(),
                user.getRealExpensesClothing(),
                user.getRealExpensesTraining(),
                user.getRealExpensesEquipment(),
                user.getRealExpensesPhone(),
                user.getRealExpensesDoubleResidence(),
                user.getRealExpensesOther(),
                user.getRealExpensesTeleworkDays(),
                user.getRealExpensesTeleworkEmployerDaily(),
                user.isAnalyticsOptOut()
        );
    }
}
