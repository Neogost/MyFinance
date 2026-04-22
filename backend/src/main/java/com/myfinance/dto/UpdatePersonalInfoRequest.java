package com.myfinance.dto;

public record UpdatePersonalInfoRequest(
        String birthPlace,
        String birthPostalCode,
        String jobTitle
) {}
