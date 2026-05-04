package com.myfinance.service;

import com.myfinance.domain.*;
import com.myfinance.repository.PositionSnapshotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Valorisation d'une position ou d'un portefeuille à une date donnée.
 *
 * Les données historiques (prix, taux, snapshots) sont passées en paramètre
 * sous forme de maps pré-chargées par PerformanceService (stratégie anti N+1).
 *
 * Catégories couvertes : BOURSE, CRYPTO, LIVRET, IMMO_PAPIER.
 * Catégories exclues   : LIQUIDITE, IMMO_PHYSIQUE.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ValuationService {

    private final PositionSnapshotRepository positionSnapshotRepository;

    // ── API publique ──────────────────────────────────────────────────────────

    /**
     * Valorise une position à une date donnée en EUR.
     *
     * @param position    position à valoriser
     * @param date        date d'évaluation
     * @param priceMap    instrumentId → (date → cours en devise native), TreeMap trié
     * @param rateMap     currency → (date → taux EUR, convention amountEur = amountNatif / rate), TreeMap trié
     * @param snapshotMap positionId → (date → valeur EUR), pour IMMO_PAPIER
     * @param warnings    liste mutable — avertissements ajoutés si données manquantes
     * @return valeur en EUR, ou null si la position doit être exclue (données manquantes)
     */
    public BigDecimal valuePositionAt(
            Position position,
            LocalDate date,
            Map<Long, NavigableMap<LocalDate, BigDecimal>> priceMap,
            Map<String, NavigableMap<LocalDate, BigDecimal>> rateMap,
            Map<Long, NavigableMap<LocalDate, BigDecimal>> snapshotMap,
            List<String> warnings
    ) {
        // Position fermée : valorisée à 0 après closedDate
        if (position.getClosedDate() != null && date.isAfter(position.getClosedDate())) {
            return BigDecimal.ZERO;
        }

        return switch (position.getCategory()) {
            case BOURSE, CRYPTO -> valueBourseCrypto(position, date, priceMap, rateMap, warnings);
            case LIVRET         -> valueLivret(position, date);
            case IMMO_PAPIER    -> valueImmoPapier(position, date, snapshotMap, warnings);
            default             -> null;   // LIQUIDITE, IMMO_PHYSIQUE : exclus
        };
    }

    /**
     * Valorise l'ensemble du portefeuille éligible à une date donnée.
     * Les positions qui retournent null sont exclues (warnings déjà ajoutés).
     */
    public BigDecimal valuePortfolioAt(
            List<Position> positions,
            LocalDate date,
            Map<Long, NavigableMap<LocalDate, BigDecimal>> priceMap,
            Map<String, NavigableMap<LocalDate, BigDecimal>> rateMap,
            Map<Long, NavigableMap<LocalDate, BigDecimal>> snapshotMap,
            List<String> warnings
    ) {
        BigDecimal total = BigDecimal.ZERO;
        for (Position pos : positions) {
            BigDecimal val = valuePositionAt(pos, date, priceMap, rateMap, snapshotMap, warnings);
            if (val != null) total = total.add(val);
        }
        return total;
    }

    // ── Chargement des snapshots IMMO_PAPIER ─────────────────────────────────

    /**
     * Charge en batch les snapshots de valorisation pour une liste de positions IMMO_PAPIER.
     * Retourne une map positionId → TreeMap<date, valueEur>.
     */
    public Map<Long, NavigableMap<LocalDate, BigDecimal>> loadSnapshotBatch(List<Position> immoPapierPositions) {
        if (immoPapierPositions.isEmpty()) return Map.of();

        Map<Long, NavigableMap<LocalDate, BigDecimal>> result = new HashMap<>();
        for (PositionSnapshot ps : positionSnapshotRepository.findByPositionInOrderBySnapshotDateAsc(immoPapierPositions)) {
            Long posId = ps.getPosition().getId();
            LocalDate date = ps.getPortfolioSnapshot().getSnapshotDate();
            BigDecimal val = ps.getCurrentValueEur();
            result.computeIfAbsent(posId, k -> new TreeMap<>()).put(date, val);
        }
        return result;
    }

    // ── Valorisation BOURSE / CRYPTO ──────────────────────────────────────────

    private BigDecimal valueBourseCrypto(
            Position position,
            LocalDate date,
            Map<Long, NavigableMap<LocalDate, BigDecimal>> priceMap,
            Map<String, NavigableMap<LocalDate, BigDecimal>> rateMap,
            List<String> warnings
    ) {
        if (position.getInstrument() == null) return null;
        long instrumentId = position.getInstrument().getId();

        // Cas spécial : instrument à prix figé (Fonds en Euros, USDC...) → pas d'historique nécessaire
        // Valeur = somme nette des cashflows en EUR jusqu'à date (comme un livret sans capitalisation auto)
        if (position.getInstrument().isStablePrice()) {
            return valueStablePriceInstrument(position, date);
        }

        // Quantité nette à la date (BUY + AIRDROP + ABONDEMENT - SELL)
        BigDecimal quantity = BigDecimal.ZERO;
        for (PositionOrder order : position.getOrders()) {
            if (order.getOrderDate().isAfter(date)) continue;
            if (order.getQuantity() == null) continue;
            quantity = switch (order.getOrderType()) {
                case BUY, AIRDROP, ABONDEMENT -> quantity.add(order.getQuantity());
                case SELL                     -> quantity.subtract(order.getQuantity());
                default                       -> quantity;
            };
        }
        if (quantity.compareTo(BigDecimal.ZERO) <= 0) return BigDecimal.ZERO;

        // Prix en devise native (fallback au dernier connu ≤ date)
        NavigableMap<LocalDate, BigDecimal> prices = priceMap.get(instrumentId);
        BigDecimal price = floorValue(prices, date);
        if (price == null) {
            String msg = String.format("Historique prix manquant pour %s (%s) au %s — position exclue",
                    position.getLabel(), position.getInstrument().getName(), date);
            if (warnings != null && warnings.stream().noneMatch(w -> w.contains(position.getLabel()))) {
                warnings.add(msg);
            }
            log.warn("[Performance] {}", msg);
            return null;
        }

        // Taux de change (1.0 pour EUR)
        BigDecimal rate = getRateAt(position.getCurrency(), date, rateMap, warnings, position.getLabel());
        if (rate == null) return null;

        // valeur = quantité × prix / taux
        return quantity.multiply(price).divide(rate, 2, RoundingMode.HALF_UP);
    }

    /**
     * Valorisation d'un instrument à prix figé (stablePrice = true) :
     * Fonds en Euros d'AV, stablecoins (USDC, USDT...).
     * Valeur = somme nette des cashflows en EUR jusqu'à la date d'évaluation.
     * Aucun historique de prix nécessaire — donc aucun warning généré.
     */
    private BigDecimal valueStablePriceInstrument(Position position, LocalDate date) {
        BigDecimal balance = BigDecimal.ZERO;
        for (PositionOrder order : position.getOrders()) {
            if (order.getOrderDate().isAfter(date)) continue;
            BigDecimal amtEur = order.getAmountEur() != null
                    ? order.getAmountEur()
                    : order.getAmount();
            balance = switch (order.getOrderType()) {
                case BUY, DEPOSIT, ABONDEMENT, INTEREST, DIVIDEND, AIRDROP -> balance.add(amtEur);
                case SELL, WITHDRAWAL                                       -> balance.subtract(amtEur);
            };
        }
        return balance.setScale(2, RoundingMode.HALF_UP);
    }

    // ── Valorisation LIVRET ───────────────────────────────────────────────────

    /**
     * Valorise un LIVRET par capitalisation quotidienne simple.
     * taux_journalier = (1 + annualRate)^(1/365) - 1
     * Pour chaque jour : appliquer les cashflows du jour, puis capitaliser.
     */
    BigDecimal valueLivret(Position position, LocalDate date) {
        if (position.getAnnualRate() == null) return BigDecimal.ZERO;

        double annualRate   = position.getAnnualRate().doubleValue() / 100.0;
        double dailyRate    = Math.pow(1.0 + annualRate, 1.0 / 365.0) - 1.0;

        // Ordres triés par date
        List<PositionOrder> orders = position.getOrders().stream()
                .filter(o -> !o.getOrderDate().isAfter(date))
                .sorted(Comparator.comparing(PositionOrder::getOrderDate))
                .toList();

        if (orders.isEmpty()) return BigDecimal.ZERO;

        LocalDate startDate = orders.get(0).getOrderDate();
        double balance = 0;

        // Grouper les ordres par date
        Map<LocalDate, Double> flowsByDate = new TreeMap<>();
        for (PositionOrder order : orders) {
            double amount = order.getAmount().doubleValue();
            double signed = switch (order.getOrderType()) {
                case DEPOSIT, INTEREST, DIVIDEND, ABONDEMENT -> amount;
                case WITHDRAWAL -> -amount;
                default -> 0;
            };
            flowsByDate.merge(order.getOrderDate(), signed, Double::sum);
        }

        // Simulation jour par jour — on capitalise jusqu'au jour précédant la date d'évaluation,
        // puis on applique les cashflows de la date d'évaluation sans capitaliser
        // (la valeur est lue en début de journée, avant que l'intérêt soit crédité).
        LocalDate current = startDate;
        while (!current.isAfter(date)) {
            Double flow = flowsByDate.get(current);
            if (flow != null) balance += flow;
            if (current.isBefore(date)) {
                balance *= (1.0 + dailyRate);
            }
            current = current.plusDays(1);
        }

        return BigDecimal.valueOf(balance).setScale(2, RoundingMode.HALF_UP);
    }

    // ── Valorisation IMMO_PAPIER ──────────────────────────────────────────────

    /**
     * Valorise une SCPI par interpolation linéaire entre les snapshots mensuels.
     * Si aucun snapshot avant la date : position exclue + warning.
     * Si un seul snapshot antérieur : fallback sur ce snapshot (pas d'extrapolation future).
     */
    private BigDecimal valueImmoPapier(
            Position position,
            LocalDate date,
            Map<Long, NavigableMap<LocalDate, BigDecimal>> snapshotMap,
            List<String> warnings
    ) {
        NavigableMap<LocalDate, BigDecimal> snapshots = snapshotMap.get(position.getId());
        if (snapshots == null || snapshots.isEmpty()) {
            // Déduplication par label de position : 1 warning maximum
            if (warnings != null && warnings.stream().noneMatch(w -> w.contains(position.getLabel()))) {
                warnings.add(String.format("Aucun snapshot disponible pour %s (IMMO_PAPIER) — position exclue",
                        position.getLabel()));
            }
            log.warn("[Performance] Aucun snapshot pour {}", position.getLabel());
            return null;
        }

        Map.Entry<LocalDate, BigDecimal> before = snapshots.floorEntry(date);
        Map.Entry<LocalDate, BigDecimal> after  = snapshots.higherEntry(date);

        if (before == null) {
            // Déduplication par label : 1 warning maximum (ce cas se répète pour tous les mois avant le 1er snapshot)
            if (warnings != null && warnings.stream().noneMatch(w -> w.contains(position.getLabel()))) {
                warnings.add(String.format("Aucun snapshot antérieur au %s pour %s — position exclue avant cette date",
                        date, position.getLabel()));
            }
            log.warn("[Performance] Pas de snapshot avant {} pour {}", date, position.getLabel());
            return null;
        }
        if (after == null) {
            // Fallback : dernier snapshot connu
            return before.getValue();
        }

        // Interpolation linéaire
        long totalDays   = ChronoUnit.DAYS.between(before.getKey(), after.getKey());
        long elapsed     = ChronoUnit.DAYS.between(before.getKey(), date);
        if (totalDays == 0) return before.getValue();

        double ratio = (double) elapsed / totalDays;
        double interpolated = before.getValue().doubleValue()
                + ratio * (after.getValue().doubleValue() - before.getValue().doubleValue());
        return BigDecimal.valueOf(interpolated).setScale(2, RoundingMode.HALF_UP);
    }

    // ── Utilitaires ───────────────────────────────────────────────────────────

    /** Dernier taux connu ≤ date, ou 1.0 pour EUR. Null si inconnu (1 warning par devise). */
    private BigDecimal getRateAt(String currency, LocalDate date,
                                 Map<String, NavigableMap<LocalDate, BigDecimal>> rateMap,
                                 List<String> warnings, String posLabel) {
        if ("EUR".equalsIgnoreCase(currency)) return BigDecimal.ONE;

        NavigableMap<LocalDate, BigDecimal> rates = rateMap.get(currency.toUpperCase());
        BigDecimal rate = floorValue(rates, date);
        if (rate == null) {
            // Déduplication par devise : 1 warning maximum pour toute la période
            String currencyKey = "Taux de change " + currency.toUpperCase();
            if (warnings != null && warnings.stream().noneMatch(w -> w.contains(currencyKey))) {
                String msg = String.format(
                        "Taux de change %s absent de l'historique — positions en %s exclues du calcul. " +
                        "Lancer le backfill depuis la page Taux de change.",
                        currency.toUpperCase(), currency.toUpperCase());
                warnings.add(msg);
            }
            log.warn("[Performance] Taux {} manquant au {} pour {}", currency, date, posLabel);
        }
        return rate;
    }

    /** Retourne la valeur associée à la clé la plus haute ≤ date dans une NavigableMap. */
    private static BigDecimal floorValue(NavigableMap<LocalDate, BigDecimal> map, LocalDate date) {
        if (map == null || map.isEmpty()) return null;
        Map.Entry<LocalDate, BigDecimal> entry = map.floorEntry(date);
        return entry != null ? entry.getValue() : null;
    }
}
