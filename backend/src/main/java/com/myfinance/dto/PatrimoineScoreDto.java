package com.myfinance.dto;

import java.util.List;

public record PatrimoineScoreDto(
        int totalScore,
        int maxScore,
        String profile,
        String weakestAxisId,
        String weakestAxisAdvice,
        List<AxeScoreDto> axes
) {
    public record AxeScoreDto(
            String id,
            String label,
            int score,
            int maxScore,
            String detail,
            boolean missingData
    ) {}
}
