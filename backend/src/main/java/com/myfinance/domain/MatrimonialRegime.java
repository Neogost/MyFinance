package com.myfinance.domain;

/**
 * Régime matrimonial — pertinent uniquement quand UnionType = MARIAGE.
 * Détermine la répartition du patrimoine commun avant succession.
 */
public enum MatrimonialRegime {
    COMMUNAUTE,    // Communauté légale (par défaut) — 50% au conjoint avant succession
    SEPARATION     // Séparation de biens — pas de retraitement, succession sur la totalité
}
