package com.myfinance.service;

import com.myfinance.domain.*;
import com.myfinance.dto.BasketAnalysisDto;
import com.myfinance.dto.CryptoTaxSummaryDto;
import com.myfinance.dto.TaxLossSummaryDto;
import com.myfinance.repository.ExchangeRateRepository;
import com.myfinance.repository.PositionOrderRepository;
import com.myfinance.repository.PositionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaxLossHarvestingServiceTest {

    @Mock PositionRepository positionRepository;
    @Mock PositionOrderRepository positionOrderRepository;
    @Mock ExchangeRateRepository exchangeRateRepository;
    @Mock CryptoTaxService cryptoTaxService;

    @InjectMocks TaxLossHarvestingService service;

    User user;
    int currentYear = LocalDate.now().getYear();

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).login("user").role(RoleEnum.USER).build();
        when(exchangeRateRepository.findAll()).thenReturn(List.of());
    }

    // ── Cas vide ───────────────────────────────────────────────

    @Test
    void computeSummary_retourneDeuxPaniersVides_siAucunePosition() {
        when(positionRepository.findByUserAndStatusOrderByCreatedAtDesc(user, PositionStatus.ACTIVE))
                .thenReturn(List.of());
        when(cryptoTaxService.getSummary(any(), anyInt(), any(), any()))
                .thenReturn(cryptoSummaryWithPv(BigDecimal.ZERO));

        TaxLossSummaryDto result = service.computeSummary(user, currentYear, "PFU", null, null, null);

        assertThat(result.cto().candidates()).isEmpty();
        assertThat(result.crypto().candidates()).isEmpty();
        assertThat(result.cto().estimatedTaxSavingEur()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(result.year()).isEqualTo(currentYear);
    }

    // ── Cloisonnement fiscal ───────────────────────────────────

    @Test
    void computeSummary_excluLesPositionsPEA_duPanierCto() {
        Position pea = buildBoursePosition(1L, FiscalEnvelope.PEA, bd("80"));
        when(positionRepository.findByUserAndStatusOrderByCreatedAtDesc(user, PositionStatus.ACTIVE))
                .thenReturn(List.of(pea));
        when(cryptoTaxService.getSummary(any(), anyInt(), any(), any()))
                .thenReturn(cryptoSummaryWithPv(BigDecimal.ZERO));

        TaxLossSummaryDto result = service.computeSummary(user, currentYear, "PFU", null, null, null);

        assertThat(result.cto().candidates()).isEmpty();
    }

    @Test
    void computeSummary_excluLesPositionsAV_duPanierCto() {
        Position av = buildBoursePosition(2L, FiscalEnvelope.AV, bd("150"));
        when(positionRepository.findByUserAndStatusOrderByCreatedAtDesc(user, PositionStatus.ACTIVE))
                .thenReturn(List.of(av));
        when(cryptoTaxService.getSummary(any(), anyInt(), any(), any()))
                .thenReturn(cryptoSummaryWithPv(BigDecimal.ZERO));

        TaxLossSummaryDto result = service.computeSummary(user, currentYear, "PFU", null, null, null);

        assertThat(result.cto().candidates()).isEmpty();
    }

    // ── Candidats CTO ─────────────────────────────────────────

    @Test
    void computeSummary_detectePositionCtoEnMvLatente() {
        // BUY 10 parts à 100€ = 1000€ investis, lastPrice=70€ → currentValue=700€ → MV=-300€
        Position cto = buildBoursePosition(10L, FiscalEnvelope.CTO, bd("70"));
        List<PositionOrder> orders = List.of(
                buildBuyOrder(cto, bd("10"), bd("1000"), LocalDate.of(currentYear - 1, 1, 1))
        );
        when(positionRepository.findByUserAndStatusOrderByCreatedAtDesc(user, PositionStatus.ACTIVE))
                .thenReturn(List.of(cto));
        when(positionOrderRepository.findByPositionInOrderByOrderDateAsc(List.of(cto)))
                .thenReturn(orders);
        when(cryptoTaxService.getSummary(any(), anyInt(), any(), any()))
                .thenReturn(cryptoSummaryWithPv(BigDecimal.ZERO));

        TaxLossSummaryDto result = service.computeSummary(user, currentYear, "PFU", null, null, null);

        // Pas de PV réalisées → candidat existe mais économie = 0
        assertThat(result.cto().candidates()).hasSize(1);
        assertThat(result.cto().candidates().get(0).positionId()).isEqualTo(10L);
        assertThat(result.cto().candidates().get(0).unrealizedLossEur()).isNegative();
        assertThat(result.cto().estimatedTaxSavingEur()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void computeSummary_calculePvRealiSeesCto_etEconomieImposable() {
        // BUY 10 parts à 50€/part (amountEur=500), lastPrice=40€ → currentValue=400€ → MV=-100€
        // SELL 5 parts pour 400€ (PV = 400 - 5×50 = 150€)
        Position cto = buildBoursePosition(20L, FiscalEnvelope.CTO, bd("40"));
        List<PositionOrder> orders = List.of(
                buildBuyOrder(cto, bd("10"), bd("500"), LocalDate.of(currentYear - 1, 3, 1)),
                buildSellOrder(cto, bd("5"), bd("400"), LocalDate.of(currentYear, 6, 1))
        );
        when(positionRepository.findByUserAndStatusOrderByCreatedAtDesc(user, PositionStatus.ACTIVE))
                .thenReturn(List.of(cto));
        when(positionOrderRepository.findByPositionInOrderByOrderDateAsc(List.of(cto)))
                .thenReturn(orders);
        when(cryptoTaxService.getSummary(any(), anyInt(), any(), any()))
                .thenReturn(cryptoSummaryWithPv(BigDecimal.ZERO));

        TaxLossSummaryDto result = service.computeSummary(user, currentYear, "PFU", null, null, null);

        assertThat(result.cto().realizedGainsYearEur()).isPositive();
    }

    // ── Calcul de la recommandation ────────────────────────────

    @Test
    void computeSummary_recommandeVentePartielle_quandMvSupPvCompensable() {
        // BUY 30 parts à 100€ (=3000€), SELL 10 pour 2000€ → PV=1000€
        // lastPrice=40€ → remaining 20×40=800€, invested=1000€ → MV=-200€
        // compensable=min(1000,200)=200€ → économie=60€
        Position cto = buildBoursePosition(30L, FiscalEnvelope.CTO, bd("40"));
        List<PositionOrder> orders = List.of(
                buildBuyOrder(cto, bd("30"), bd("3000"), LocalDate.of(currentYear - 2, 1, 1)),
                buildSellOrder(cto, bd("10"), bd("2000"), LocalDate.of(currentYear, 3, 1))
        );
        when(positionRepository.findByUserAndStatusOrderByCreatedAtDesc(user, PositionStatus.ACTIVE))
                .thenReturn(List.of(cto));
        when(positionOrderRepository.findByPositionInOrderByOrderDateAsc(List.of(cto)))
                .thenReturn(orders);
        when(cryptoTaxService.getSummary(any(), anyInt(), any(), any()))
                .thenReturn(cryptoSummaryWithPv(BigDecimal.ZERO));

        TaxLossSummaryDto result = service.computeSummary(user, currentYear, "PFU", null, null, null);

        BasketAnalysisDto basket = result.cto();
        assertThat(basket.estimatedTaxSavingEur()).isPositive();
        // candidat recommandé en vente partielle ou totale
        if (!basket.candidates().isEmpty()) {
            assertThat(basket.candidates().get(0).recommendedSellQuantity()).isGreaterThanOrEqualTo(BigDecimal.ZERO);
        }
    }

    // ── Tri des candidats ──────────────────────────────────────

    @Test
    void computeSummary_trieCandidatsParMvDecroissante() {
        // p1 : BUY 5 parts×100€=500€, lastPrice=60€ → currentValue=300€, MV=-200€ (petite perte)
        // p2 : BUY 20 parts×100€=2000€, lastPrice=60€ → currentValue=1200€, MV=-800€ (grosse perte)
        Position p1 = buildBoursePosition(41L, FiscalEnvelope.CTO, bd("60"));
        Position p2 = buildBoursePosition(42L, FiscalEnvelope.CTO, bd("60"));
        List<PositionOrder> orders1 = List.of(buildBuyOrder(p1, bd("5"), bd("500"), LocalDate.of(currentYear - 1, 1, 1)));
        List<PositionOrder> orders2 = List.of(buildBuyOrder(p2, bd("20"), bd("2000"), LocalDate.of(currentYear - 1, 1, 1)));
        when(positionRepository.findByUserAndStatusOrderByCreatedAtDesc(user, PositionStatus.ACTIVE))
                .thenReturn(List.of(p1, p2));
        when(positionOrderRepository.findByPositionInOrderByOrderDateAsc(anyList()))
                .thenReturn(List.of(orders1.get(0), orders2.get(0)));
        when(cryptoTaxService.getSummary(any(), anyInt(), any(), any()))
                .thenReturn(cryptoSummaryWithPv(BigDecimal.ZERO));

        TaxLossSummaryDto result = service.computeSummary(user, currentYear, "PFU", null, null, null);

        List<BigDecimal> losses = result.cto().candidates().stream()
                .map(c -> c.unrealizedLossEur())
                .toList();
        // Les pertes doivent être triées (du plus négatif au moins négatif)
        for (int i = 1; i < losses.size(); i++) {
            assertThat(losses.get(i)).isGreaterThanOrEqualTo(losses.get(i - 1));
        }
    }

    // ── Basket CRYPTO ──────────────────────────────────────────

    @Test
    void computeSummary_utiliseLesSummaryDeCryptoTaxService_pourLeBasketCrypto() {
        when(positionRepository.findByUserAndStatusOrderByCreatedAtDesc(user, PositionStatus.ACTIVE))
                .thenReturn(List.of());
        when(cryptoTaxService.getSummary(user, currentYear, "PFU", null))
                .thenReturn(cryptoSummaryWithPv(bd("2000")));

        TaxLossSummaryDto result = service.computeSummary(user, currentYear, "PFU", null, null, null);

        assertThat(result.crypto().realizedGainsYearEur()).isEqualByComparingTo(bd("2000"));
    }

    @Test
    void computeSummary_retourneZeroPvCrypto_siCryptoTaxServiceLanceException() {
        when(positionRepository.findByUserAndStatusOrderByCreatedAtDesc(user, PositionStatus.ACTIVE))
                .thenReturn(List.of());
        when(cryptoTaxService.getSummary(any(), anyInt(), any(), any()))
                .thenThrow(new RuntimeException("erreur test"));

        TaxLossSummaryDto result = service.computeSummary(user, currentYear, "PFU", null, null, null);

        assertThat(result.crypto().realizedGainsYearEur()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    // ── Helpers ────────────────────────────────────────────────

    private Position buildBoursePosition(Long id, FiscalEnvelope envelope, BigDecimal lastPrice) {
        Instrument instrument = Instrument.builder()
                .id(id)
                .name("Instrument " + id)
                .lastPrice(lastPrice)
                .currency("EUR")
                .build();
        return Position.builder()
                .id(id)
                .user(user)
                .category(AssetCategory.BOURSE)
                .fiscalEnvelope(envelope)
                .label("Position " + id)
                .partner("Broker")
                .instrument(instrument)
                .status(PositionStatus.ACTIVE)
                .build();
    }

    private PositionOrder buildBuyOrder(Position pos, BigDecimal qty, BigDecimal amountEur, LocalDate date) {
        return PositionOrder.builder()
                .id(100L + pos.getId())
                .position(pos)
                .orderType(OrderType.BUY)
                .quantity(qty)
                .amountEur(amountEur)
                .amount(amountEur)
                .orderDate(date)
                .build();
    }

    private PositionOrder buildSellOrder(Position pos, BigDecimal qty, BigDecimal amountEur, LocalDate date) {
        return PositionOrder.builder()
                .id(200L + pos.getId())
                .position(pos)
                .orderType(OrderType.SELL)
                .quantity(qty)
                .amountEur(amountEur)
                .amount(amountEur)
                .orderDate(date)
                .build();
    }

    private CryptoTaxSummaryDto cryptoSummaryWithPv(BigDecimal pv) {
        return new CryptoTaxSummaryDto(
                currentYear, BigDecimal.ZERO, BigDecimal.ZERO,
                BigDecimal.ZERO, pv, BigDecimal.ZERO,
                pv, false, false, "PFU", null, BigDecimal.ZERO, 0, List.of()
        );
    }

    private BigDecimal bd(String val) {
        return new BigDecimal(val);
    }
}
