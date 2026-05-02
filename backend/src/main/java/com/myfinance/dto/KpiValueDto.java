package com.myfinance.dto;

import com.myfinance.domain.KpiType;

public record KpiValueDto(
        KpiType kpiType,
        Double actualValue,       // valeur réelle calculée en %
        Double targetValue,       // cible configurée en % (null si non configurée)
        boolean higherIsBetter,   // true pour les rendements, false pour LTV
        boolean hasData           // false si impossible de calculer (données manquantes)
) {}
