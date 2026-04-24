package com.myfinance.service;

import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.Instrument;
import com.myfinance.domain.InstrumentAllocation;
import com.myfinance.repository.InstrumentAllocationRepository;
import com.myfinance.repository.InstrumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AllocationUpdateService {

    private final InstrumentRepository           instrumentRepository;
    private final InstrumentAllocationRepository allocationRepository;
    private final BoursoramaClient               boursoramaClient;

    @Transactional
    public int updateAll() {
        List<Instrument> instruments = instrumentRepository
                .findByCategoryAndStablePriceFalseAndBoursoramaSymbolIsNotNull(AssetCategory.BOURSE);

        log.info("[Allocation] {} instrument(s) BOURSE à traiter", instruments.size());
        int updated = 0;

        for (Instrument inst : instruments) {
            List<BoursoramaClient.CountryEntry> entries =
                    boursoramaClient.getCountryAllocation(inst.getBoursoramaSymbol());

            if (entries.isEmpty()) {
                log.warn("[Allocation] Aucune donnée pour symbole {}", inst.getBoursoramaSymbol());
                continue;
            }

            allocationRepository.deleteByInstrument(inst);
            List<InstrumentAllocation> allocations = entries.stream()
                    .map(e -> InstrumentAllocation.builder()
                            .instrument(inst)
                            .country(e.name())
                            .percentage(e.percentage())
                            .fetchedAt(LocalDateTime.now())
                            .build())
                    .toList();
            allocationRepository.saveAll(allocations);
            updated++;
        }

        log.info("[Allocation] {} instrument(s) mis à jour", updated);
        return updated;
    }
}
