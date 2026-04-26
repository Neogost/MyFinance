package com.myfinance.dto;

import java.time.LocalDate;

public record UpdatePersonalInfoRequest(
        String firstName,
        String lastName,
        LocalDate birthDate,
        String birthPlace,
        String birthPostalCode,
        String jobTitle
) {}
