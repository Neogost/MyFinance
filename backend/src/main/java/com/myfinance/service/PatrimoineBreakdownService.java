package com.myfinance.service;

import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.BreakdownDimension;
import com.myfinance.domain.PositionStatus;
import com.myfinance.domain.User;
import com.myfinance.dto.InstrumentAllocationDto;
import com.myfinance.dto.InstrumentSectorAllocationDto;
import com.myfinance.dto.PortfolioBreakdownDto;
import com.myfinance.dto.PositionDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

@Service
@RequiredArgsConstructor
public class PatrimoineBreakdownService {

    static final String UNCLASSIFIED_KEY = "Non classé";
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private final PositionService positionService;

    public PortfolioBreakdownDto getBreakdown(User user, BreakdownDimension dimension, AssetCategory category) {
        return switch (dimension) {
            case SECTOR        -> aggregateFromSector(user);
            case COUNTRY       -> aggregateFromCountry(user);
            case CONTINENT     -> aggregateFromContinent(user);
            case CURRENCY      -> aggregateBySingleField(user, BreakdownDimension.CURRENCY,
                    category != null ? category : AssetCategory.BOURSE,
                    p -> p.instrument() != null && p.instrument().currency() != null
                            ? p.instrument().currency() : p.currency());
            case ASSET_SUBTYPE  -> aggregateFromAssetSubType(user);
            case CRYPTO_TYPE    -> aggregateFromCryptoType(user);
            case CRYPTO_NETWORK -> aggregateFromCryptoNetwork(user);
            case PROPERTY_USAGE -> aggregateFromPropertyUsage(user);
        };
    }

    // ── IMMO_PHYSIQUE × usage (RP / Locatif / Secondaire) ─────

    private PortfolioBreakdownDto aggregateFromPropertyUsage(User user) {
        return aggregateBySingleField(user, BreakdownDimension.PROPERTY_USAGE, AssetCategory.IMMO_PHYSIQUE,
                p -> p.propertyUsage() != null ? p.propertyUsage().name() : null);
    }

    // ── BOURSE × secteur (via InstrumentSectorAllocation) ──────

    private PortfolioBreakdownDto aggregateFromSector(User user) {
        return aggregateFromAllocations(user, BreakdownDimension.SECTOR,
                p -> {
                    if (p.instrument() == null || p.instrument().sectorAllocation() == null) return List.of();
                    return p.instrument().sectorAllocation().stream()
                            .map(a -> new KeyPercent(a.sector(), a.percentage()))
                            .toList();
                });
    }

    // ── BOURSE × pays (via InstrumentAllocation) ───────────────

    private PortfolioBreakdownDto aggregateFromCountry(User user) {
        return aggregateFromAllocations(user, BreakdownDimension.COUNTRY,
                p -> {
                    if (p.instrument() == null || p.instrument().countryAllocation() == null) return List.of();
                    return p.instrument().countryAllocation().stream()
                            .map(a -> new KeyPercent(a.country(), a.percentage()))
                            .toList();
                });
    }

    // ── BOURSE × continent (via InstrumentAllocation + mapping pays→continent) ──

    private PortfolioBreakdownDto aggregateFromContinent(User user) {
        return aggregateFromAllocations(user, BreakdownDimension.CONTINENT,
                p -> {
                    if (p.instrument() == null || p.instrument().countryAllocation() == null) return List.of();
                    return p.instrument().countryAllocation().stream()
                            .map(a -> new KeyPercent(countryToContinent(a.country()), a.percentage()))
                            .toList();
                });
    }

    /** Mappe un pays (nom français, anglais ou code ISO-2) vers un continent. */
    private static String countryToContinent(String country) {
        if (country == null) return UNCLASSIFIED_KEY;
        return COUNTRY_TO_CONTINENT.getOrDefault(country.trim(), UNCLASSIFIED_KEY);
    }

    private static final Map<String, String> COUNTRY_TO_CONTINENT;

    static {
        Map<String, String> m = new java.util.HashMap<>();

        // ── Amérique du Nord ───────────────────────────────────────
        for (String c : new String[]{"US","CA","MX",
                "Etats-Unis","États-Unis","United States","USA",
                "Canada","Mexique","Mexico"})
            m.put(c, "Amérique du Nord");

        // ── Amérique latine ────────────────────────────────────────
        for (String c : new String[]{"BR","AR","CL","CO","PE","UY","PY","BO","EC","VE",
                "Brésil","Brésil","Brazil","Argentine","Argentina","Chili","Chile",
                "Colombie","Colombia","Pérou","Peru","Uruguay","Paraguay",
                "Bolivie","Équateur","Venezuela"})
            m.put(c, "Amérique latine");

        // ── Europe ─────────────────────────────────────────────────
        for (String c : new String[]{"FR","DE","GB","CH","NL","SE","DK","NO","FI","BE",
                "ES","IT","PT","AT","IE","LU","PL","CZ","HU","GR","RO","SK","SI",
                "HR","BG","LT","LV","EE","MT","CY","IS","LI","MC","AD","SM","VA",
                "TR",
                "France","Allemagne","Germany","Royaume-Uni","United Kingdom","UK",
                "Suisse","Switzerland","Pays-Bas","Netherlands","Suède","Sweden",
                "Danemark","Denmark","Norvège","Norway","Finlande","Finland",
                "Belgique","Belgium","Espagne","Spain","Italie","Italy",
                "Portugal","Autriche","Austria","Irlande","Ireland",
                "Luxembourg","Pologne","Poland","République Tchèque","Czech Republic","Czechia",
                "Hongrie","Hungary","Grèce","Greece","Roumanie","Romania",
                "Slovaquie","Slovakia","Slovénie","Slovenia","Croatie","Croatia",
                "Bulgarie","Bulgaria","Lituanie","Lettonie","Estonie",
                "Turquie","Turkey","Islande","Iceland"})
            m.put(c, "Europe");

        // ── Asie-Pacifique ─────────────────────────────────────────
        for (String c : new String[]{"JP","CN","KR","TW","AU","SG","HK","IN","TH","MY",
                "ID","PH","NZ","VN","PK","BD",
                "Japon","Japan","Chine","China","Corée du Sud","South Korea","Korea",
                "Taiwan","Australie","Australia","Singapour","Singapore",
                "Hong Kong","Inde","India","Thaïlande","Thailand","Malaisie","Malaysia",
                "Indonésie","Indonesia","Philippines","Nouvelle-Zélande","New Zealand",
                "Vietnam","Pakistan","Bangladesh"})
            m.put(c, "Asie-Pacifique");

        // ── Moyen-Orient & Afrique ────────────────────────────────
        for (String c : new String[]{"SA","AE","IL","EG","ZA","QA","KW","BH","OM","JO",
                "MA","TN","NG","KE","GH","ET","TZ",
                "Arabie Saoudite","Saudi Arabia","Émirats Arabes Unis","UAE",
                "United Arab Emirates","Israël","Israel","Égypte","Egypt",
                "Afrique du Sud","South Africa","Qatar","Koweït","Kuwait",
                "Bahreïn","Oman","Jordanie","Maroc","Morocco","Tunisie","Nigeria",
                "Kenya","Ghana"})
            m.put(c, "Moyen-Orient & Afrique");

        COUNTRY_TO_CONTINENT = java.util.Collections.unmodifiableMap(m);
    }

    // ── BOURSE × sous-type (ETF / ACTION / OBLIGATION / ...) ───

    private PortfolioBreakdownDto aggregateFromAssetSubType(User user) {
        return aggregateBySingleField(user, BreakdownDimension.ASSET_SUBTYPE, AssetCategory.BOURSE,
                p -> p.assetSubType() != null ? p.assetSubType().name() : null);
    }

    // ── CRYPTO × type (Stablecoin / Store of value / Smart contract / ...) ──

    private PortfolioBreakdownDto aggregateFromCryptoType(User user) {
        return aggregateBySingleField(user, BreakdownDimension.CRYPTO_TYPE, AssetCategory.CRYPTO,
                p -> p.instrument() != null && p.instrument().cryptoType() != null
                        ? p.instrument().cryptoType().name() : null);
    }

    // ── CRYPTO × réseau (Bitcoin / Ethereum / Solana / ...) ────

    private PortfolioBreakdownDto aggregateFromCryptoNetwork(User user) {
        return aggregateBySingleField(user, BreakdownDimension.CRYPTO_NETWORK, AssetCategory.CRYPTO,
                p -> p.instrument() != null && p.instrument().cryptoNetwork() != null
                        ? p.instrument().cryptoNetwork().name() : null);
    }

    // ── Helpers ────────────────────────────────────────────────

    /**
     * Agrégation par allocation pondérée (un instrument peut avoir plusieurs entrées
     * SectorAllocation ou CountryAllocation, totalisant idéalement 100 %).
     * Le résidu (1 − Σ allocations) bascule en "Non classé".
     */
    private PortfolioBreakdownDto aggregateFromAllocations(User user, BreakdownDimension dimension,
                                                           Function<PositionDto, List<KeyPercent>> resolver) {
        List<PositionDto> positions = positionService.findAllByUser(user, AssetCategory.BOURSE, PositionStatus.ACTIVE);

        Map<String, BigDecimal> bucket = new LinkedHashMap<>();
        BigDecimal totalEur = BigDecimal.ZERO;
        BigDecimal unclassified = BigDecimal.ZERO;

        for (PositionDto p : positions) {
            BigDecimal valueEur = positionValueEur(p);
            if (valueEur.compareTo(BigDecimal.ZERO) <= 0) continue;
            totalEur = totalEur.add(valueEur);

            List<KeyPercent> entries = resolver.apply(p);
            if (entries == null || entries.isEmpty()) {
                unclassified = unclassified.add(valueEur);
                continue;
            }

            BigDecimal classifiedSum = BigDecimal.ZERO;
            for (KeyPercent kp : entries) {
                if (kp.key() == null || kp.percentage() == null) continue;
                BigDecimal contribution = valueEur
                        .multiply(kp.percentage())
                        .divide(HUNDRED, 2, RoundingMode.HALF_UP);
                bucket.merge(kp.key(), contribution, BigDecimal::add);
                classifiedSum = classifiedSum.add(contribution);
            }

            BigDecimal residual = valueEur.subtract(classifiedSum);
            if (residual.compareTo(BigDecimal.ZERO) > 0) {
                unclassified = unclassified.add(residual);
            }
        }

        return finalize(dimension, bucket, totalEur, unclassified);
    }

    /**
     * Agrégation directe : chaque position contribue à 100 % à un seul bucket
     * (ou "Non classé" si la clé est null).
     */
    private PortfolioBreakdownDto aggregateBySingleField(User user, BreakdownDimension dimension,
                                                         AssetCategory category,
                                                         Function<PositionDto, String> keyExtractor) {
        List<PositionDto> positions = positionService.findAllByUser(user, category, PositionStatus.ACTIVE);

        Map<String, BigDecimal> bucket = new LinkedHashMap<>();
        BigDecimal totalEur = BigDecimal.ZERO;
        BigDecimal unclassified = BigDecimal.ZERO;

        for (PositionDto p : positions) {
            BigDecimal valueEur = positionValueEur(p);
            if (valueEur.compareTo(BigDecimal.ZERO) <= 0) continue;
            totalEur = totalEur.add(valueEur);

            String key = keyExtractor.apply(p);
            if (key == null || key.isBlank()) {
                unclassified = unclassified.add(valueEur);
            } else {
                bucket.merge(key, valueEur, BigDecimal::add);
            }
        }

        return finalize(dimension, bucket, totalEur, unclassified);
    }

    private PortfolioBreakdownDto finalize(BreakdownDimension dimension, Map<String, BigDecimal> bucket,
                                           BigDecimal totalEur, BigDecimal unclassified) {
        if (unclassified.compareTo(BigDecimal.ZERO) > 0) {
            bucket.put(UNCLASSIFIED_KEY, unclassified);
        }

        BigDecimal coverageRatio = BigDecimal.ZERO;
        if (totalEur.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal classified = totalEur.subtract(unclassified);
            coverageRatio = classified.multiply(HUNDRED).divide(totalEur, 1, RoundingMode.HALF_UP);
        }

        BigDecimal finalTotal = totalEur;
        List<PortfolioBreakdownDto.BreakdownItem> items = bucket.entrySet().stream()
                .map(e -> {
                    BigDecimal pct = finalTotal.compareTo(BigDecimal.ZERO) > 0
                            ? e.getValue().multiply(HUNDRED).divide(finalTotal, 1, RoundingMode.HALF_UP)
                            : BigDecimal.ZERO;
                    return new PortfolioBreakdownDto.BreakdownItem(e.getKey(), e.getValue(), pct);
                })
                .sorted(itemComparator())
                .toList();

        return new PortfolioBreakdownDto(
                AssetCategory.BOURSE,
                dimension,
                totalEur.setScale(2, RoundingMode.HALF_UP),
                coverageRatio,
                unclassified.setScale(2, RoundingMode.HALF_UP),
                items
        );
    }

    private static BigDecimal positionValueEur(PositionDto p) {
        return p.computed() != null && p.computed().currentValueEur() != null
                ? p.computed().currentValueEur()
                : BigDecimal.ZERO;
    }

    /** "Non classé" toujours en dernier, puis par valeur décroissante. */
    private static Comparator<PortfolioBreakdownDto.BreakdownItem> itemComparator() {
        return (a, b) -> {
            boolean aUn = UNCLASSIFIED_KEY.equals(a.key());
            boolean bUn = UNCLASSIFIED_KEY.equals(b.key());
            if (aUn && !bUn) return 1;
            if (!aUn && bUn) return -1;
            return b.valueEur().compareTo(a.valueEur());
        };
    }

    /** Tuple interne pour homogénéiser sector / country. */
    private record KeyPercent(String key, BigDecimal percentage) {}

    // Imports utilitaires gardés pour clarté
    @SuppressWarnings("unused")
    private static final Class<?> SECTOR_TYPE = InstrumentSectorAllocationDto.class;
    @SuppressWarnings("unused")
    private static final Class<?> COUNTRY_TYPE = InstrumentAllocationDto.class;
}
