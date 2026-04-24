package com.myfinance.dto;

import com.myfinance.domain.InstrumentAllocation;

import java.math.BigDecimal;

public record InstrumentAllocationDto(String country, BigDecimal percentage) {

    public static InstrumentAllocationDto from(InstrumentAllocation a) {
        return new InstrumentAllocationDto(a.getCountry(), a.getPercentage());
    }
}
