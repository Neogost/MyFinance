package com.myfinance.dto;

import com.myfinance.config.BaremeKilometriqueProperties;

import java.util.List;

public record BaremeKilometriqueDto(
        int annee,
        String avertissement,
        double multiplicateurElectrique,
        List<VoitureDto> voitures
) {
    public record VoitureDto(int cvMax, String label, List<TrancheDto> tranches) {}
    public record TrancheDto(Integer kmMax, double taux, double forfait) {}

    public static BaremeKilometriqueDto from(BaremeKilometriqueProperties props) {
        List<VoitureDto> voitures = props.getVoitures().stream()
                .map(v -> new VoitureDto(
                        v.getCvMax(),
                        v.getLabel(),
                        v.getTranches().stream()
                                .map(t -> new TrancheDto(t.getKmMax(), t.getTaux(), t.getForfait()))
                                .toList()
                ))
                .toList();
        return new BaremeKilometriqueDto(
                props.getAnnee(),
                props.getAvertissement(),
                props.getMultiplicateurElectrique(),
                voitures
        );
    }
}
