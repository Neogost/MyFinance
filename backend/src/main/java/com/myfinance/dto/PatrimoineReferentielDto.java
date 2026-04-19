package com.myfinance.dto;

import com.myfinance.config.PatrimoineReferentiel;

import java.util.List;

public record PatrimoineReferentielDto(
        String source,
        List<TrancheDto> tranches
) {
    public record TrancheDto(
            String label,
            int ageMin,
            int ageMax,
            long d1, long d2, long d3, long d4, long d5,
            long d6, long d7, long d8, long d9
    ) {
        public static TrancheDto from(PatrimoineReferentiel.Tranche t) {
            return new TrancheDto(
                    t.getLabel(), t.getAgeMin(), t.getAgeMax(),
                    t.getD1(), t.getD2(), t.getD3(), t.getD4(), t.getD5(),
                    t.getD6(), t.getD7(), t.getD8(), t.getD9()
            );
        }
    }

    public static PatrimoineReferentielDto from(PatrimoineReferentiel ref) {
        return new PatrimoineReferentielDto(
                ref.getSource(),
                ref.getTranches().stream().map(TrancheDto::from).toList()
        );
    }
}
