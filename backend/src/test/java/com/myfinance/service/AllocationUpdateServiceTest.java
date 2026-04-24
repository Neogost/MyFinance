package com.myfinance.service;

import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.Instrument;
import com.myfinance.domain.InstrumentAllocation;
import com.myfinance.repository.InstrumentAllocationRepository;
import com.myfinance.repository.InstrumentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AllocationUpdateServiceTest {

    @Mock InstrumentRepository           instrumentRepository;
    @Mock InstrumentAllocationRepository allocationRepository;
    @Mock BoursoramaClient               boursoramaClient;

    @InjectMocks AllocationUpdateService allocationUpdateService;

    @Test
    void updateAll_instrumentAvecDonnees_persiste() {
        Instrument etf = instrument("1rTPCEU");
        when(instrumentRepository.findByCategoryAndStablePriceFalseAndBoursoramaSymbolIsNotNull(AssetCategory.BOURSE))
                .thenReturn(List.of(etf));
        when(boursoramaClient.getCountryAllocation("1rTPCEU")).thenReturn(List.of(
                new BoursoramaClient.CountryEntry("Royaume-Uni", new BigDecimal("22.48")),
                new BoursoramaClient.CountryEntry("France",      new BigDecimal("14.23"))
        ));

        int result = allocationUpdateService.updateAll();

        assertThat(result).isEqualTo(1);
        verify(allocationRepository).deleteByInstrument(etf);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<InstrumentAllocation>> captor = ArgumentCaptor.forClass(List.class);
        verify(allocationRepository).saveAll(captor.capture());
        assertThat(captor.getValue()).hasSize(2);
        assertThat(captor.getValue().get(0).getCountry()).isEqualTo("Royaume-Uni");
        assertThat(captor.getValue().get(1).getCountry()).isEqualTo("France");
    }

    @Test
    void updateAll_allocationVide_ignoreLInstrument() {
        Instrument etf = instrument("1rTESE");
        when(instrumentRepository.findByCategoryAndStablePriceFalseAndBoursoramaSymbolIsNotNull(AssetCategory.BOURSE))
                .thenReturn(List.of(etf));
        when(boursoramaClient.getCountryAllocation("1rTESE")).thenReturn(List.of());

        int result = allocationUpdateService.updateAll();

        assertThat(result).isZero();
        verify(allocationRepository, never()).deleteByInstrument(any());
        verify(allocationRepository, never()).saveAll(any());
    }

    @Test
    void updateAll_aucunInstrument_retourneZero() {
        when(instrumentRepository.findByCategoryAndStablePriceFalseAndBoursoramaSymbolIsNotNull(AssetCategory.BOURSE))
                .thenReturn(List.of());

        int result = allocationUpdateService.updateAll();

        assertThat(result).isZero();
        verifyNoInteractions(boursoramaClient);
    }

    private Instrument instrument(String boursoramaSymbol) {
        return Instrument.builder()
                .id(1L)
                .category(AssetCategory.BOURSE)
                .isin("FR0000000000")
                .name("Test ETF")
                .currency("EUR")
                .boursoramaSymbol(boursoramaSymbol)
                .build();
    }
}
