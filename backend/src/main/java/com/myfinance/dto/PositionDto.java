package com.myfinance.dto;

import com.myfinance.domain.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public record PositionDto(
        Long id,
        AssetCategory category,
        String partner,
        String label,
        String currency,
        FiscalEnvelope fiscalEnvelope,
        // BOURSE / CRYPTO
        InstrumentDto instrument,
        AssetSubType assetSubType,
        // IMMO_PHYSIQUE
        OwnershipType ownershipType,
        String address,
        BigDecimal estimatedCurrentValue,
        // IMMO_PAPIER
        BigDecimal commissionRate,
        // LIVRET
        BigDecimal annualRate,
        // LIQUIDITE
        BigDecimal currentBalance,
        // Options
        Boolean includeInIncomeProjection,
        PositionStatus status,
        LocalDateTime createdAt,
        // Ordres (null si non demandés)
        List<PositionOrderDto> orders,
        // Totaux calculés
        PositionComputedDto computed
) {
    public static PositionDto from(Position position, List<PositionOrder> orders,
                                   Map<String, BigDecimal> exchangeRates) {
        List<PositionOrderDto> orderDtos = orders.stream()
                .map(PositionOrderDto::from)
                .toList();

        PositionComputedDto computed = computeTotals(position, orders, exchangeRates);

        return build(position, orderDtos, computed);
    }

    /** Version sans ordres — pour la liste (évite le N+1 query) */
    public static PositionDto fromWithoutOrders(Position position, List<PositionOrder> orders,
                                                Map<String, BigDecimal> exchangeRates) {
        PositionComputedDto computed = computeTotals(position, orders, exchangeRates);
        return build(position, null, computed);
    }

    private static PositionDto build(Position position, List<PositionOrderDto> orderDtos, PositionComputedDto computed) {
        InstrumentDto instrumentDto = position.getInstrument() != null
                ? InstrumentDto.from(position.getInstrument())
                : null;

        return new PositionDto(
                position.getId(),
                position.getCategory(),
                position.getPartner(),
                position.getLabel(),
                position.getCurrency(),
                position.getFiscalEnvelope(),
                instrumentDto,
                position.getAssetSubType(),
                position.getOwnershipType(),
                position.getAddress(),
                position.getEstimatedCurrentValue(),
                position.getCommissionRate(),
                position.getAnnualRate(),
                position.getCurrentBalance(),
                position.getIncludeInIncomeProjection(),
                position.getStatus(),
                position.getCreatedAt(),
                orderDtos,
                computed
        );
    }

    /** Point d'entrée public pour le service de snapshot */
    public static PositionComputedDto computeForSnapshot(Position position, List<PositionOrder> orders,
                                                         Map<String, BigDecimal> exchangeRates) {
        return computeTotals(position, orders, exchangeRates);
    }

    private static PositionComputedDto computeTotals(Position position, List<PositionOrder> orders,
                                                     Map<String, BigDecimal> exchangeRates) {
        return switch (position.getCategory()) {
            case LIQUIDITE     -> computeLiquidite(position);
            case IMMO_PHYSIQUE -> computeImmoPhysique(position, orders);
            case BOURSE, CRYPTO -> computeBourseCrypto(position, orders, exchangeRates);
            default            -> computeDefault(position, orders); // LIVRET, IMMO_PAPIER
        };
    }

    /** LIQUIDITE : valeur = solde courant, pas de plus-value */
    private static PositionComputedDto computeLiquidite(Position position) {
        BigDecimal balance = position.getCurrentBalance() != null
                ? position.getCurrentBalance()
                : BigDecimal.ZERO;
        return new PositionComputedDto(balance, balance, BigDecimal.ZERO, null, null);
    }

    /** IMMO_PHYSIQUE : valeur = estimatedCurrentValue saisie manuellement */
    private static PositionComputedDto computeImmoPhysique(Position position, List<PositionOrder> orders) {
        BigDecimal invested = computeInvested(orders);
        BigDecimal currentValue = position.getEstimatedCurrentValue() != null
                ? position.getEstimatedCurrentValue()
                : BigDecimal.ZERO;
        BigDecimal capitalGain = currentValue.subtract(invested);
        return new PositionComputedDto(invested, currentValue, capitalGain, null, null);
    }

    /**
     * BOURSE / CRYPTO : valeur = units × lastPrice, convertie en EUR via le taux de change si nécessaire.
     * Convention : exchangeRates["USD"] = 1.08 signifie 1 EUR = 1.08 USD,
     *              donc valueEur = valueUSD / 1.08.
     */
    private static PositionComputedDto computeBourseCrypto(Position position, List<PositionOrder> orders,
                                                            Map<String, BigDecimal> exchangeRates) {
        BigDecimal invested = computeInvested(orders);

        // Calcul des unités : Σ (BUY + AIRDROP).quantity - Σ SELL.quantity
        BigDecimal units = orders.stream()
                .filter(o -> o.getQuantity() != null)
                .map(o -> switch (o.getOrderType()) {
                    case BUY, AIRDROP ->  o.getQuantity();
                    case SELL         -> o.getQuantity().negate();
                    default           -> BigDecimal.ZERO;
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Valeur actuelle en devise native, puis conversion en EUR si nécessaire
        BigDecimal currentValue = BigDecimal.ZERO;
        if (position.getInstrument() != null && position.getInstrument().getLastPrice() != null
                && units.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal lastPrice = position.getInstrument().getLastPrice();
            currentValue = units.multiply(lastPrice).setScale(2, RoundingMode.HALF_UP);

            String currency = position.getInstrument().getCurrency();
            if (!"EUR".equals(currency) && exchangeRates != null) {
                BigDecimal rate = exchangeRates.get(currency);
                if (rate != null && rate.compareTo(BigDecimal.ZERO) > 0) {
                    currentValue = currentValue.divide(rate, 2, RoundingMode.HALF_UP);
                }
            }
        }

        BigDecimal capitalGain = currentValue.subtract(invested);

        // Projection mensuelle : dividendes / INTEREST reçus sur les 12 derniers mois
        BigDecimal monthlyProjection = null;
        if (Boolean.TRUE.equals(position.getIncludeInIncomeProjection())) {
            java.time.LocalDate cutoff = java.time.LocalDate.now().minusMonths(12);
            BigDecimal annualIncome = orders.stream()
                    .filter(o -> (o.getOrderType() == OrderType.DIVIDEND
                            || o.getOrderType() == OrderType.INTEREST)
                            && o.getOrderDate() != null
                            && !o.getOrderDate().isBefore(cutoff))
                    .map(PositionOrder::getAmountEur)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (annualIncome.compareTo(BigDecimal.ZERO) > 0) {
                monthlyProjection = annualIncome.divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);
            }
        }

        return new PositionComputedDto(invested, currentValue, capitalGain, units, monthlyProjection);
    }

    /** LIVRET / IMMO_PAPIER : valeur = investi + intérêts cumulés */
    private static PositionComputedDto computeDefault(Position position, List<PositionOrder> orders) {
        BigDecimal invested = computeInvested(orders);

        BigDecimal interests = orders.stream()
                .filter(o -> o.getOrderType() == OrderType.INTEREST
                        || o.getOrderType() == OrderType.DIVIDEND)
                .map(PositionOrder::getAmountEur)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal currentValue = invested.add(interests);
        BigDecimal capitalGain  = interests; // currentValue - invested = interests

        BigDecimal monthlyProjection = null;
        if (Boolean.TRUE.equals(position.getIncludeInIncomeProjection())
                && position.getCategory() == AssetCategory.LIVRET
                && position.getAnnualRate() != null
                && invested.compareTo(BigDecimal.ZERO) > 0) {
            monthlyProjection = invested
                    .multiply(position.getAnnualRate())
                    .divide(BigDecimal.valueOf(100 * 12), 2, RoundingMode.HALF_UP);
        }

        return new PositionComputedDto(invested, currentValue, capitalGain, null, monthlyProjection);
    }

    /** Calcule le montant investi net (BUY+DEPOSIT - SELL-WITHDRAWAL) */
    private static BigDecimal computeInvested(List<PositionOrder> orders) {
        return orders.stream()
                .map(o -> switch (o.getOrderType()) {
                    case BUY, DEPOSIT     ->  o.getAmountEur();
                    case SELL, WITHDRAWAL -> o.getAmountEur().negate();
                    default               -> BigDecimal.ZERO;
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
