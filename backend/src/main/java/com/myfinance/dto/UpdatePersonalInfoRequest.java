package com.myfinance.dto;

import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpdatePersonalInfoRequest(
        @Size(max = 100)        String firstName,
        @Size(max = 100)        String lastName,
        @Past                   LocalDate birthDate,
        @Size(max = 100)        String birthPlace,
        @Size(max = 20)         String birthPostalCode,
        @Size(max = 200)        String jobTitle
) {}
