package com.myfinance.repository;

import com.myfinance.domain.Instrument;
import com.myfinance.domain.InstrumentSectorAllocation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InstrumentSectorAllocationRepository extends JpaRepository<InstrumentSectorAllocation, Long> {
    List<InstrumentSectorAllocation> findByInstrumentInOrderByPercentageDesc(List<Instrument> instruments);
    void deleteByInstrument(Instrument instrument);
}
