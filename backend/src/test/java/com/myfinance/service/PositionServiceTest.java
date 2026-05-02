package com.myfinance.service;

import com.myfinance.domain.*;
import com.myfinance.dto.*;
import com.myfinance.repository.ExchangeRateRepository;
import com.myfinance.repository.InstrumentRepository;
import com.myfinance.repository.OtherIncomeRepository;
import com.myfinance.repository.PositionOrderRepository;
import com.myfinance.repository.PositionRepository;
import com.myfinance.repository.PositionSnapshotRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PositionServiceTest {

    @Mock PositionRepository positionRepository;
    @Mock PositionOrderRepository positionOrderRepository;
    @Mock PositionSnapshotRepository positionSnapshotRepository;
    @Mock InstrumentRepository instrumentRepository;
    @Mock ExchangeRateRepository exchangeRateRepository;
    @Mock OtherIncomeRepository otherIncomeRepository;
    @InjectMocks PositionService positionService;

    User owner;
    User otherUser;
    User admin;
    Position livret;
    Position liquidite;
    Position bourse;
    Instrument instrument;

    @BeforeEach
    void setUp() {
        owner     = User.builder().id(1L).login("owner").role(RoleEnum.USER).build();
        otherUser = User.builder().id(2L).login("other").role(RoleEnum.USER).build();
        admin     = User.builder().id(3L).login("admin").role(RoleEnum.ADMIN).build();

        instrument = Instrument.builder()
                .id(10L).category(AssetCategory.BOURSE)
                .isin("FR0010315770").name("Lyxor PEA Nasdaq-100")
                .currency("EUR").lastPrice(new BigDecimal("88.44"))
                .build();

        livret = Position.builder()
                .id(1L).user(owner)
                .category(AssetCategory.LIVRET)
                .label("Livret A").partner("BNP Parisbas")
                .currency("EUR").fiscalEnvelope(FiscalEnvelope.NONE)
                .annualRate(new BigDecimal("3.00"))
                .includeInIncomeProjection(true)
                .status(PositionStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .build();

        liquidite = Position.builder()
                .id(2L).user(owner)
                .category(AssetCategory.LIQUIDITE)
                .label("Ticket Restaurant").partner("Swile")
                .currency("EUR")
                .currentBalance(new BigDecimal("525.79"))
                .includeInIncomeProjection(false)
                .status(PositionStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .build();

        bourse = Position.builder()
                .id(3L).user(owner)
                .category(AssetCategory.BOURSE)
                .label("Lyxor PEA Nasdaq-100").partner("SaxoBank - PEA")
                .currency("EUR").fiscalEnvelope(FiscalEnvelope.PEA)
                .assetSubType(AssetSubType.ETF)
                .instrument(instrument)
                .includeInIncomeProjection(false)
                .status(PositionStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .build();
    }

    // ── findAllByUser ──────────────────────────────────────────

    @Test
    void findAllByUser_sansFiltre_retourneToutesLesPositions() {
        when(positionRepository.findByUserOrderByCreatedAtDesc(owner)).thenReturn(List.of(livret, liquidite));
        when(positionOrderRepository.findByPositionOrderByOrderDateDesc(any())).thenReturn(List.of());

        List<PositionDto> result = positionService.findAllByUser(owner, null, null);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).label()).isEqualTo("Livret A");
        assertThat(result.get(1).label()).isEqualTo("Ticket Restaurant");
    }

    @Test
    void findAllByUser_avecFiltreCategorie_retourneSeulementLivrets() {
        when(positionRepository.findByUserAndCategoryOrderByCreatedAtDesc(owner, AssetCategory.LIVRET))
                .thenReturn(List.of(livret));
        when(positionOrderRepository.findByPositionOrderByOrderDateDesc(any())).thenReturn(List.of());

        List<PositionDto> result = positionService.findAllByUser(owner, AssetCategory.LIVRET, null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).category()).isEqualTo(AssetCategory.LIVRET);
    }

    // ── findById ───────────────────────────────────────────────

    @Test
    void findById_retourneLaPosition() {
        when(positionRepository.findById(1L)).thenReturn(Optional.of(livret));
        when(positionOrderRepository.findByPositionOrderByOrderDateDesc(livret)).thenReturn(List.of());

        PositionDto result = positionService.findById(1L, owner);

        assertThat(result.id()).isEqualTo(1L);
        assertThat(result.label()).isEqualTo("Livret A");
        assertThat(result.orders()).isNotNull();
    }

    @Test
    void findById_leve404_siIntrouvable() {
        when(positionRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> positionService.findById(99L, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void findById_leve403_siAutreUtilisateur() {
        when(positionRepository.findById(1L)).thenReturn(Optional.of(livret));

        assertThatThrownBy(() -> positionService.findById(1L, otherUser))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));
    }

    // ── create ─────────────────────────────────────────────────

    @Test
    void create_livret_sauvegardeEtRetourneLDto() {
        CreatePositionRequest request = new CreatePositionRequest(
                AssetCategory.LIVRET, "BNP Parisbas", "Livret A", "EUR",
                FiscalEnvelope.NONE, null, null, null, null, null, null, null, null,
                null, new BigDecimal("3.00"), null, true);

        when(positionRepository.save(any(Position.class))).thenAnswer(inv -> {
            Position p = inv.getArgument(0);
            return Position.builder()
                    .id(10L).user(owner)
                    .category(p.getCategory()).label(p.getLabel())
                    .partner(p.getPartner()).currency(p.getCurrency())
                    .fiscalEnvelope(p.getFiscalEnvelope()).annualRate(p.getAnnualRate())
                    .includeInIncomeProjection(p.getIncludeInIncomeProjection())
                    .status(PositionStatus.ACTIVE).createdAt(LocalDateTime.now())
                    .build();
        });

        PositionDto result = positionService.create(request, owner);

        assertThat(result.id()).isEqualTo(10L);
        assertThat(result.category()).isEqualTo(AssetCategory.LIVRET);
        assertThat(result.annualRate()).isEqualByComparingTo("3.00");
        verify(positionRepository).save(any(Position.class));
    }

    @Test
    void create_liquidite_initialiseLeBalance() {
        CreatePositionRequest request = new CreatePositionRequest(
                AssetCategory.LIQUIDITE, "Swile", "Ticket Restaurant", "EUR",
                null, null, null, null, null, null, null, null, null, null, null,
                new BigDecimal("525.79"), false);

        when(positionRepository.save(any(Position.class))).thenAnswer(inv -> {
            Position p = inv.getArgument(0);
            return Position.builder()
                    .id(20L).user(owner)
                    .category(p.getCategory()).label(p.getLabel())
                    .partner(p.getPartner()).currency(p.getCurrency())
                    .currentBalance(p.getCurrentBalance())
                    .includeInIncomeProjection(false)
                    .status(PositionStatus.ACTIVE).createdAt(LocalDateTime.now())
                    .build();
        });

        PositionDto result = positionService.create(request, owner);

        assertThat(result.currentBalance()).isEqualByComparingTo("525.79");
        assertThat(result.computed().investedAmountEur()).isEqualByComparingTo("525.79");
    }

    @Test
    void create_bourse_resolutionInstrument() {
        CreatePositionRequest request = new CreatePositionRequest(
                AssetCategory.BOURSE, "SaxoBank", "Lyxor PEA", "EUR",
                FiscalEnvelope.PEA, 10L, AssetSubType.ETF, null, null, null, null, null, null,
                null, null, null, false);

        when(instrumentRepository.findById(10L)).thenReturn(Optional.of(instrument));
        when(positionRepository.save(any(Position.class))).thenAnswer(inv -> {
            Position p = inv.getArgument(0);
            return Position.builder()
                    .id(30L).user(owner)
                    .category(p.getCategory()).label(p.getLabel())
                    .partner(p.getPartner()).currency(p.getCurrency())
                    .fiscalEnvelope(p.getFiscalEnvelope())
                    .assetSubType(p.getAssetSubType()).instrument(p.getInstrument())
                    .includeInIncomeProjection(false)
                    .status(PositionStatus.ACTIVE).createdAt(LocalDateTime.now())
                    .build();
        });

        PositionDto result = positionService.create(request, owner);

        assertThat(result.instrument()).isNotNull();
        assertThat(result.instrument().isin()).isEqualTo("FR0010315770");
    }

    @Test
    void create_bourse_instrumentInexistant_leve404() {
        CreatePositionRequest request = new CreatePositionRequest(
                AssetCategory.BOURSE, "SaxoBank", "ETF", "EUR",
                FiscalEnvelope.PEA, 99L, AssetSubType.ETF, null, null, null, null, null, null,
                null, null, null, false);

        when(instrumentRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> positionService.create(request, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    // ── updateBalance ──────────────────────────────────────────

    @Test
    void updateBalance_metsAJourLeSolde() {
        when(positionRepository.findById(2L)).thenReturn(Optional.of(liquidite));
        when(positionRepository.save(any(Position.class))).thenAnswer(inv -> inv.getArgument(0));

        PositionDto result = positionService.updateBalance(2L, new UpdateBalanceRequest(new BigDecimal("612.00")), owner);

        assertThat(result.currentBalance()).isEqualByComparingTo("612.00");
    }

    @Test
    void updateBalance_leve400_siPasLiquidite() {
        when(positionRepository.findById(1L)).thenReturn(Optional.of(livret));

        assertThatThrownBy(() -> positionService.updateBalance(1L, new UpdateBalanceRequest(new BigDecimal("100")), owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    // ── updateEstimatedValue ───────────────────────────────────

    @Test
    void updateEstimatedValue_metsAJourLaValeur() {
        Position immo = Position.builder()
                .id(4L).user(owner).category(AssetCategory.IMMO_PHYSIQUE)
                .label("Appartement").currency("EUR")
                .estimatedCurrentValue(new BigDecimal("100000"))
                .includeInIncomeProjection(false)
                .status(PositionStatus.ACTIVE).createdAt(LocalDateTime.now())
                .build();

        when(positionRepository.findById(4L)).thenReturn(Optional.of(immo));
        when(positionRepository.save(any(Position.class))).thenAnswer(inv -> inv.getArgument(0));
        when(positionOrderRepository.findByPositionOrderByOrderDateDesc(any())).thenReturn(List.of());

        PositionDto result = positionService.updateEstimatedValue(
                4L, new UpdateEstimatedValueRequest(new BigDecimal("120000")), owner);

        assertThat(result.estimatedCurrentValue()).isEqualByComparingTo("120000");
    }

    @Test
    void updateEstimatedValue_leve400_siPasImmoPhysique() {
        when(positionRepository.findById(1L)).thenReturn(Optional.of(livret));

        assertThatThrownBy(() -> positionService.updateEstimatedValue(
                1L, new UpdateEstimatedValueRequest(new BigDecimal("120000")), owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    // ── close ──────────────────────────────────────────────────

    @Test
    void close_passeLaPositionEnClosed() {
        when(positionRepository.findById(1L)).thenReturn(Optional.of(livret));
        when(positionRepository.save(any(Position.class))).thenAnswer(inv -> inv.getArgument(0));
        when(positionOrderRepository.findByPositionOrderByOrderDateDesc(any())).thenReturn(List.of());

        PositionDto result = positionService.close(1L, owner);

        assertThat(result.status()).isEqualTo(PositionStatus.CLOSED);
    }

    // ── delete ─────────────────────────────────────────────────

    @Test
    void delete_supprimeLesOrdresPuisLaPosition() {
        when(positionRepository.findById(1L)).thenReturn(Optional.of(livret));
        when(otherIncomeRepository.findByPosition(livret)).thenReturn(List.of());

        positionService.delete(1L, owner);

        verify(positionOrderRepository).deleteByPosition(livret);
        verify(positionRepository).delete(livret);
    }

    @Test
    void delete_leve403_siPasLeProprietaire() {
        when(positionRepository.findById(1L)).thenReturn(Optional.of(livret));

        assertThatThrownBy(() -> positionService.delete(1L, otherUser))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));
        verify(positionOrderRepository, never()).deleteByPosition(any());
        verify(positionRepository, never()).delete(any(Position.class));
    }

    @Test
    void delete_autorisePourAdmin() {
        when(positionRepository.findById(1L)).thenReturn(Optional.of(livret));
        when(otherIncomeRepository.findByPosition(livret)).thenReturn(List.of());

        assertThatNoException().isThrownBy(() -> positionService.delete(1L, admin));
        verify(positionOrderRepository).deleteByPosition(livret);
        verify(positionRepository).delete(livret);
    }

    // ── createOrder ────────────────────────────────────────────

    @Test
    void createOrder_sauvegardeEtRetourneLOrdre() {
        CreatePositionOrderRequest request = new CreatePositionOrderRequest(
                OrderType.DEPOSIT, null, null, new BigDecimal("500.00"),
                LocalDate.of(2026, 4, 1), "Versement initial");

        when(positionRepository.findById(1L)).thenReturn(Optional.of(livret));
        when(positionOrderRepository.save(any(PositionOrder.class))).thenAnswer(inv -> {
            PositionOrder o = inv.getArgument(0);
            return PositionOrder.builder()
                    .id(100L).position(livret)
                    .orderType(o.getOrderType()).amount(o.getAmount())
                    .amountEur(o.getAmountEur())
                    .orderDate(o.getOrderDate()).notes(o.getNotes())
                    .build();
        });

        PositionOrderDto result = positionService.createOrder(1L, request, owner);

        assertThat(result.id()).isEqualTo(100L);
        assertThat(result.orderType()).isEqualTo(OrderType.DEPOSIT);
        assertThat(result.amountEur()).isEqualByComparingTo("500.00");
    }

    @Test
    void createOrder_bourse_necessiteQuantiteEtPrix() {
        CreatePositionOrderRequest request = new CreatePositionOrderRequest(
                OrderType.BUY, null, null, new BigDecimal("884.40"),
                LocalDate.now(), null);

        when(positionRepository.findById(3L)).thenReturn(Optional.of(bourse));

        assertThatThrownBy(() -> positionService.createOrder(3L, request, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void createOrder_bourse_avecQuantiteEtPrix_sauvegarde() {
        CreatePositionOrderRequest request = new CreatePositionOrderRequest(
                OrderType.BUY, new BigDecimal("10"), new BigDecimal("88.44"),
                new BigDecimal("884.40"), LocalDate.now(), null);

        when(positionRepository.findById(3L)).thenReturn(Optional.of(bourse));
        when(positionOrderRepository.save(any(PositionOrder.class))).thenAnswer(inv -> {
            PositionOrder o = inv.getArgument(0);
            return PositionOrder.builder()
                    .id(200L).position(bourse)
                    .orderType(o.getOrderType()).quantity(o.getQuantity())
                    .unitPrice(o.getUnitPrice()).amount(o.getAmount())
                    .amountEur(o.getAmountEur()).orderDate(o.getOrderDate())
                    .build();
        });

        PositionOrderDto result = positionService.createOrder(3L, request, owner);

        assertThat(result.quantity()).isEqualByComparingTo("10");
        assertThat(result.unitPrice()).isEqualByComparingTo("88.44");
    }

    @Test
    void createOrder_leve400_siPositionLiquidite() {
        CreatePositionOrderRequest request = new CreatePositionOrderRequest(
                OrderType.DEPOSIT, null, null, new BigDecimal("100"),
                LocalDate.now(), null);

        when(positionRepository.findById(2L)).thenReturn(Optional.of(liquidite));

        assertThatThrownBy(() -> positionService.createOrder(2L, request, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    // ── deleteOrder ────────────────────────────────────────────

    @Test
    void deleteOrder_supprimeLOrdre() {
        PositionOrder order = PositionOrder.builder()
                .id(100L).position(livret).orderType(OrderType.DEPOSIT)
                .amount(new BigDecimal("500")).amountEur(new BigDecimal("500"))
                .orderDate(LocalDate.now())
                .build();

        when(positionRepository.findById(1L)).thenReturn(Optional.of(livret));
        when(positionOrderRepository.findById(100L)).thenReturn(Optional.of(order));

        positionService.deleteOrder(1L, 100L, owner);

        verify(positionOrderRepository).deleteById(100L);
    }

    // ── computed — projection mensuelle livret ─────────────────

    @Test
    void findById_livret_calculeProjectionMensuelle() {
        PositionOrder depot = PositionOrder.builder()
                .id(1L).position(livret).orderType(OrderType.DEPOSIT)
                .amount(new BigDecimal("10000")).amountEur(new BigDecimal("10000"))
                .orderDate(LocalDate.of(2025, 1, 1)).build();

        when(positionRepository.findById(1L)).thenReturn(Optional.of(livret));
        when(positionOrderRepository.findByPositionOrderByOrderDateDesc(livret)).thenReturn(List.of(depot));

        PositionDto result = positionService.findById(1L, owner);

        // 10000 * 3% / 12 = 25.00
        assertThat(result.computed().monthlyIncomeProjectionEur()).isEqualByComparingTo("25.00");
    }

    @Test
    void findById_bourse_calculeUnites() {
        PositionOrder achat1 = PositionOrder.builder()
                .id(1L).position(bourse).orderType(OrderType.BUY)
                .quantity(new BigDecimal("10")).unitPrice(new BigDecimal("88.44"))
                .amount(new BigDecimal("884.40")).amountEur(new BigDecimal("884.40"))
                .orderDate(LocalDate.of(2024, 1, 1)).build();

        PositionOrder achat2 = PositionOrder.builder()
                .id(2L).position(bourse).orderType(OrderType.BUY)
                .quantity(new BigDecimal("5")).unitPrice(new BigDecimal("90.00"))
                .amount(new BigDecimal("450")).amountEur(new BigDecimal("450"))
                .orderDate(LocalDate.of(2024, 6, 1)).build();

        when(positionRepository.findById(3L)).thenReturn(Optional.of(bourse));
        when(positionOrderRepository.findByPositionOrderByOrderDateDesc(bourse))
                .thenReturn(List.of(achat2, achat1));

        PositionDto result = positionService.findById(3L, owner);

        assertThat(result.computed().units()).isEqualByComparingTo("15");
        // 15 units × 88.44 EUR = 1326.60
        assertThat(result.computed().currentValueEur()).isEqualByComparingTo("1326.60");
    }

    @Test
    void createOrder_crypto_airdrop_sauvegardeAvecQuantiteEtPrix() {
        Position crypto = Position.builder()
                .id(5L).user(owner)
                .category(AssetCategory.CRYPTO)
                .label("Bitcoin").partner("Ledger")
                .currency("EUR").fiscalEnvelope(FiscalEnvelope.NONE)
                .instrument(instrument)
                .includeInIncomeProjection(false)
                .status(PositionStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .build();

        CreatePositionOrderRequest request = new CreatePositionOrderRequest(
                OrderType.AIRDROP, new BigDecimal("50"), new BigDecimal("0.10"),
                new BigDecimal("5.00"), LocalDate.of(2026, 3, 1), "Airdrop reçu");

        when(positionRepository.findById(5L)).thenReturn(Optional.of(crypto));
        when(positionOrderRepository.save(any(PositionOrder.class))).thenAnswer(inv -> {
            PositionOrder o = inv.getArgument(0);
            return PositionOrder.builder()
                    .id(300L).position(crypto)
                    .orderType(o.getOrderType()).quantity(o.getQuantity())
                    .unitPrice(o.getUnitPrice()).amount(o.getAmount())
                    .amountEur(o.getAmountEur()).orderDate(o.getOrderDate())
                    .notes(o.getNotes())
                    .build();
        });

        PositionOrderDto result = positionService.createOrder(5L, request, owner);

        assertThat(result.orderType()).isEqualTo(OrderType.AIRDROP);
        assertThat(result.quantity()).isEqualByComparingTo("50");
        assertThat(result.unitPrice()).isEqualByComparingTo("0.10");
        assertThat(result.amountEur()).isEqualByComparingTo("5.00");
    }

    @Test
    void findById_crypto_airdropCompteDansUnitesMaisPasDansInvesti() {
        Position crypto = Position.builder()
                .id(5L).user(owner)
                .category(AssetCategory.CRYPTO)
                .label("Uniswap").partner("Metamask")
                .currency("EUR").fiscalEnvelope(FiscalEnvelope.NONE)
                .instrument(instrument)
                .includeInIncomeProjection(false)
                .status(PositionStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .build();

        // Achat de 10 tokens à 2€ → investi = 20€
        PositionOrder achat = PositionOrder.builder()
                .id(1L).position(crypto).orderType(OrderType.BUY)
                .quantity(new BigDecimal("10")).unitPrice(new BigDecimal("2.00"))
                .amount(new BigDecimal("20.00")).amountEur(new BigDecimal("20.00"))
                .orderDate(LocalDate.of(2025, 1, 1)).build();

        // Airdrop de 5 tokens à 2€ → non comptabilisé dans investi
        PositionOrder airdrop = PositionOrder.builder()
                .id(2L).position(crypto).orderType(OrderType.AIRDROP)
                .quantity(new BigDecimal("5")).unitPrice(new BigDecimal("2.00"))
                .amount(new BigDecimal("10.00")).amountEur(new BigDecimal("10.00"))
                .orderDate(LocalDate.of(2025, 6, 1)).build();

        when(positionRepository.findById(5L)).thenReturn(Optional.of(crypto));
        when(positionOrderRepository.findByPositionOrderByOrderDateDesc(crypto))
                .thenReturn(List.of(airdrop, achat));

        PositionDto result = positionService.findById(5L, owner);

        // 10 (achat) + 5 (airdrop) = 15 tokens
        assertThat(result.computed().units()).isEqualByComparingTo("15");
        // Investi = uniquement l'achat (20€), pas l'airdrop
        assertThat(result.computed().investedAmountEur()).isEqualByComparingTo("20.00");
    }

    @Test
    void findById_bourse_abondementCompteDansUnitesMaisPasDansInvesti() {
        Position bourse = Position.builder()
                .id(6L).user(owner)
                .category(AssetCategory.BOURSE)
                .label("PEE Entreprise").partner("Amundi")
                .currency("EUR").fiscalEnvelope(FiscalEnvelope.NONE)
                .instrument(instrument)
                .includeInIncomeProjection(false)
                .status(PositionStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .build();

        // Achat de 10 parts à 50€ → investi = 500€
        PositionOrder achat = PositionOrder.builder()
                .id(1L).position(bourse).orderType(OrderType.BUY)
                .quantity(new BigDecimal("10")).unitPrice(new BigDecimal("50.00"))
                .amount(new BigDecimal("500.00")).amountEur(new BigDecimal("500.00"))
                .orderDate(LocalDate.of(2025, 1, 1)).build();

        // Abondement de 3 parts à 50€ → non comptabilisé dans investi, pur plus-value
        PositionOrder abondement = PositionOrder.builder()
                .id(2L).position(bourse).orderType(OrderType.ABONDEMENT)
                .quantity(new BigDecimal("3")).unitPrice(new BigDecimal("50.00"))
                .amount(new BigDecimal("150.00")).amountEur(new BigDecimal("150.00"))
                .orderDate(LocalDate.of(2025, 6, 1)).build();

        when(positionRepository.findById(6L)).thenReturn(Optional.of(bourse));
        when(positionOrderRepository.findByPositionOrderByOrderDateDesc(bourse))
                .thenReturn(List.of(abondement, achat));

        PositionDto result = positionService.findById(6L, owner);

        // 10 (achat) + 3 (abondement) = 13 parts
        assertThat(result.computed().units()).isEqualByComparingTo("13");
        // Investi = uniquement l'achat (500€), pas l'abondement
        assertThat(result.computed().investedAmountEur()).isEqualByComparingTo("500.00");
    }
}
