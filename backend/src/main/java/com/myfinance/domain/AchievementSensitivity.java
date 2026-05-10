package com.myfinance.domain;

public enum AchievementSensitivity {
    /** Seuil patrimoine — validé sur 3 snapshots consécutifs. */
    FORTE,
    /** Snapshot mensuel avec règles d'inclusion. */
    MOYENNE,
    /** Compteur événementiel — validation directe. */
    FAIBLE,
    /** Déclenchement immédiat — pas d'enjeu de triche. */
    NULLE
}
