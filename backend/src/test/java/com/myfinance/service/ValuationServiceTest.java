package com.myfinance.service;

import com.myfinance.domain.*;
import com.myfinance.repository.PositionSnapshotRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

@ExtendWith(MockitoExtension.class)
class ValuationServiceTest {

    @Mock PositionSnapshotRepository positionSnapshotRepository;
    @InjectMocks ValuationService service;

    private static final double EPS_EUR = 0.05; // tolérance 5 centimes

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Position livretPosition(BigDecimal annualRatePct) {
        Position p = new Position();
        p.setId(1L);
        p.setCategory(AssetCategory.LIVRET);
        p.setLabel("Livret A");
        p.setCurrency("EUR");
        p.setAnnualRate(annualRatePct);
        p.setStatus(PositionStatus.ACTIVE);
        p.setIncludeInIncomeProjection(true);
        p.setCreatedAt(LocalDateTime.now());
        return p;
    }

    private Position boursePosition(Long id, Instrument instrument, String currency) {
        Position p = new Position();
        p.setId(id);
        p.setCategory(AssetCategory.BOURSE);
        p.setLabel("ETF World");
        p.setCurrency(currency);
        p.setInstrument(instrument);
        p.setStatus(PositionStatus.ACTIVE);
        p.setIncludeInIncomeProjection(true);
        p.setCreatedAt(LocalDateTime.now());
        return p;
    }

    private Instrument instrument(Long id) {
        Instrument i = new Instrument();
        i.setId(id);
        i.setName("iShares MSCI World");
        return i;
    }

    private PositionOrder buyOrder(Position pos, LocalDate date, BigDecimal qty, BigDecimal amount) {
        PositionOrder o = new PositionOrder();
        o.setPosition(pos);
        o.setOrderType(OrderType.BUY);
        o.setQuantity(qty);
        o.setAmount(amount);
        o.setAmountEur(amount);
        o.setOrderDate(date);
        return o;
    }

    private PositionOrder depositOrder(Position pos, LocalDate date, BigDecimal amount) {
        PositionOrder o = new PositionOrder();
        o.setPosition(pos);
        o.setOrderType(OrderType.DEPOSIT);
        o.setAmount(amount);
        o.setAmountEur(amount);
        o.setOrderDate(date);
        return o;
    }

    private Map<Long, NavigableMap<LocalDate, BigDecimal>> singlePriceMap(
            Long instrumentId, LocalDate date, BigDecimal price) {
        NavigableMap<LocalDate, BigDecimal> m = new TreeMap<>();
        m.put(date, price);
        return Map.of(instrumentId, m);
    }

    private Map<String, NavigableMap<LocalDate, BigDecimal>> singleRateMap(
            String currency, LocalDate date, BigDecimal rate) {
        NavigableMap<LocalDate, BigDecimal> m = new TreeMap<>();
        m.put(date, rate);
        return Map.of(currency, m);
    }

    // ── LIVRET ────────────────────────────────────────────────────────────────

    @Test
    void livret_3pct_apres365Jours_environ1030() {
        // 1000 € déposés le 2023-01-01, taux 3 %/an, valorisé au 2024-01-01
        // 2023 n'est pas bissextile → exactement 365 jours de capitalisation
        // valeur attendue = 1000 × (1.03)^(365/365) = 1030.00
        Position p = livretPosition(new BigDecimal("3.0"));
        p.setOrders(new ArrayList<>(List.of(
                depositOrder(p, LocalDate.of(2023, 1, 1), new BigDecimal("1000"))
        )));

        BigDecimal val = service.valueLivret(p, LocalDate.of(2024, 1, 1));

        assertThat(val.doubleValue()).isCloseTo(1030.00, within(EPS_EUR));
    }

    @Test
    void livret_3pct_apres730Jours_environ1060_90() {
        // 1000 € déposés le 2022-01-01, valorisé au 2024-01-01
        // 2022 et 2023 non bissextiles → 730 jours de capitalisation
        // valeur = 1000 × (1.03)^2 = 1060.90
        Position p = livretPosition(new BigDecimal("3.0"));
        p.setOrders(new ArrayList<>(List.of(
                depositOrder(p, LocalDate.of(2022, 1, 1), new BigDecimal("1000"))
        )));

        BigDecimal val = service.valueLivret(p, LocalDate.of(2024, 1, 1));

        assertThat(val.doubleValue()).isCloseTo(1060.90, within(EPS_EUR));
    }

    @Test
    void livret_3pct_deuxVersements_6MoisEcart_apres1An() {
        // Versement 1 : 1000 € le 2023-01-01, valorisé au 2024-01-01 = 365 capitalisations
        // Versement 2 : 1000 € le 2023-07-01 = 184 capitalisations (Jul→Dec = 184 jours dans 2023)
        // valeur ≈ 1000×(1.03)^(365/365) + 1000×(1.03)^(184/365)
        Position p = livretPosition(new BigDecimal("3.0"));
        p.setOrders(new ArrayList<>(List.of(
                depositOrder(p, LocalDate.of(2023, 1, 1), new BigDecimal("1000")),
                depositOrder(p, LocalDate.of(2023, 7, 1), new BigDecimal("1000"))
        )));

        BigDecimal val = service.valueLivret(p, LocalDate.of(2024, 1, 1));

        double dr = Math.pow(1.03, 1.0 / 365) - 1;
        double expected = 1000 * Math.pow(1 + dr, 365) + 1000 * Math.pow(1 + dr, 184);
        assertThat(val.doubleValue()).isCloseTo(expected, within(1.0));
    }

    // ── BOURSE EUR ────────────────────────────────────────────────────────────

    @Test
    void bourse_eur_100ActionsA50_cours55() {
        // 100 actions BUY le 2024-06-01 à 50 €, valorisé au 2024-12-01 (cours 55 €)
        // valeur = 100 × 55 / 1.0 = 5500 €
        Instrument instr = instrument(10L);
        Position p = boursePosition(1L, instr, "EUR");

        PositionOrder o = buyOrder(p, LocalDate.of(2024, 6, 1),
                new BigDecimal("100"), new BigDecimal("5000"));
        p.setOrders(new ArrayList<>(List.of(o)));

        LocalDate evalDate = LocalDate.of(2024, 12, 1);
        var priceMap = singlePriceMap(10L, evalDate, new BigDecimal("55"));
        List<String> warnings = new ArrayList<>();

        BigDecimal val = service.valuePositionAt(p, evalDate, priceMap, Map.of(), Map.of(), warnings);

        assertThat(val).isNotNull();
        assertThat(val.doubleValue()).isCloseTo(5500.0, within(EPS_EUR));
        assertThat(warnings).isEmpty();
    }

    @Test
    void bourse_usd_100ActionsA55Usd_taux1_10() {
        // 100 actions BUY le 2024-06-01, valorisé au 2024-12-01 (cours 55 USD, taux 1.10 USD/EUR)
        // valeur = 100 × 55 / 1.10 = 5000 €
        Instrument instr = instrument(10L);
        Position p = boursePosition(1L, instr, "USD");

        PositionOrder o = buyOrder(p, LocalDate.of(2024, 6, 1),
                new BigDecimal("100"), new BigDecimal("5000"));
        p.setOrders(new ArrayList<>(List.of(o)));

        LocalDate evalDate = LocalDate.of(2024, 12, 1);
        var priceMap = singlePriceMap(10L, evalDate, new BigDecimal("55"));
        var rateMap  = singleRateMap("USD", evalDate, new BigDecimal("1.10"));
        List<String> warnings = new ArrayList<>();

        BigDecimal val = service.valuePositionAt(p, evalDate, priceMap, rateMap, Map.of(), warnings);

        assertThat(val).isNotNull();
        assertThat(val.doubleValue()).isCloseTo(5000.0, within(EPS_EUR));
    }

    @Test
    void bourse_positionFermee_apresClosedDate_retourneZero() {
        // Position fermée le 2024-09-01, valorisée au 2024-10-01 → 0 €
        Instrument instr = instrument(10L);
        Position p = boursePosition(1L, instr, "EUR");
        p.setClosedDate(LocalDate.of(2024, 9, 1));
        p.setStatus(PositionStatus.CLOSED);

        PositionOrder o = buyOrder(p, LocalDate.of(2024, 6, 1),
                new BigDecimal("100"), new BigDecimal("5000"));
        p.setOrders(new ArrayList<>(List.of(o)));

        BigDecimal val = service.valuePositionAt(p, LocalDate.of(2024, 10, 1),
                Map.of(), Map.of(), Map.of(), new ArrayList<>());

        assertThat(val).isNotNull().isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void bourse_sansPrixHistorique_retourneNull_etAjouteWarning() {
        // Aucun prix disponible → position exclue + warning
        Instrument instr = instrument(10L);
        Position p = boursePosition(1L, instr, "EUR");

        PositionOrder o = buyOrder(p, LocalDate.of(2024, 6, 1),
                new BigDecimal("100"), new BigDecimal("5000"));
        p.setOrders(new ArrayList<>(List.of(o)));

        List<String> warnings = new ArrayList<>();
        BigDecimal val = service.valuePositionAt(p, LocalDate.of(2024, 12, 1),
                Map.of(), Map.of(), Map.of(), warnings);

        assertThat(val).isNull();
        assertThat(warnings).hasSize(1).allMatch(w -> w.contains("manquant"));
    }

    // ── Instrument à prix figé (Fonds en Euros, USDC, etc.) ────────────────────

    @Test
    void stablePrice_sommeCashflowsEnEur_aucunWarning() {
        // Fonds en Euros : stablePrice=true, lastPrice=1
        // 3 versements de 100€ + 1 intérêt de 50€ = 350€ de valeur, sans warning même sans historique de prix
        Instrument instr = new Instrument();
        instr.setId(11L);
        instr.setName("Fonds en Euros");
        instr.setStablePrice(true);

        Position p = boursePosition(1L, instr, "EUR");
        p.setOrders(new ArrayList<>(List.of(
                depositLikeOrder(p, LocalDate.of(2024, 1, 15), OrderType.BUY,      new BigDecimal("100")),
                depositLikeOrder(p, LocalDate.of(2024, 2, 15), OrderType.BUY,      new BigDecimal("100")),
                depositLikeOrder(p, LocalDate.of(2024, 3, 15), OrderType.BUY,      new BigDecimal("100")),
                depositLikeOrder(p, LocalDate.of(2024, 12, 31), OrderType.INTEREST, new BigDecimal("50"))
        )));

        List<String> warnings = new ArrayList<>();
        // Aucun priceMap, aucun historique → ne devrait PAS générer de warning car stablePrice
        BigDecimal val = service.valuePositionAt(p, LocalDate.of(2025, 1, 1),
                Map.of(), Map.of(), Map.of(), warnings);

        assertThat(val).isNotNull();
        assertThat(val.doubleValue()).isCloseTo(350.0, within(0.01));
        assertThat(warnings).isEmpty();
    }

    @Test
    void stablePrice_avecRetraits_solde() {
        // BUY 1000 puis SELL 200 → solde 800
        Instrument instr = new Instrument();
        instr.setId(11L);
        instr.setName("Fonds en Euros");
        instr.setStablePrice(true);

        Position p = boursePosition(1L, instr, "EUR");
        p.setOrders(new ArrayList<>(List.of(
                depositLikeOrder(p, LocalDate.of(2024, 1, 1),  OrderType.BUY,  new BigDecimal("1000")),
                depositLikeOrder(p, LocalDate.of(2024, 6, 1),  OrderType.SELL, new BigDecimal("200"))
        )));

        BigDecimal val = service.valuePositionAt(p, LocalDate.of(2024, 12, 1),
                Map.of(), Map.of(), Map.of(), new ArrayList<>());

        assertThat(val).isNotNull();
        assertThat(val.doubleValue()).isCloseTo(800.0, within(0.01));
    }

    private PositionOrder depositLikeOrder(Position pos, LocalDate date, OrderType type, BigDecimal amount) {
        PositionOrder o = new PositionOrder();
        o.setPosition(pos);
        o.setOrderType(type);
        o.setAmount(amount);
        o.setAmountEur(amount);
        o.setOrderDate(date);
        return o;
    }

    // ── IMMO_PAPIER interpolation ─────────────────────────────────────────────

    @Test
    void immoPapier_interpolationLineaire() {
        // Snapshot 2024-01-01 → 10 000 €, snapshot 2024-07-01 → 11 000 €
        // Valorisé au 2024-04-01 : exactement 90 jours / 182 jours ≈ 49.45% du chemin
        // valeur ≈ 10 000 + 0.4945 × 1000 ≈ 10 494 €
        Position p = new Position();
        p.setId(5L);
        p.setCategory(AssetCategory.IMMO_PAPIER);
        p.setLabel("SCPI Pierre");
        p.setCurrency("EUR");
        p.setStatus(PositionStatus.ACTIVE);
        p.setIncludeInIncomeProjection(true);
        p.setCreatedAt(LocalDateTime.now());
        p.setOrders(new ArrayList<>());

        NavigableMap<LocalDate, BigDecimal> snapshots = new TreeMap<>();
        snapshots.put(LocalDate.of(2024, 1, 1), new BigDecimal("10000"));
        snapshots.put(LocalDate.of(2024, 7, 1), new BigDecimal("11000"));
        Map<Long, NavigableMap<LocalDate, BigDecimal>> snapshotMap = Map.of(5L, snapshots);

        LocalDate evalDate = LocalDate.of(2024, 4, 1);
        List<String> warnings = new ArrayList<>();
        BigDecimal val = service.valuePositionAt(p, evalDate, Map.of(), Map.of(), snapshotMap, warnings);

        // 90 jours / 181 jours = ratio
        long total   = java.time.temporal.ChronoUnit.DAYS.between(LocalDate.of(2024, 1, 1), LocalDate.of(2024, 7, 1));
        long elapsed = java.time.temporal.ChronoUnit.DAYS.between(LocalDate.of(2024, 1, 1), evalDate);
        double expected = 10000 + (double) elapsed / total * 1000;

        assertThat(val).isNotNull();
        assertThat(val.doubleValue()).isCloseTo(expected, within(EPS_EUR));
        assertThat(warnings).isEmpty();
    }

    // ── Catégories exclues ────────────────────────────────────────────────────

    @Test
    void liquidite_retourneNull() {
        Position p = new Position();
        p.setId(9L);
        p.setCategory(AssetCategory.LIQUIDITE);
        p.setLabel("Compte courant");
        p.setCurrency("EUR");
        p.setStatus(PositionStatus.ACTIVE);
        p.setIncludeInIncomeProjection(true);
        p.setCreatedAt(LocalDateTime.now());
        p.setOrders(new ArrayList<>());

        BigDecimal val = service.valuePositionAt(p, LocalDate.now(),
                Map.of(), Map.of(), Map.of(), new ArrayList<>());
        assertThat(val).isNull();
    }
}
