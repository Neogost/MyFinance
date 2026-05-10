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

    // ── V2 Trivial — réutilisent des patterns existants ───────────────────────
    THE_FIRST_MILLION,
    PIERRE_PAPIER,
    LA_FOURMI,
    PAS_TOUS_MEME_PANIER,
    LE_COSMOPOLITE,
    LE_PREVOYANT,
    LE_ROYAL_FLUSH,
    MULTI_SOURCES,
    MULTI_PROPRIETAIRE,
    PREMIER_TOIT,
    LE_DIVERSIFICATEUR,
    PREMIER_REMBOURSEMENT,
    LIBERTE_CONQUISE,
    LORD_DU_MANOIR,
    LE_COLLECTIONNEUR,
    LE_CHASSEUR,
    L_ENCYCLOPEDISTE,

    // ── V2 Faible — évaluateurs simples ─────────────────────────────────────
    FORTERESSE_SECURITE,
    LE_DESENDET,
    LE_BOUCLIER,
    AV_VETERAN,
    L_ACCOMPLISSEUR,
    LE_RETOUR,
    LE_FIDELE,
    COMEBACK_KID,
    SORTIE_DU_ROUGE,
    LEVIER_MAITRISE,
    L_INTER_SECTORIEL,

    // ── V2 Moyen — agrégation + calcul ───────────────────────────────────────
    LE_RENTIER,
    LEAN_FIRE,
    FAT_FIRE,
    FREE_AT_LAST,
    FIRE_STARTER,
    PATRIOTE_PEA,
    LE_VETERAN,
    L_ANNALISTE,
}
