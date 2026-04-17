package com.myfinance.dto;

import com.myfinance.domain.Possession;
import com.myfinance.domain.PossessionCategoryEnum;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Map;

public record PossessionDto(
        Long id,
        PossessionCategoryEnum category,
        String label,
        BigDecimal purchasePrice,
        LocalDate purchaseDate,
        BigDecimal estimatedCurrentValue,
        BigDecimal computedCurrentValue,
        BigDecimal effectiveCurrentValue,
        boolean isManualOverride,
        BigDecimal cumulatedDepreciation,
        BigDecimal depreciationRate,
        double yearsOwned,
        String notes,
        LocalDateTime createdAt
) {
    // Taux de décote annuel par catégorie (décote exponentielle)
    private static final Map<PossessionCategoryEnum, BigDecimal> ANNUAL_RATES = Map.of(
            PossessionCategoryEnum.VEHICULE,       new BigDecimal("0.15"),
            PossessionCategoryEnum.INFORMATIQUE,   new BigDecimal("0.30"),
            PossessionCategoryEnum.ELECTROMENAGER, new BigDecimal("0.12"),
            PossessionCategoryEnum.MOBILIER,       new BigDecimal("0.08"),
            PossessionCategoryEnum.COLLECTION,     BigDecimal.ZERO,
            PossessionCategoryEnum.LOISIRS,        new BigDecimal("0.15"),
            PossessionCategoryEnum.AUTRE,          new BigDecimal("0.10")
    );

    // Valeur résiduelle minimale par catégorie (fraction du prix d'achat)
    private static final Map<PossessionCategoryEnum, BigDecimal> RESIDUAL_RATES = Map.of(
            PossessionCategoryEnum.VEHICULE,       new BigDecimal("0.10"),
            PossessionCategoryEnum.INFORMATIQUE,   new BigDecimal("0.05"),
            PossessionCategoryEnum.ELECTROMENAGER, new BigDecimal("0.08"),
            PossessionCategoryEnum.MOBILIER,       new BigDecimal("0.10"),
            PossessionCategoryEnum.COLLECTION,     BigDecimal.ONE,
            PossessionCategoryEnum.LOISIRS,        new BigDecimal("0.10"),
            PossessionCategoryEnum.AUTRE,          new BigDecimal("0.10")
    );

    public static PossessionDto from(Possession p) {
        double years = computeYearsOwned(p.getPurchaseDate());
        BigDecimal computed = computeDepreciatedValue(p.getPurchasePrice(), p.getCategory(), years);

        boolean isOverride = p.getEstimatedCurrentValue() != null
                && p.getEstimatedCurrentValue().compareTo(BigDecimal.ZERO) > 0;
        BigDecimal effective = isOverride ? p.getEstimatedCurrentValue() : computed;

        BigDecimal depreciation = p.getPurchasePrice().subtract(effective).setScale(2, RoundingMode.HALF_UP);
        BigDecimal depRate = p.getPurchasePrice().compareTo(BigDecimal.ZERO) > 0
                ? depreciation.divide(p.getPurchasePrice(), 4, RoundingMode.HALF_UP)
                        .multiply(new BigDecimal("100")).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return new PossessionDto(
                p.getId(),
                p.getCategory(),
                p.getLabel(),
                p.getPurchasePrice(),
                p.getPurchaseDate(),
                p.getEstimatedCurrentValue(),
                computed,
                effective,
                isOverride,
                depreciation,
                depRate,
                Math.round(years * 100.0) / 100.0,
                p.getNotes(),
                p.getCreatedAt()
        );
    }

    private static double computeYearsOwned(LocalDate purchaseDate) {
        long days = ChronoUnit.DAYS.between(purchaseDate, LocalDate.now());
        return days / 365.25;
    }

    private static BigDecimal computeDepreciatedValue(BigDecimal purchasePrice,
                                                       PossessionCategoryEnum category,
                                                       double years) {
        BigDecimal annualRate = ANNUAL_RATES.getOrDefault(category, new BigDecimal("0.10"));
        BigDecimal residualRate = RESIDUAL_RATES.getOrDefault(category, new BigDecimal("0.10"));
        BigDecimal minValue = purchasePrice.multiply(residualRate).setScale(2, RoundingMode.HALF_UP);

        if (annualRate.compareTo(BigDecimal.ZERO) == 0 || years <= 0) {
            return purchasePrice.setScale(2, RoundingMode.HALF_UP);
        }

        // valeur = purchasePrice × (1 − annualRate)^years
        double retentionRate = 1.0 - annualRate.doubleValue();
        double computed = purchasePrice.doubleValue() * Math.pow(retentionRate, years);
        BigDecimal result = new BigDecimal(computed, MathContext.DECIMAL64).setScale(2, RoundingMode.HALF_UP);

        return result.compareTo(minValue) < 0 ? minValue : result;
    }
}
