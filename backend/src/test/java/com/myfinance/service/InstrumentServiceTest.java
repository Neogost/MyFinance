package com.myfinance.service;

import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.Instrument;
import com.myfinance.dto.CreateInstrumentRequest;
import com.myfinance.dto.InstrumentDto;
import com.myfinance.dto.UpdateInstrumentPriceRequest;
import com.myfinance.domain.Position;
import com.myfinance.domain.User;
import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.OrderType;
import com.myfinance.domain.PositionOrder;
import com.myfinance.repository.InstrumentAllocationRepository;
import com.myfinance.repository.InstrumentPriceHistoryRepository;
import com.myfinance.repository.InstrumentRepository;
import com.myfinance.repository.InstrumentSectorAllocationRepository;
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
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InstrumentServiceTest {

    @Mock InstrumentRepository                 instrumentRepository;
    @Mock InstrumentAllocationRepository       allocationRepository;
    @Mock InstrumentSectorAllocationRepository sectorAllocationRepository;
    @Mock PositionRepository                   positionRepository;
    @Mock PositionSnapshotRepository           positionSnapshotRepository;
    @Mock InstrumentPriceHistoryRepository     priceHistoryRepository;
    @Mock PositionOrderRepository              positionOrderRepository;
    @InjectMocks InstrumentService instrumentService;

    Instrument etf;
    Instrument bitcoin;

    @BeforeEach
    void setUp() {
        etf = Instrument.builder()
                .id(1L).category(AssetCategory.BOURSE)
                .isin("FR0010315770").name("Lyxor PEA Nasdaq-100")
                .currency("EUR").lastPrice(new BigDecimal("88.44"))
                .build();

        bitcoin = Instrument.builder()
                .id(2L).category(AssetCategory.CRYPTO)
                .ticker("BTC").name("Bitcoin")
                .currency("USD").lastPrice(new BigDecimal("60000"))
                .build();
    }

    // ── findAll ────────────────────────────────────────────────

    @Test
    void findAll_sansFiltre_retourneTous() {
        when(instrumentRepository.findAll()).thenReturn(List.of(etf, bitcoin));

        List<InstrumentDto> result = instrumentService.findAll(null, null);

        assertThat(result).hasSize(2);
    }

    @Test
    void findAll_avecRechercheQ_delegueLaRecherche() {
        when(instrumentRepository.searchByQuery("nasdaq")).thenReturn(List.of(etf));

        List<InstrumentDto> result = instrumentService.findAll("nasdaq", null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).name()).isEqualTo("Lyxor PEA Nasdaq-100");
    }

    @Test
    void findAll_qTropCourt_retourneResultatSansRecherche() {
        when(instrumentRepository.findAll()).thenReturn(List.of(etf, bitcoin));

        // "q" de moins de 2 caractères → pas de recherche full-text
        List<InstrumentDto> result = instrumentService.findAll("a", null);

        assertThat(result).hasSize(2);
        verify(instrumentRepository, never()).searchByQuery(any());
    }

    @Test
    void findAll_avecCategorie_filtreParCategorie() {
        when(instrumentRepository.findByCategoryOrderByNameAsc(AssetCategory.BOURSE)).thenReturn(List.of(etf));

        List<InstrumentDto> result = instrumentService.findAll(null, AssetCategory.BOURSE);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).category()).isEqualTo(AssetCategory.BOURSE);
    }

    // ── findById ───────────────────────────────────────────────

    @Test
    void findById_retourneLInstrument() {
        when(instrumentRepository.findById(1L)).thenReturn(Optional.of(etf));

        InstrumentDto result = instrumentService.findById(1L);

        assertThat(result.id()).isEqualTo(1L);
        assertThat(result.isin()).isEqualTo("FR0010315770");
    }

    @Test
    void findById_leve404_siIntrouvable() {
        when(instrumentRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> instrumentService.findById(99L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    // ── create ─────────────────────────────────────────────────

    @Test
    void create_bourse_sauvegardeAvecIsin() {
        CreateInstrumentRequest request = new CreateInstrumentRequest(
                AssetCategory.BOURSE, "LU1681048804", null,
                "Amundi PEA MSCI Europe", "EUR", null, null, null, null);

        when(instrumentRepository.findByIsin("LU1681048804")).thenReturn(Optional.empty());
        when(instrumentRepository.save(any(Instrument.class))).thenAnswer(inv -> {
            Instrument i = inv.getArgument(0);
            return Instrument.builder()
                    .id(10L).category(i.getCategory()).isin(i.getIsin())
                    .name(i.getName()).currency(i.getCurrency())
                    .build();
        });

        InstrumentDto result = instrumentService.create(request);

        assertThat(result.id()).isEqualTo(10L);
        assertThat(result.isin()).isEqualTo("LU1681048804");
        verify(instrumentRepository).save(any(Instrument.class));
    }

    @Test
    void create_bourse_sansIsin_leve400() {
        CreateInstrumentRequest request = new CreateInstrumentRequest(
                AssetCategory.BOURSE, null, null, "Sans ISIN", "EUR", null, null, null, null);

        assertThatThrownBy(() -> instrumentService.create(request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void create_bourse_isinDuplique_leve409() {
        CreateInstrumentRequest request = new CreateInstrumentRequest(
                AssetCategory.BOURSE, "FR0010315770", null, "Doublon", "EUR", null, null, null, null);

        when(instrumentRepository.findByIsin("FR0010315770")).thenReturn(Optional.of(etf));

        assertThatThrownBy(() -> instrumentService.create(request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    void create_crypto_sansTickerLeve400() {
        CreateInstrumentRequest request = new CreateInstrumentRequest(
                AssetCategory.CRYPTO, null, null, "Sans Ticker", "USD", null, null, null, null);

        assertThatThrownBy(() -> instrumentService.create(request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void create_crypto_tickerDuplique_leve409() {
        CreateInstrumentRequest request = new CreateInstrumentRequest(
                AssetCategory.CRYPTO, null, "BTC", "Bitcoin v2", "USD", null, null, null, null);

        when(instrumentRepository.findByTicker("BTC")).thenReturn(Optional.of(bitcoin));

        assertThatThrownBy(() -> instrumentService.create(request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    void create_avecStablePrice_persisteLeFlag() {
        CreateInstrumentRequest request = new CreateInstrumentRequest(
                AssetCategory.CRYPTO, null, "USDC", "USD Coin", "USD", true, null, null, null);

        when(instrumentRepository.findByTicker("USDC")).thenReturn(Optional.empty());
        when(instrumentRepository.save(any(Instrument.class))).thenAnswer(inv -> {
            Instrument i = inv.getArgument(0);
            return Instrument.builder()
                    .id(20L).category(i.getCategory()).ticker(i.getTicker())
                    .name(i.getName()).currency(i.getCurrency())
                    .stablePrice(i.isStablePrice())
                    .build();
        });

        InstrumentDto result = instrumentService.create(request);

        assertThat(result.stablePrice()).isTrue();
    }

    // ── findActiveInstruments ──────────────────────────────────

    @Test
    void findActiveInstruments_retourneLesInstrumentsActifs() {
        when(instrumentRepository.findAllWithActivePositions()).thenReturn(List.of(etf, bitcoin));

        List<InstrumentDto> result = instrumentService.findActiveInstruments();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).id()).isEqualTo(1L);
        assertThat(result.get(1).id()).isEqualTo(2L);
        verify(instrumentRepository).findAllWithActivePositions();
    }

    @Test
    void findActiveInstruments_aucunInstrumentActif_retourneListeVide() {
        when(instrumentRepository.findAllWithActivePositions()).thenReturn(List.of());

        List<InstrumentDto> result = instrumentService.findActiveInstruments();

        assertThat(result).isEmpty();
    }

    // ── updatePrices ───────────────────────────────────────────

    @Test
    void updatePrices_metAJourLeCoursEtLaDate() {
        BigDecimal nouveauCours = new BigDecimal("95.00");
        UpdateInstrumentPriceRequest req = new UpdateInstrumentPriceRequest(1L, nouveauCours);

        when(instrumentRepository.findById(1L)).thenReturn(Optional.of(etf));
        when(instrumentRepository.save(any(Instrument.class))).thenAnswer(inv -> inv.getArgument(0));

        List<InstrumentDto> result = instrumentService.updatePrices(List.of(req));

        assertThat(result).hasSize(1);
        assertThat(result.get(0).lastPrice()).isEqualByComparingTo(nouveauCours);
        assertThat(result.get(0).lastPriceUpdatedAt()).isNotNull();
        verify(instrumentRepository).save(etf);
    }

    @Test
    void updatePrices_instrumentIntrouvable_leve404() {
        UpdateInstrumentPriceRequest req = new UpdateInstrumentPriceRequest(99L, new BigDecimal("10.00"));
        when(instrumentRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> instrumentService.updatePrices(List.of(req)))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void updatePrices_plusieursInstruments_metAJourTous() {
        UpdateInstrumentPriceRequest req1 = new UpdateInstrumentPriceRequest(1L, new BigDecimal("95.00"));
        UpdateInstrumentPriceRequest req2 = new UpdateInstrumentPriceRequest(2L, new BigDecimal("31000.00"));

        when(instrumentRepository.findById(1L)).thenReturn(Optional.of(etf));
        when(instrumentRepository.findById(2L)).thenReturn(Optional.of(bitcoin));
        when(instrumentRepository.save(any(Instrument.class))).thenAnswer(inv -> inv.getArgument(0));

        List<InstrumentDto> result = instrumentService.updatePrices(List.of(req1, req2));

        assertThat(result).hasSize(2);
        verify(instrumentRepository, times(2)).save(any(Instrument.class));
    }

    // ── updateStablePrice ──────────────────────────────────────

    @Test
    void updateStablePrice_activeLeFlag() {
        when(instrumentRepository.findById(1L)).thenReturn(Optional.of(etf));
        when(instrumentRepository.save(any(Instrument.class))).thenAnswer(inv -> inv.getArgument(0));

        InstrumentDto result = instrumentService.updateStablePrice(1L, true);

        assertThat(result.stablePrice()).isTrue();
        verify(instrumentRepository).save(etf);
    }

    @Test
    void updateStablePrice_desactiveLeFlag() {
        etf.setStablePrice(true);
        when(instrumentRepository.findById(1L)).thenReturn(Optional.of(etf));
        when(instrumentRepository.save(any(Instrument.class))).thenAnswer(inv -> inv.getArgument(0));

        InstrumentDto result = instrumentService.updateStablePrice(1L, false);

        assertThat(result.stablePrice()).isFalse();
    }

    @Test
    void updateStablePrice_instrumentIntrouvable_leve404() {
        when(instrumentRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> instrumentService.updateStablePrice(99L, true))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    // ── deleteInstrument ──────────────────────────────────────

    @Test
    void deleteInstrument_sansPosition_supprimeLInstrument() {
        when(instrumentRepository.findById(1L)).thenReturn(Optional.of(etf));
        when(positionRepository.findByInstrument(etf)).thenReturn(List.of());

        instrumentService.deleteInstrument(1L);

        verify(positionSnapshotRepository, never()).deleteByPositionIn(any());
        verify(positionRepository, never()).deleteAll(any());
        verify(instrumentRepository).delete(etf);
    }

    @Test
    void deleteInstrument_avecPositions_supprimeSnapshotsPuisPositions() {
        Position pos = Position.builder().id(10L).instrument(etf).build();
        when(instrumentRepository.findById(1L)).thenReturn(Optional.of(etf));
        when(positionRepository.findByInstrument(etf)).thenReturn(List.of(pos));

        instrumentService.deleteInstrument(1L);

        verify(positionSnapshotRepository).deleteByPositionIn(List.of(pos));
        verify(positionRepository).deleteAll(List.of(pos));
        verify(instrumentRepository).delete(etf);
    }

    @Test
    void deleteInstrument_instrumentIntrouvable_leve404() {
        when(instrumentRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> instrumentService.deleteInstrument(99L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    // ── update ─────────────────────────────────────────────────

    @Test
    void update_modifieLInstrument() {
        CreateInstrumentRequest request = new CreateInstrumentRequest(
                AssetCategory.BOURSE, "FR0010315770", null,
                "Lyxor PEA Nasdaq-100 (MAJ)", "EUR", null, null, null, null);

        when(instrumentRepository.findById(1L)).thenReturn(Optional.of(etf));
        when(instrumentRepository.findByIsin("FR0010315770")).thenReturn(Optional.of(etf));
        when(instrumentRepository.save(any(Instrument.class))).thenAnswer(inv -> inv.getArgument(0));

        InstrumentDto result = instrumentService.update(1L, request);

        assertThat(result.name()).isEqualTo("Lyxor PEA Nasdaq-100 (MAJ)");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Tests additionnels — branches non couvertes
    // ═══════════════════════════════════════════════════════════════════════════

    // ── findAll : combinaisons de filtres ────────────────────────────────────

    @Test
    void findAll_avecQEtCategorie_delegueLaRechercheCombinee() {
        when(instrumentRepository.searchByQueryAndCategory("nasd", AssetCategory.BOURSE))
                .thenReturn(List.of(etf));

        List<InstrumentDto> result = instrumentService.findAll("nasd", AssetCategory.BOURSE);

        assertThat(result).hasSize(1);
        verify(instrumentRepository, never()).searchByQuery(any());
        verify(instrumentRepository, never()).findAll();
    }

    @Test
    void findAll_qTropCourtAvecCategorie_filtreParCategorieSeule() {
        when(instrumentRepository.findByCategoryOrderByNameAsc(AssetCategory.CRYPTO))
                .thenReturn(List.of(bitcoin));

        List<InstrumentDto> result = instrumentService.findAll("a", AssetCategory.CRYPTO);

        assertThat(result).hasSize(1);
        verify(instrumentRepository, never()).searchByQueryAndCategory(any(), any());
    }

    // ── findById : 404 ──────────────────────────────────────────────────────

    @Test
    void findById_leve404_siInstrumentIntrouvable() {
        when(instrumentRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> instrumentService.findById(99L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    // ── validateRequest : ISIN/ticker uniques + obligatoires ─────────────────

    @Test
    void create_bourseSansIsin_leve400() {
        CreateInstrumentRequest req = new CreateInstrumentRequest(
                AssetCategory.BOURSE, null, null, "Nom", "EUR", null, null, null, null);

        assertThatThrownBy(() -> instrumentService.create(req))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("ISIN");
                });
    }

    @Test
    void create_bourseIsinDejaExistant_leve409() {
        CreateInstrumentRequest req = new CreateInstrumentRequest(
                AssetCategory.BOURSE, "FR0010315770", null, "Nom", "EUR", null, null, null, null);
        when(instrumentRepository.findByIsin("FR0010315770")).thenReturn(Optional.of(etf));

        assertThatThrownBy(() -> instrumentService.create(req))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    void create_cryptoSansTicker_leve400() {
        CreateInstrumentRequest req = new CreateInstrumentRequest(
                AssetCategory.CRYPTO, null, null, "Nom", "USD", null, null, null, null);

        assertThatThrownBy(() -> instrumentService.create(req))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("ticker");
                });
    }

    @Test
    void create_cryptoTickerDejaExistant_leve409() {
        CreateInstrumentRequest req = new CreateInstrumentRequest(
                AssetCategory.CRYPTO, null, "BTC", "Nom", "USD", null, null, null, null);
        when(instrumentRepository.findByTicker("BTC")).thenReturn(Optional.of(bitcoin));

        assertThatThrownBy(() -> instrumentService.create(req))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    void update_isinExistantSurAutreInstrument_leve409() {
        Instrument autre = Instrument.builder().id(99L).category(AssetCategory.BOURSE)
                .isin("US1234567890").name("Autre").currency("USD").build();
        when(instrumentRepository.findById(1L)).thenReturn(Optional.of(etf));
        when(instrumentRepository.findByIsin("US1234567890")).thenReturn(Optional.of(autre));

        CreateInstrumentRequest req = new CreateInstrumentRequest(
                AssetCategory.BOURSE, "US1234567890", null, "Nom", "EUR", null, null, null, null);

        assertThatThrownBy(() -> instrumentService.update(1L, req))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));
    }

    // ── updateAllocations / updateSectorAllocations ──────────────────────────

    @Test
    void updateAllocations_listeVide_supprimeToutEtRetourneVide() {
        when(instrumentRepository.findById(1L)).thenReturn(Optional.of(etf));

        var result = instrumentService.updateAllocations(1L, List.of());

        assertThat(result).isEmpty();
        verify(allocationRepository).deleteByInstrument(etf);
        verify(allocationRepository, never()).saveAll(any());
    }

    @Test
    void updateAllocations_filtreLesPaysVides() {
        when(instrumentRepository.findById(1L)).thenReturn(Optional.of(etf));
        when(allocationRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        var entries = List.of(
                new com.myfinance.dto.InstrumentAllocationDto("USA", new BigDecimal("60")),
                new com.myfinance.dto.InstrumentAllocationDto(null, new BigDecimal("10")),
                new com.myfinance.dto.InstrumentAllocationDto("", new BigDecimal("10")),
                new com.myfinance.dto.InstrumentAllocationDto("   ", new BigDecimal("10")),
                new com.myfinance.dto.InstrumentAllocationDto("Japan", new BigDecimal("20")));

        var result = instrumentService.updateAllocations(1L, entries);

        assertThat(result).hasSize(2);  // Seuls USA et Japan
    }

    @Test
    void updateSectorAllocations_filtreLesSecteursVides() {
        when(instrumentRepository.findById(1L)).thenReturn(Optional.of(etf));
        when(sectorAllocationRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        var entries = List.of(
                new com.myfinance.dto.InstrumentSectorAllocationDto("Tech", new BigDecimal("70")),
                new com.myfinance.dto.InstrumentSectorAllocationDto(null, new BigDecimal("10")),
                new com.myfinance.dto.InstrumentSectorAllocationDto("Finance", new BigDecimal("30")));

        var result = instrumentService.updateSectorAllocations(1L, entries);

        assertThat(result).hasSize(2);
    }

    // ── loadAllocationsForScore ──────────────────────────────────────────────

    @Test
    void loadAllocationsForScore_listeVide_retourneBundleVide() {
        InstrumentService.AllocationsBundle bundle = instrumentService.loadAllocationsForScore(List.of());

        assertThat(bundle.byCountry()).isEmpty();
        assertThat(bundle.bySector()).isEmpty();
        verifyNoInteractions(allocationRepository, sectorAllocationRepository);
    }

    // ── getPriceHistory : defaults ───────────────────────────────────────────

    @Test
    void getPriceHistory_sansDates_defautTroisAns() {
        when(instrumentRepository.findById(1L)).thenReturn(Optional.of(etf));
        when(priceHistoryRepository.findByInstrumentAndPriceDateBetweenOrderByPriceDateAsc(
                eq(etf), any(), any())).thenReturn(List.of());

        var result = instrumentService.getPriceHistory(1L, null, null);

        assertThat(result).isEmpty();
        // Vérifie que les dates par défaut sont [today-3y, today]
        verify(priceHistoryRepository).findByInstrumentAndPriceDateBetweenOrderByPriceDateAsc(
                eq(etf),
                argThat(d -> ((java.time.LocalDate) d).isBefore(java.time.LocalDate.now())),
                any());
    }

    @Test
    void getPriceHistory_instrumentIntrouvable_leve404() {
        when(instrumentRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> instrumentService.getPriceHistory(99L, null, null))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    // ── getOrderMarkers : filtrage par user + types ──────────────────────────

    @Test
    void getOrderMarkers_aucunePositionUtilisateur_retourneListeVide() {
        User user = User.builder().id(1L).role(RoleEnum.USER).build();
        when(instrumentRepository.findById(1L)).thenReturn(Optional.of(etf));
        when(positionRepository.findByInstrument(etf)).thenReturn(List.of());

        var result = instrumentService.getOrderMarkers(1L, user);

        assertThat(result).isEmpty();
        verifyNoInteractions(positionOrderRepository);
    }

    @Test
    void getOrderMarkers_filtrePositionDAutresUtilisateurs() {
        User user = User.builder().id(1L).role(RoleEnum.USER).build();
        User autre = User.builder().id(2L).role(RoleEnum.USER).build();
        Position posUser = Position.builder().id(10L).user(user).instrument(etf).build();
        Position posAutre = Position.builder().id(11L).user(autre).instrument(etf).build();

        when(instrumentRepository.findById(1L)).thenReturn(Optional.of(etf));
        when(positionRepository.findByInstrument(etf)).thenReturn(List.of(posUser, posAutre));
        PositionOrder buy = PositionOrder.builder()
                .position(posUser).orderType(OrderType.BUY)
                .orderDate(java.time.LocalDate.now()).build();
        when(positionOrderRepository.findByPositionInOrderByOrderDateAsc(List.of(posUser)))
                .thenReturn(List.of(buy));

        var result = instrumentService.getOrderMarkers(1L, user);

        assertThat(result).hasSize(1);
    }

    @Test
    void getOrderMarkers_filtreUniquementBuySellDividendInterest() {
        User user = User.builder().id(1L).role(RoleEnum.USER).build();
        Position pos = Position.builder().id(10L).user(user).instrument(etf).build();
        when(instrumentRepository.findById(1L)).thenReturn(Optional.of(etf));
        when(positionRepository.findByInstrument(etf)).thenReturn(List.of(pos));

        when(positionOrderRepository.findByPositionInOrderByOrderDateAsc(any()))
                .thenReturn(List.of(
                        PositionOrder.builder().position(pos).orderType(OrderType.BUY)
                                .orderDate(java.time.LocalDate.now()).build(),
                        PositionOrder.builder().position(pos).orderType(OrderType.DEPOSIT)
                                .orderDate(java.time.LocalDate.now()).build(),  // ← filtré
                        PositionOrder.builder().position(pos).orderType(OrderType.SELL)
                                .orderDate(java.time.LocalDate.now()).build(),
                        PositionOrder.builder().position(pos).orderType(OrderType.DIVIDEND)
                                .orderDate(java.time.LocalDate.now()).build()));

        var result = instrumentService.getOrderMarkers(1L, user);

        assertThat(result).hasSize(3);  // BUY + SELL + DIVIDEND (DEPOSIT filtré)
    }

    @Test
    void getOrderMarkers_instrumentIntrouvable_leve404() {
        User user = User.builder().id(1L).role(RoleEnum.USER).build();
        when(instrumentRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> instrumentService.getOrderMarkers(99L, user))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }
}
