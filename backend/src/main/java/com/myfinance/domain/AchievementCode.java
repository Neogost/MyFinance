package com.myfinance.domain;

/** Identifiant unique de chaque haut fait. Utilisé comme clé en base. */
public enum AchievementCode {
    // ── 🟥 Patrimoine (validation différée — 3 snapshots consécutifs) ─────────
    TO_THE_MOON,
    BARON_BOURSE,
    CRYPTO_ADDICT,
    MAGNAT_IMMO,
    PABLO_ESCOBAR,

    // ── 🟧 Snapshot avec règles ───────────────────────────────────────────────
    TOUCHE_A_TOUT,
    GLOBE_TROTTER,
    SCORE_MAXIMAL,
    PHENIX,
    DECOLLAGE,

    // ── 🟨 Compteurs événementiels ────────────────────────────────────────────
    VOIE_RICHESSE,
    GRAND_STRATEGE,
    PHOTOGRAPHE,
    QUOTIDIEN,
    COMPTABLE_METICULEUX,
    DCA_MASTER,
    ARCHITECTE,
    HABITUE,
    SURVIVALISTE,

    // ── 🟩 Déclenchement immédiat ─────────────────────────────────────────────
    PIONNIER,
    PERSONNALISTE,
    PROFIL_PARFAIT,
    FUNAMBULE,

    // ── 🟩 Easter eggs secrets ────────────────────────────────────────────────
    THE_ANSWER,
    VAMPIRE,
}
