package com.myfinance.service;

import com.myfinance.config.PublicSectorParameters;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Comparator;

/**
 * Retourne la valeur annuelle du point d'indice de la fonction publique
 * en vigueur à une date donnée.
 *
 * L'historique est chargé depuis {@code tax-parameters.yml} (section {@code fonction-publique.point-indice}).
 * Algorithme : retourner l'entrée dont la {@code effectiveDate} est la plus grande
 * tout en restant ≤ à la date demandée.
 * Si la date est antérieure à toutes les entrées, retourner la plus ancienne valeur.
 */
@Service
@RequiredArgsConstructor
public class PointValueService {

    private final PublicSectorParameters params;

    /**
     * @param date date de référence pour le lookup (ex. startDate du contrat)
     * @return valeur annuelle du point d'indice en vigueur à cette date
     * @throws IllegalStateException si aucune entrée n'est configurée
     */
    public double getAnnualValueAt(LocalDate date) {
        var history = params.getPointIndice().getHistory();
        if (history == null || history.isEmpty()) {
            throw new IllegalStateException("Aucune valeur du point d'indice configurée dans tax-parameters.yml");
        }

        return history.stream()
                .filter(e -> !e.getEffectiveDate().isAfter(date))
                .max(Comparator.comparing(PublicSectorParameters.PointValueEntry::getEffectiveDate))
                .map(PublicSectorParameters.PointValueEntry::getAnnualValue)
                // Si toutes les entrées sont après la date, prendre la plus ancienne
                .orElseGet(() -> history.stream()
                        .min(Comparator.comparing(PublicSectorParameters.PointValueEntry::getEffectiveDate))
                        .map(PublicSectorParameters.PointValueEntry::getAnnualValue)
                        .orElseThrow());
    }

    /**
     * Calcule le traitement brut annuel à partir de l'indice majoré.
     *
     * @param indiceMajore indice majoré
     * @param referenceDate date de référence (en général startDate du contrat ou effectiveDate de la révision)
     * @return traitement brut annuel en €
     */
    public float computeAnnualGross(int indiceMajore, LocalDate referenceDate) {
        return (float) (indiceMajore * getAnnualValueAt(referenceDate));
    }
}
