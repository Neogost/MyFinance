package com.myfinance.dto;

import com.myfinance.domain.InstrumentSectorAllocation;

import java.math.BigDecimal;

public record InstrumentSectorAllocationDto(String sector, BigDecimal percentage) {

    public static InstrumentSectorAllocationDto from(InstrumentSectorAllocation a) {
        return new InstrumentSectorAllocationDto(a.getSector(), a.getPercentage());
    }
}
