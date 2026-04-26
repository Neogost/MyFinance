package com.myfinance.dto;

import com.myfinance.domain.InstrumentAllocation;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record InstrumentAllocationDto(
        @NotBlank @Size(max = 100) String country,

        @NotNull
        @DecimalMin(value = "0", message = "percentage doit être ≥ 0")
        @DecimalMax(value = "100", message = "percentage doit être ≤ 100")
        BigDecimal percentage
) {

    public static InstrumentAllocationDto from(InstrumentAllocation a) {
        return new InstrumentAllocationDto(a.getCountry(), a.getPercentage());
    }
}
