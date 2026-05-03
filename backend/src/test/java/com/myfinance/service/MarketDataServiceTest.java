package com.myfinance.service;

import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.Instrument;
import com.myfinance.dto.BulkSnapshotResultDto;
import com.myfinance.dto.MarketDataReportDto;
import com.myfinance.repository.InstrumentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MarketDataServiceTest {

    @Mock BoursoramaClient boursoramaClient;
    @Mock CoinGeckoClient coinGeckoClient;
    @Mock EcbRateClient ecbRateClient;
    @Mock InstrumentRepository instrumentRepository;
    @Mock ExchangeRateService exchangeRateService;
    @Mock PortfolioSnapshotService portfolioSnapshotService;
    @Mock InstrumentPriceHistoryService priceHistoryService;
    @Mock ExchangeRateHistoryService rateHistoryService;

    @InjectMocks MarketDataService marketDataService;

    // ── resolveSymbols ─────────────────────────────────────────

    @Test
    void resolveSymbols_cryptoNonResolu_stockeCoinGeckoId() {
        Instrument inst = instrument(AssetCategory.CRYPTO, null, "BTC", null);
        when(instrumentRepository.findByCategoryAndCoinGeckoIdIsNullAndStablePriceFalse(AssetCategory.CRYPTO))
                .thenReturn(List.of(inst));
        when(coinGeckoClient.searchId("BTC")).thenReturn(Optional.of("bitcoin"));

        int count = marketDataService.resolveSymbols(new ArrayList<>());

        assertThat(count).isEqualTo(1);
        assertThat(inst.getCoinGeckoId()).isEqualTo("bitcoin");
        verify(instrumentRepository).save(inst);
    }

    @Test
    void resolveSymbols_cryptoNonTrouve_ajouteErreur() {
        Instrument inst = instrument(AssetCategory.CRYPTO, null, "UNKNOWN", null);
        when(instrumentRepository.findByCategoryAndCoinGeckoIdIsNullAndStablePriceFalse(AssetCategory.CRYPTO))
                .thenReturn(List.of(inst));
        when(coinGeckoClient.searchId("UNKNOWN")).thenReturn(Optional.empty());

        List<String> errors = new ArrayList<>();
        int count = marketDataService.resolveSymbols(errors);

        assertThat(count).isZero();
        assertThat(errors).hasSize(1);
        verify(instrumentRepository, never()).save(any());
    }

    // ── updatePrices ───────────────────────────────────────────

    @Test
    void updatePrices_bourse_metAJourViaBoursorama() {
        Instrument inst = instrument(AssetCategory.BOURSE, "FR0011550185", null, null);
        inst.setBoursoramaSymbol("1rTESE");
        when(instrumentRepository.findByCategoryAndStablePriceFalseAndBoursoramaSymbolIsNotNull(AssetCategory.BOURSE))
                .thenReturn(List.of(inst));
        when(instrumentRepository.findByCategoryAndStablePriceFalseAndCoinGeckoIdIsNotNull(AssetCategory.CRYPTO))
                .thenReturn(List.of());
        when(boursoramaClient.getPrice("1rTESE")).thenReturn(Optional.of(new BigDecimal("30.84")));

        int[] result = marketDataService.updatePrices(new ArrayList<>());

        assertThat(result[0]).isEqualTo(1);
        assertThat(result[1]).isZero();
        assertThat(inst.getLastPrice()).isEqualByComparingTo("30.84");
        assertThat(inst.getLastPriceUpdatedAt()).isNotNull();
        verify(boursoramaClient, times(1)).getPrice("1rTESE");
    }

    @Test
    void updatePrices_boursoramaIndisponible_compteFailed() {
        Instrument inst = instrument(AssetCategory.BOURSE, "FR0011550185", null, null);
        inst.setBoursoramaSymbol("1rTESE");
        when(instrumentRepository.findByCategoryAndStablePriceFalseAndBoursoramaSymbolIsNotNull(AssetCategory.BOURSE))
                .thenReturn(List.of(inst));
        when(instrumentRepository.findByCategoryAndStablePriceFalseAndCoinGeckoIdIsNotNull(AssetCategory.CRYPTO))
                .thenReturn(List.of());
        when(boursoramaClient.getPrice("1rTESE")).thenReturn(Optional.empty());

        List<String> errors = new ArrayList<>();
        int[] result = marketDataService.updatePrices(errors);

        assertThat(result[0]).isZero();
        assertThat(result[1]).isEqualTo(1);
        assertThat(errors).hasSize(1);
    }

    @Test
    void updatePrices_crypto_groupeParAppelUnique() {
        Instrument btc = instrument(AssetCategory.CRYPTO, null, "BTC", "bitcoin");
        Instrument eth = instrument(AssetCategory.CRYPTO, null, "ETH", "ethereum");
        when(instrumentRepository.findByCategoryAndStablePriceFalseAndBoursoramaSymbolIsNotNull(AssetCategory.BOURSE))
                .thenReturn(List.of());
        when(instrumentRepository.findByCategoryAndStablePriceFalseAndCoinGeckoIdIsNotNull(AssetCategory.CRYPTO))
                .thenReturn(List.of(btc, eth));
        when(coinGeckoClient.getPrices(anyList())).thenReturn(Map.of(
                "bitcoin", new BigDecimal("42000"),
                "ethereum", new BigDecimal("2200")
        ));

        int[] result = marketDataService.updatePrices(new ArrayList<>());

        assertThat(result[0]).isEqualTo(2);
        assertThat(result[1]).isZero();
        verify(coinGeckoClient, times(1)).getPrices(anyList());
    }

    // ── runFullUpdate ──────────────────────────────────────────

    @Test
    void runFullUpdate_retourneRapportComplet() {
        when(instrumentRepository.findByCategoryAndCoinGeckoIdIsNullAndStablePriceFalse(any())).thenReturn(List.of());
        when(instrumentRepository.findByCategoryAndStablePriceFalseAndBoursoramaSymbolIsNotNull(any())).thenReturn(List.of());
        when(instrumentRepository.findByCategoryAndStablePriceFalseAndCoinGeckoIdIsNotNull(any())).thenReturn(List.of());
        when(ecbRateClient.getRates()).thenReturn(Map.of("USD", new BigDecimal("1.09")));
        when(portfolioSnapshotService.createForAllUsers(any()))
                .thenReturn(new BulkSnapshotResultDto(2, 0, 0));

        MarketDataReportDto report = marketDataService.runFullUpdate();

        assertThat(report).isNotNull();
        assertThat(report.ratesUpdated()).isEqualTo(1);
        assertThat(report.snapshotsCreated()).isEqualTo(2);
        assertThat(report.errors()).isEmpty();
        assertThat(report.executedAt()).isNotNull();
    }

    @Test
    void runFullUpdate_ecbVide_ajouteErreurMaisNeBloqueRien() {
        when(instrumentRepository.findByCategoryAndCoinGeckoIdIsNullAndStablePriceFalse(any())).thenReturn(List.of());
        when(instrumentRepository.findByCategoryAndStablePriceFalseAndBoursoramaSymbolIsNotNull(any())).thenReturn(List.of());
        when(instrumentRepository.findByCategoryAndStablePriceFalseAndCoinGeckoIdIsNotNull(any())).thenReturn(List.of());
        when(ecbRateClient.getRates()).thenReturn(Map.of());
        when(portfolioSnapshotService.createForAllUsers(any()))
                .thenReturn(new BulkSnapshotResultDto(1, 0, 0));

        MarketDataReportDto report = marketDataService.runFullUpdate();

        assertThat(report.ratesUpdated()).isZero();
        assertThat(report.snapshotsCreated()).isEqualTo(1);
        assertThat(report.errors()).hasSize(1);
    }

    // ── Helpers ────────────────────────────────────────────────

    private Instrument instrument(AssetCategory category, String isin, String ticker, String coinGeckoId) {
        return Instrument.builder()
                .id(1L)
                .category(category)
                .isin(isin)
                .ticker(ticker)
                .name("Test Instrument")
                .currency("EUR")
                .coinGeckoId(coinGeckoId)
                .build();
    }
}
