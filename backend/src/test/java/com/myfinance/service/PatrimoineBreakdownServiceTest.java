package com.myfinance.service;

import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.AssetSubType;
import com.myfinance.domain.BreakdownDimension;
import com.myfinance.domain.CryptoNetwork;
import com.myfinance.domain.CryptoType;
import com.myfinance.domain.PositionStatus;
import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.User;
import com.myfinance.dto.InstrumentAllocationDto;
import com.myfinance.dto.InstrumentDto;
import com.myfinance.dto.InstrumentSectorAllocationDto;
import com.myfinance.dto.PortfolioBreakdownDto;
import com.myfinance.dto.PositionComputedDto;
import com.myfinance.dto.PositionDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PatrimoineBreakdownServiceTest {

    @Mock PositionService positionService;
    @InjectMocks PatrimoineBreakdownService service;

    User user;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).login("u").role(RoleEnum.USER).build();
    }

    // ── SECTOR ─────────────────────────────────────────────────

    @Test
    void sector_aucunePosition_retourneTotauxAZero() {
        when(positionService.findAllByUser(eq(user), eq(AssetCategory.BOURSE), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of());

        PortfolioBreakdownDto result = service.getBreakdown(user, BreakdownDimension.SECTOR, null);

        assertThat(result.dimension()).isEqualTo(BreakdownDimension.SECTOR);
        assertThat(result.totalEur()).isEqualByComparingTo("0");
        assertThat(result.coverageRatio()).isEqualByComparingTo("0");
        assertThat(result.breakdown()).isEmpty();
    }

    @Test
    void sector_allocationComplete_ventileCorrectement() {
        InstrumentDto instr = bourseInstrument("EUR", null, List.of(), List.of(
                new InstrumentSectorAllocationDto("Technology", new BigDecimal("60.00")),
                new InstrumentSectorAllocationDto("Healthcare", new BigDecimal("40.00"))));

        when(positionService.findAllByUser(eq(user), eq(AssetCategory.BOURSE), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(position(instr, null, new BigDecimal("10000"))));

        PortfolioBreakdownDto result = service.getBreakdown(user, BreakdownDimension.SECTOR, null);

        assertThat(result.coverageRatio()).isEqualByComparingTo("100.0");
        assertThat(result.breakdown()).hasSize(2);
        assertThat(result.breakdown().get(0).key()).isEqualTo("Technology");
        assertThat(result.breakdown().get(0).valueEur()).isEqualByComparingTo("6000");
    }

    @Test
    void sector_residuOuSansAllocation_basculeEnNonClasse() {
        InstrumentDto withSectors = bourseInstrument("EUR", null, List.of(), List.of(
                new InstrumentSectorAllocationDto("Technology", new BigDecimal("70.00"))));
        InstrumentDto noSectors = bourseInstrument("EUR", null, List.of(), List.of());

        when(positionService.findAllByUser(eq(user), eq(AssetCategory.BOURSE), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(
                        position(withSectors, null, new BigDecimal("10000")),
                        position(noSectors, null, new BigDecimal("5000"))
                ));

        PortfolioBreakdownDto result = service.getBreakdown(user, BreakdownDimension.SECTOR, null);

        // 7000 € classés Tech, 3000 € résidu + 5000 € sans allocation = 8000 € non classés
        assertThat(result.totalEur()).isEqualByComparingTo("15000");
        assertThat(result.unclassifiedEur()).isEqualByComparingTo("8000");
        assertThat(result.breakdown().get(result.breakdown().size() - 1).key()).isEqualTo("Non classé");
    }

    // ── COUNTRY ────────────────────────────────────────────────

    @Test
    void country_allocationComplete_ventileCorrectement() {
        InstrumentDto instr = bourseInstrument("EUR", null, List.of(
                new InstrumentAllocationDto("FR", new BigDecimal("70.00")),
                new InstrumentAllocationDto("US", new BigDecimal("30.00"))), List.of());

        when(positionService.findAllByUser(eq(user), eq(AssetCategory.BOURSE), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(position(instr, null, new BigDecimal("10000"))));

        PortfolioBreakdownDto result = service.getBreakdown(user, BreakdownDimension.COUNTRY, null);

        assertThat(result.dimension()).isEqualTo(BreakdownDimension.COUNTRY);
        assertThat(result.breakdown()).hasSize(2);
        assertThat(result.breakdown().get(0).key()).isEqualTo("FR");
        assertThat(result.breakdown().get(0).valueEur()).isEqualByComparingTo("7000");
        assertThat(result.coverageRatio()).isEqualByComparingTo("100.0");
    }

    @Test
    void country_sansAllocation_basculeEnNonClasse() {
        InstrumentDto noAllocs = bourseInstrument("EUR", null, List.of(), List.of());

        when(positionService.findAllByUser(eq(user), eq(AssetCategory.BOURSE), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(position(noAllocs, null, new BigDecimal("3000"))));

        PortfolioBreakdownDto result = service.getBreakdown(user, BreakdownDimension.COUNTRY, null);

        assertThat(result.unclassifiedEur()).isEqualByComparingTo("3000");
        assertThat(result.coverageRatio()).isEqualByComparingTo("0.0");
    }

    // ── CURRENCY ───────────────────────────────────────────────

    @Test
    void currency_agregeParDevise_couverture100() {
        InstrumentDto eurInstr = bourseInstrument("EUR", null, List.of(), List.of());
        InstrumentDto usdInstr = bourseInstrument("USD", null, List.of(), List.of());

        when(positionService.findAllByUser(eq(user), eq(AssetCategory.BOURSE), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(
                        position(eurInstr, null, new BigDecimal("6000")),
                        position(usdInstr, null, new BigDecimal("4000")),
                        position(eurInstr, null, new BigDecimal("2000"))
                ));

        PortfolioBreakdownDto result = service.getBreakdown(user, BreakdownDimension.CURRENCY, null);

        assertThat(result.dimension()).isEqualTo(BreakdownDimension.CURRENCY);
        assertThat(result.breakdown()).hasSize(2);
        assertThat(result.breakdown().get(0).key()).isEqualTo("EUR");
        assertThat(result.breakdown().get(0).valueEur()).isEqualByComparingTo("8000");
        assertThat(result.breakdown().get(1).key()).isEqualTo("USD");
        assertThat(result.coverageRatio()).isEqualByComparingTo("100.0");
        assertThat(result.unclassifiedEur()).isEqualByComparingTo("0");
    }

    @Test
    void currency_fallbackSurPositionCurrency_siInstrumentNul() {
        PositionDto p = new PositionDto(
                1L, AssetCategory.BOURSE, null, "Position", "EUR", null,
                null, null, null, null, null, null, null, null,
                null, null, null, false, PositionStatus.ACTIVE, null, null,
                new PositionComputedDto(BigDecimal.ZERO, new BigDecimal("1000"), BigDecimal.ZERO, null, null));

        when(positionService.findAllByUser(eq(user), eq(AssetCategory.BOURSE), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(p));

        PortfolioBreakdownDto result = service.getBreakdown(user, BreakdownDimension.CURRENCY, null);

        assertThat(result.breakdown()).hasSize(1);
        assertThat(result.breakdown().get(0).key()).isEqualTo("EUR");
    }

    // ── ASSET_SUBTYPE ──────────────────────────────────────────

    @Test
    void assetSubType_agregeParSousType() {
        InstrumentDto instr = bourseInstrument("EUR", null, List.of(), List.of());

        when(positionService.findAllByUser(eq(user), eq(AssetCategory.BOURSE), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(
                        position(instr, AssetSubType.ETF, new BigDecimal("8000")),
                        position(instr, AssetSubType.ACTION, new BigDecimal("3000")),
                        position(instr, AssetSubType.OBLIGATION, new BigDecimal("2000")),
                        position(instr, AssetSubType.ETF, new BigDecimal("1000"))
                ));

        PortfolioBreakdownDto result = service.getBreakdown(user, BreakdownDimension.ASSET_SUBTYPE, null);

        assertThat(result.dimension()).isEqualTo(BreakdownDimension.ASSET_SUBTYPE);
        assertThat(result.breakdown()).hasSize(3);
        assertThat(result.breakdown().get(0).key()).isEqualTo("ETF");
        assertThat(result.breakdown().get(0).valueEur()).isEqualByComparingTo("9000");
        assertThat(result.coverageRatio()).isEqualByComparingTo("100.0");
    }

    @Test
    void assetSubType_sansSousType_basculeEnNonClasse() {
        InstrumentDto instr = bourseInstrument("EUR", null, List.of(), List.of());

        when(positionService.findAllByUser(eq(user), eq(AssetCategory.BOURSE), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(
                        position(instr, AssetSubType.ETF, new BigDecimal("8000")),
                        position(instr, null, new BigDecimal("2000"))
                ));

        PortfolioBreakdownDto result = service.getBreakdown(user, BreakdownDimension.ASSET_SUBTYPE, null);

        assertThat(result.unclassifiedEur()).isEqualByComparingTo("2000");
        assertThat(result.coverageRatio()).isEqualByComparingTo("80.0");
    }

    // ── CRYPTO_TYPE ────────────────────────────────────────────

    @Test
    void cryptoType_agregeParTypeDeToken() {
        InstrumentDto stableInstr = cryptoInstrument("USDC", CryptoType.STABLECOIN, null);
        InstrumentDto ethInstr    = cryptoInstrument("ETH",  CryptoType.SMART_CONTRACT, null);
        InstrumentDto noTypeInstr = cryptoInstrument("XYZ",  null, null);

        when(positionService.findAllByUser(eq(user), eq(AssetCategory.CRYPTO), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(
                        cryptoPosition(stableInstr, new BigDecimal("3000")),
                        cryptoPosition(ethInstr,    new BigDecimal("6000")),
                        cryptoPosition(noTypeInstr, new BigDecimal("1000"))
                ));

        PortfolioBreakdownDto result = service.getBreakdown(user, BreakdownDimension.CRYPTO_TYPE, null);

        assertThat(result.dimension()).isEqualTo(BreakdownDimension.CRYPTO_TYPE);
        assertThat(result.totalEur()).isEqualByComparingTo("10000");
        assertThat(result.unclassifiedEur()).isEqualByComparingTo("1000");
        assertThat(result.breakdown().stream().map(PortfolioBreakdownDto.BreakdownItem::key).toList())
                .contains("SMART_CONTRACT", "STABLECOIN");
    }

    // ── CRYPTO_NETWORK ─────────────────────────────────────────

    @Test
    void cryptoNetwork_agregeParReseau() {
        InstrumentDto btcInstr = cryptoInstrument("BTC", null, CryptoNetwork.BITCOIN);
        InstrumentDto ethInstr = cryptoInstrument("ETH", null, CryptoNetwork.ETHEREUM);

        when(positionService.findAllByUser(eq(user), eq(AssetCategory.CRYPTO), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(
                        cryptoPosition(btcInstr, new BigDecimal("7000")),
                        cryptoPosition(ethInstr, new BigDecimal("3000"))
                ));

        PortfolioBreakdownDto result = service.getBreakdown(user, BreakdownDimension.CRYPTO_NETWORK, null);

        assertThat(result.dimension()).isEqualTo(BreakdownDimension.CRYPTO_NETWORK);
        assertThat(result.coverageRatio()).isEqualByComparingTo("100.0");
        assertThat(result.breakdown().get(0).key()).isEqualTo("BITCOIN");
        assertThat(result.breakdown().get(0).valueEur()).isEqualByComparingTo("7000");
    }

    // ── CRYPTO_NETWORK lève 400 si catégorie incompatible ──────
    // (validé côté PatrimoineTargetService — pas côté breakdown service)

    // ── INSTRUMENT ─────────────────────────────────────────────

    @Test
    void instrument_agregeParTicker() {
        InstrumentDto btcInstr = cryptoInstrument("BTC", null, null);
        InstrumentDto ethInstr = cryptoInstrument("ETH", null, null);

        when(positionService.findAllByUser(eq(user), eq(AssetCategory.CRYPTO), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(
                        cryptoPosition(btcInstr, new BigDecimal("6000")),
                        cryptoPosition(ethInstr, new BigDecimal("4000"))
                ));

        PortfolioBreakdownDto result = service.getBreakdown(user, BreakdownDimension.INSTRUMENT, null);

        assertThat(result.dimension()).isEqualTo(BreakdownDimension.INSTRUMENT);
        assertThat(result.totalEur()).isEqualByComparingTo("10000");
        assertThat(result.coverageRatio()).isEqualByComparingTo("100.0");
        assertThat(result.breakdown()).hasSize(2);
        assertThat(result.breakdown().get(0).key()).isEqualTo("BTC");
        assertThat(result.breakdown().get(0).valueEur()).isEqualByComparingTo("6000");
    }

    @Test
    void instrument_utiliseLabelSiTickerAbsent() {
        InstrumentDto noTickerInstr = new InstrumentDto(1L, AssetCategory.CRYPTO, null,
                null, "MyCoin", "USD", new BigDecimal("1"), null, false, null, null, null,
                List.of(), List.of(), 0L, null, null);

        when(positionService.findAllByUser(eq(user), eq(AssetCategory.CRYPTO), eq(PositionStatus.ACTIVE)))
                .thenReturn(List.of(cryptoPosition(noTickerInstr, new BigDecimal("5000"))));

        PortfolioBreakdownDto result = service.getBreakdown(user, BreakdownDimension.INSTRUMENT, null);

        assertThat(result.breakdown().get(0).key()).isEqualTo("MyCoin");
    }

    // ── Helpers ────────────────────────────────────────────────

    private InstrumentDto bourseInstrument(String currency, Long id,
                                           List<InstrumentAllocationDto> countryAlloc,
                                           List<InstrumentSectorAllocationDto> sectorAlloc) {
        return new InstrumentDto(id != null ? id : 1L, AssetCategory.BOURSE, "FR0000001",
                null, "Test", currency, new BigDecimal("100"), null, false, null, null, null,
                countryAlloc, sectorAlloc, 0L, null, null);
    }

    private PositionDto position(InstrumentDto instrument, AssetSubType subType, BigDecimal currentValueEur) {
        PositionComputedDto computed = new PositionComputedDto(
                BigDecimal.ZERO, currentValueEur, BigDecimal.ZERO, null, null);
        String currency = instrument != null ? instrument.currency() : "EUR";
        return new PositionDto(
                1L, AssetCategory.BOURSE, null, "Position", currency, null,
                instrument, subType, null, null, null, null, null, null,
                null, null, null, false, PositionStatus.ACTIVE, null, null, computed);
    }

    private InstrumentDto cryptoInstrument(String ticker, CryptoType cryptoType, CryptoNetwork cryptoNetwork) {
        return new InstrumentDto(1L, AssetCategory.CRYPTO, null,
                ticker, ticker, "USD", new BigDecimal("1"), null, false, null, null, null,
                List.of(), List.of(), 0L, cryptoType, cryptoNetwork);
    }

    private PositionDto cryptoPosition(InstrumentDto instrument, BigDecimal currentValueEur) {
        PositionComputedDto computed = new PositionComputedDto(
                BigDecimal.ZERO, currentValueEur, BigDecimal.ZERO, null, null);
        return new PositionDto(
                1L, AssetCategory.CRYPTO, null, "Position", "USD", null,
                instrument, null, null, null, null, null, null, null,
                null, null, null, false, PositionStatus.ACTIVE, null, null, computed);
    }
}
