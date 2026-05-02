package com.myfinance.dto;

import java.util.List;
import java.util.Map;

public record PatrimoineTargetsDto(
        Map<String, Double> targets,
        Map<String, Double> maxTargets,           // plafonds (LIQUIDITE, LIVRET) — nullable par catégorie
        Map<String, List<TargetBreakdownDto>> breakdowns
) {}
