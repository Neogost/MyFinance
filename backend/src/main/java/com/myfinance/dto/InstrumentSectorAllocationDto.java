package com.myfinance.dto;

import com.myfinance.domain.InstrumentSectorAllocation;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record InstrumentSectorAllocationDto(
        @NotBlank @Size(max = 100) String sector,

        @NotNull
        @DecimalMin(value = "0", message = "percentage doit être ≥ 0")
        @DecimalMax(value = "100", message = "percentage doit être ≤ 100")
        BigDecimal percentage
) {

    public static InstrumentSectorAllocationDto from(InstrumentSectorAllocation a) {
        return new InstrumentSectorAllocationDto(a.getSector(), a.getPercentage());
    }
}
