package com.myfinance.service;

import com.myfinance.domain.*;
import com.myfinance.dto.ConfirmCryptoHistoryRequest;
import com.myfinance.dto.CryptoCessionDto;
import com.myfinance.dto.CryptoTaxStateDto;
import com.myfinance.dto.CryptoTaxSummaryDto;
import com.myfinance.repository.ExchangeRateHistoryRepository;
import com.myfinance.repository.InstrumentPriceHistoryRepository;
import com.myfinance.repository.PositionOrderRepository;
import com.myfinance.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CryptoTaxServiceTest {

    @Mock PositionOrderRepository        positionOrderRepository;
    @Mock InstrumentPriceHistoryRepository priceHistoryRepository;
    @Mock ExchangeRateHistoryRepository  exchangeRateHistoryRepository;
    @Mock UserRepository                 userRepository;

    @InjectMocks CryptoTaxService cryptoTaxService;

    User user;
    Instrument btcInstrument;
    Position btcPosition;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).login("test").role(RoleEnum.USER).build();

        btcInstrument = new Instrument();
        btcInstrument.setId(10L);
        btcInstrument.setName("Bitcoin");
        btcInstrument.setCurrency("EUR");

        btcPosition = Position.builder()
                .id(100L).user(user)
                .category(AssetCategory.CRYPTO)
                .instrument(btcInstrument)
                .label("BTC").currency("EUR")
                .build();
    }

    // ── Helpers ────────────────────────────────────────────────

    private PositionOrder buyOrder(BigDecimal amount, LocalDate date) {
        return PositionOrder.builder()
                .id(1L).position(btcPosition)
                .orderType(OrderType.BUY)
                .cryptoOperationType(CryptoOperationTypeEnum.BUY_FIAT)
                .amount(new BigDecimal("1")).quantity(new BigDecimal("1"))
                .amountEur(amount).orderDate(date)
                .build();
    }

    private PositionOrder sellOrder(long id, BigDecimal amountEur, LocalDate date) {
        return PositionOrder.builder()
                .id(id).position(btcPosition)
                .orderType(OrderType.SELL)
                .cryptoOperationType(CryptoOperationTypeEnum.SELL_FIAT)
                .amount(new BigDecimal("0.5")).quantity(new BigDecimal("0.5"))
                .amountEur(amountEur).orderDate(date)
                .build();
    }

    private void mockPriceHistory(BigDecimal price) {
        InstrumentPriceHistory iph = new InstrumentPriceHistory();
        iph.setId(1L);
        iph.setInstrument(btcInstrument);
        iph.setPrice(price);
        when(priceHistoryRepository.findTopByInstrumentAndPriceDateLessThanEqualOrderByPriceDateDesc(
                eq(btcInstrument), any()))
                .thenReturn(Optional.of(iph));
    }

    // ── getState ───────────────────────────────────────────────

    @Test
    void getState_sansOrdres_retourneEtatVide() {
        when(positionOrderRepository.findCryptoOperationsByUserOrderByDateAsc(any(), any()))
                .thenReturn(List.of());

        CryptoTaxStateDto state = cryptoTaxService.getState(user);

        assertThat(state.currentPta()).isEqualByComparingTo("0.00");
        assertThat(state.totalOperationsCount()).isEqualTo(0);
        assertThat(state.historicalDataConfirmed()).isFalse();
    }

    @Test
    void getState_avecAchat_retournePta() {
        when(positionOrderRepository.findCryptoOperationsByUserOrderByDateAsc(any(), any()))
                .thenReturn(List.of(buyOrder(new BigDecimal("8000"), LocalDate.of(2023, 1, 10))));
        when(priceHistoryRepository.findTopByInstrumentAndPriceDateLessThanEqualOrderByPriceDateDesc(any(), any()))
                .thenReturn(Optional.empty());

        CryptoTaxStateDto state = cryptoTaxService.getState(user);

        assertThat(state.currentPta()).isEqualByComparingTo("8000.00");
        assertThat(state.totalOperationsCount()).isEqualTo(1);
    }

    // ── getSummary — seuil 305 € ───────────────────────────────

    @Test
    void getSummary_cessionsInferieures305_exonere() {
        PositionOrder sell = sellOrder(2L, new BigDecimal("200"), LocalDate.of(2024, 6, 1));
        when(positionOrderRepository.findCryptoOperationsByUserOrderByDateAsc(any(), any()))
                .thenReturn(List.of(buyOrder(new BigDecimal("1000"), LocalDate.of(2023, 1, 1)), sell));
        mockPriceHistory(new BigDecimal("20000"));

        CryptoTaxSummaryDto summary = cryptoTaxService.getSummary(user, 2024, "PFU", null);

        assertThat(summary.exemptedBy305Threshold()).isTrue();
        assertThat(summary.declarationRequired()).isFalse();
        assertThat(summary.estimatedTaxEur()).isEqualByComparingTo("0.00");
    }

    // ── getSummary — calcul formule officielle ─────────────────

    @Test
    void getSummary_calculFormuleOfficielle() {
        // Achat 1000€ de BTC, portefeuille vaut 1500€ au moment de la vente, retrait 1000€
        // PV = 1000 - (1000 × 1000 / 1500) = 333.33€
        PositionOrder buy  = buyOrder(new BigDecimal("1000"), LocalDate.of(2020, 1, 1));
        PositionOrder sell = sellOrder(2L, new BigDecimal("1000"), LocalDate.of(2022, 6, 1));

        when(positionOrderRepository.findCryptoOperationsByUserOrderByDateAsc(any(), any()))
                .thenReturn(List.of(buy, sell));
        // VGP = 1 BTC × 1500€
        mockPriceHistory(new BigDecimal("1500"));

        CryptoTaxSummaryDto summary = cryptoTaxService.getSummary(user, 2022, "PFU", null);

        assertThat(summary.exemptedBy305Threshold()).isFalse();
        assertThat(summary.plusValueNetteImposable()).isEqualByComparingTo("333.33");
        // Impôt PFU = 333.33 × 31,4% ≈ 104.67
        assertThat(summary.estimatedTaxEur()).isEqualByComparingTo("104.67");
        assertThat(summary.cessionsCount()).isEqualTo(1);
    }

    @Test
    void getSummary_optionBareme_utiliseTmiPlusPsRate() {
        PositionOrder buy  = buyOrder(new BigDecimal("1000"), LocalDate.of(2020, 1, 1));
        PositionOrder sell = sellOrder(2L, new BigDecimal("1000"), LocalDate.of(2022, 6, 1));

        when(positionOrderRepository.findCryptoOperationsByUserOrderByDateAsc(any(), any()))
                .thenReturn(List.of(buy, sell));
        mockPriceHistory(new BigDecimal("1500"));

        // PV = 333.33€, TMI 30% → impôt = 333.33 × (0.30 + 0.172) = 157.33€
        CryptoTaxSummaryDto summary = cryptoTaxService.getSummary(user, 2022, "BAREME", 30f);

        assertThat(summary.taxOption()).isEqualTo("BAREME");
        assertThat(summary.estimatedTaxEur()).isEqualByComparingTo("157.33");
    }

    @Test
    void getSummary_sansCessions_anneeFiltrée_retourneZero() {
        PositionOrder buy = buyOrder(new BigDecimal("5000"), LocalDate.of(2020, 1, 1));
        when(positionOrderRepository.findCryptoOperationsByUserOrderByDateAsc(any(), any()))
                .thenReturn(List.of(buy));

        CryptoTaxSummaryDto summary = cryptoTaxService.getSummary(user, 2024, "PFU", null);

        assertThat(summary.totalCessionsEur()).isEqualByComparingTo("0.00");
        assertThat(summary.cessionsCount()).isEqualTo(0);
        assertThat(summary.exemptedBy305Threshold()).isTrue();
    }

    // ── getSummary — override manuel VGP ──────────────────────

    @Test
    void getSummary_overrideManuelVgp_utiliseLaValeurFournie() {
        PositionOrder buy  = buyOrder(new BigDecimal("1000"), LocalDate.of(2020, 1, 1));
        PositionOrder sell = sellOrder(2L, new BigDecimal("1000"), LocalDate.of(2022, 6, 1));
        sell.setPortfolioValueAtDateEur(new BigDecimal("2000")); // override

        when(positionOrderRepository.findCryptoOperationsByUserOrderByDateAsc(any(), any()))
                .thenReturn(List.of(buy, sell));

        // PV = 1000 - (1000 × 1000 / 2000) = 500€
        CryptoTaxSummaryDto summary = cryptoTaxService.getSummary(user, 2022, "PFU", null);

        assertThat(summary.plusValueNetteImposable()).isEqualByComparingTo("500.00");
        // Pas d'appel au repo de prix historiques (override manuel)
        verify(priceHistoryRepository, never())
                .findTopByInstrumentAndPriceDateLessThanEqualOrderByPriceDateDesc(any(), any());
    }

    // ── getCessions ────────────────────────────────────────────

    @Test
    void getCessions_retourneLignesAvecPta() {
        PositionOrder buy  = buyOrder(new BigDecimal("8000"), LocalDate.of(2020, 1, 1));
        PositionOrder sell = sellOrder(2L, new BigDecimal("12000"), LocalDate.of(2022, 4, 15));

        when(positionOrderRepository.findCryptoOperationsByUserOrderByDateAsc(any(), any()))
                .thenReturn(List.of(buy, sell));
        mockPriceHistory(new BigDecimal("24000"));

        List<CryptoCessionDto> cessions = cryptoTaxService.getCessions(user, 2022);

        assertThat(cessions).hasSize(1);
        CryptoCessionDto c = cessions.get(0);
        assertThat(c.orderId()).isEqualTo(2L);
        assertThat(c.prixDeCessionEur()).isEqualByComparingTo("12000.00");
        assertThat(c.ptaAvantCession()).isEqualByComparingTo("8000.00");
        // VGP = 1 BTC (quantité restante) × 24000 = 24000
        assertThat(c.vgpEur()).isEqualByComparingTo("24000.00");
        // PV = 12000 - (8000 × 12000 / 24000) = 8000
        assertThat(c.plusValueEur()).isEqualByComparingTo("8000.00");
        assertThat(c.vgpFromManualOverride()).isFalse();
    }

    // ── exportCsv ─────────────────────────────────────────────

    @Test
    void exportCsv_contientLesEntetesEtLesTotaux() {
        PositionOrder buy  = buyOrder(new BigDecimal("1000"), LocalDate.of(2020, 1, 1));
        PositionOrder sell = sellOrder(2L, new BigDecimal("1000"), LocalDate.of(2022, 6, 1));
        sell.setPortfolioValueAtDateEur(new BigDecimal("1500"));

        when(positionOrderRepository.findCryptoOperationsByUserOrderByDateAsc(any(), any()))
                .thenReturn(List.of(buy, sell));

        String csv = cryptoTaxService.exportCsv(user, 2022);

        assertThat(csv).contains("N°,Date de cession");
        assertThat(csv).contains("TOTAL");
        assertThat(csv).contains("333.33");
    }

    // ── confirmHistoricalData ──────────────────────────────────

    @Test
    void confirmHistoricalData_sauvegardeLeFlagSurUser() {
        when(userRepository.save(any())).thenReturn(user);

        cryptoTaxService.confirmHistoricalData(user, new ConfirmCryptoHistoryRequest(true));

        assertThat(user.isCryptoHistoricalDataConfirmed()).isTrue();
        verify(userRepository).save(user);
    }
}
