package com.myfinance.repository;

import com.myfinance.domain.Instrument;
import com.myfinance.domain.InstrumentAllocation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InstrumentAllocationRepository extends JpaRepository<InstrumentAllocation, Long> {

    List<InstrumentAllocation> findByInstrumentInOrderByPercentageDesc(List<Instrument> instruments);

    void deleteByInstrument(Instrument instrument);
}
