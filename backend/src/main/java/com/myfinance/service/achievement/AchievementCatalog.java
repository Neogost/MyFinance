package com.myfinance.service.achievement;

import com.myfinance.domain.AchievementCode;
import com.myfinance.domain.AchievementSensitivity;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import static com.myfinance.service.achievement.AchievementLevel.of;
import static com.myfinance.service.achievement.AchievementLevel.unique;

/** Registre de tous les hauts faits disponibles (V1 : 25 badges). */
@Component
public class AchievementCatalog {

    private final List<AchievementDefinition> all;
    private final Map<AchievementCode, AchievementDefinition> byCode;

    public AchievementCatalog() {
        all = buildCatalog();
        byCode = all.stream().collect(Collectors.toMap(AchievementDefinition::code, Function.identity()));
    }

    public List<AchievementDefinition> all() { return all; }
    public AchievementDefinition get(AchievementCode code) { return byCode.get(code); }
    public int totalBadges() { return all.stream().mapToInt(d -> d.levels().size()).sum(); }

    // ── Construction ──────────────────────────────────────────────────────────

    private static List<AchievementDefinition> buildCatalog() {
        return List.of(
            // ── 🟥 Seuils de patrimoine — validation différée (3 snapshots) ────
            def(AchievementCode.TO_THE_MOON, "🚀", "To The Moon",
                "Patrimoine total déclaré",
                AchievementSensitivity.FORTE, false,
                of(1,"Bronze","🥉",50_000), of(2,"Argent","🥈",100_000),
                of(3,"Or","🥇",250_000), of(4,"Platine","💠",500_000), of(5,"Diamant","💎",1_000_000)),

            def(AchievementCode.BARON_BOURSE, "🎩", "Baron de la Bourse",
                "Patrimoine en positions BOURSE",
                AchievementSensitivity.FORTE, false,
                of(1,"Bronze","🥉",1_000), of(2,"Argent","🥈",25_000),
                of(3,"Or","🥇",50_000), of(4,"Platine","💠",100_000), of(5,"Diamant","💎",250_000)),

            def(AchievementCode.CRYPTO_ADDICT, "🌙", "Crypto Addict",
                "Patrimoine en positions CRYPTO",
                AchievementSensitivity.FORTE, false,
                of(1,"Bronze","🥉",1_000), of(2,"Argent","🥈",25_000),
                of(3,"Or","🥇",50_000), of(4,"Platine","💠",100_000), of(5,"Diamant","💎",250_000)),

            def(AchievementCode.MAGNAT_IMMO, "🏛", "Magnat de l'Immobilier",
                "Patrimoine en immobilier physique",
                AchievementSensitivity.FORTE, false,
                of(1,"Bronze","🥉",50_000), of(2,"Argent","🥈",100_000),
                of(3,"Or","🥇",250_000), of(4,"Platine","💠",500_000), of(5,"Diamant","💎",1_000_000)),

            def(AchievementCode.PABLO_ESCOBAR, "💸", "Pablo Escobar",
                "Liquidités disponibles",
                AchievementSensitivity.FORTE, false,
                of(1,"Bronze","🥉",1_000), of(2,"Argent","🥈",5_000),
                of(3,"Or","🥇",10_000), of(4,"Platine","💠",25_000), of(5,"Diamant","💎",50_000)),

            // ── 🟧 Snapshot avec règles ────────────────────────────────────────
            def(AchievementCode.TOUCHE_A_TOUT, "🌐", "Touche-à-tout",
                "Nombre de catégories d'actifs dans le portefeuille (positions ACTIVE ≥ 0,5 % du total)",
                AchievementSensitivity.MOYENNE, false,
                of(1,"Bronze","🥉",3), of(2,"Argent","🥈",4),
                of(3,"Or","🥇",5), of(4,"Diamant","💎",6)),

            def(AchievementCode.GLOBE_TROTTER, "🌍", "Le Globe-Trotter",
                "Exposition à des pays différents dans les instruments BOURSE",
                AchievementSensitivity.MOYENNE, false,
                of(1,"Bronze","🥉",3), of(2,"Or","🥇",5), of(3,"Diamant","💎",10)),

            def(AchievementCode.SCORE_MAXIMAL, "⭐", "Le Score Maximal",
                "Score patrimonial global",
                AchievementSensitivity.MOYENNE, false,
                of(1,"Bronze","🥉",70), of(2,"Argent","🥈",80),
                of(3,"Or","🥇",90), of(4,"Diamant","💎",100)),

            def(AchievementCode.PHENIX, "🐦", "Le Phénix",
                "Patrimoine revenu à son ATH après un drawdown > 20 %",
                AchievementSensitivity.MOYENNE, false,
                unique()),

            def(AchievementCode.DECOLLAGE, "🚀", "Le Décollage",
                "Patrimoine multiplié depuis l'inscription",
                AchievementSensitivity.MOYENNE, false,
                of(1,"Bronze","🥉",2), of(2,"Or","🥇",5), of(3,"Diamant","💎",10)),

            // ── 🟨 Compteurs événementiels ─────────────────────────────────────
            def(AchievementCode.VOIE_RICHESSE, "💵", "La Voie de la Richesse",
                "Revenu mensuel net estimé (salaire + revenus complémentaires)",
                AchievementSensitivity.FAIBLE, false,
                of(1,"Bronze","🥉",1_000), of(2,"Argent","🥈",2_000),
                of(3,"Or","🥇",3_000), of(4,"Platine","💠",5_000), of(5,"Diamant","💎",10_000)),

            def(AchievementCode.GRAND_STRATEGE, "🎯", "Le Grand Stratège",
                "Utilisations cumulées des simulateurs",
                AchievementSensitivity.FAIBLE, false,
                of(1,"Bronze","🥉",50), of(2,"Or","🥇",100), of(3,"Diamant","💎",250)),

            def(AchievementCode.PHOTOGRAPHE, "📸", "Le Photographe",
                "Relevés de patrimoine créés",
                AchievementSensitivity.FAIBLE, false,
                of(1,"Bronze","🥉",1), of(2,"Argent","🥈",6),
                of(3,"Or","🥇",24), of(4,"Diamant","💎",60)),

            def(AchievementCode.QUOTIDIEN, "📅", "Le Quotidien",
                "Jours de connexion consécutifs",
                AchievementSensitivity.FAIBLE, false,
                of(1,"Bronze","🥉",7), of(2,"Argent","🥈",30),
                of(3,"Or","🥇",100), of(4,"Diamant","💎",365)),

            def(AchievementCode.COMPTABLE_METICULEUX, "📜", "Le Comptable Méticuleux",
                "Mois consécutifs avec un bulletin de paie saisi",
                AchievementSensitivity.FAIBLE, false,
                of(1,"Bronze","🥉",12), of(2,"Or","🥇",24), of(3,"Diamant","💎",36)),

            def(AchievementCode.DCA_MASTER, "🔁", "Le DCA-Master",
                "Mois consécutifs avec au moins un achat BOURSE ou CRYPTO",
                AchievementSensitivity.FAIBLE, false,
                of(1,"Bronze","🥉",3), of(2,"Argent","🥈",6),
                of(3,"Or","🥇",12), of(4,"Diamant","💎",24)),

            def(AchievementCode.ARCHITECTE, "🏗", "L'Architecte",
                "Simulations d'emprunt sauvegardées",
                AchievementSensitivity.FAIBLE, false,
                of(1,"Bronze","🥉",1), of(2,"Or","🥇",5), of(3,"Diamant","💎",10)),

            def(AchievementCode.HABITUE, "📆", "L'Habitué",
                "Ancienneté du compte (années)",
                AchievementSensitivity.FAIBLE, false,
                of(1,"Bronze","🥉",1), of(2,"Argent","🥈",3),
                of(3,"Or","🥇",5), of(4,"Diamant","💎",10)),

            def(AchievementCode.SURVIVALISTE, "💥", "Survivaliste",
                "Utilisations du simulateur de crise",
                AchievementSensitivity.FAIBLE, false,
                of(1,"Bronze","🥉",1), of(2,"Or","🥇",10), of(3,"Diamant","💎",50)),

            // ── 🟩 Déclenchement immédiat ──────────────────────────────────────
            def(AchievementCode.PIONNIER, "🌟", "Le Pionnier",
                "Première position créée",
                AchievementSensitivity.NULLE, false,
                unique()),

            def(AchievementCode.PERSONNALISTE, "🎨", "Le Personnaliste",
                "Premier objectif patrimonial défini",
                AchievementSensitivity.NULLE, false,
                unique()),

            def(AchievementCode.PROFIL_PARFAIT, "👤", "Profil Parfait",
                "Tous les champs du profil renseignés (personnel, fiscal, matelas)",
                AchievementSensitivity.NULLE, false,
                unique()),

            def(AchievementCode.FUNAMBULE, "🎢", "Le Funambule",
                "Simulateur de crédit Lombard utilisé",
                AchievementSensitivity.NULLE, false,
                unique()),

            // ── 🟩 Easter eggs secrets ─────────────────────────────────────────
            def(AchievementCode.THE_ANSWER, "🌌", "The Answer",
                "Patrimoine à exactement 42 000 € (± 100 €)",
                AchievementSensitivity.NULLE, true,
                unique()),

            def(AchievementCode.VAMPIRE, "🌃", "Le Vampire",
                "Mode nuit activé",
                AchievementSensitivity.NULLE, true,
                unique())
        );
    }

    private static AchievementDefinition def(AchievementCode code, String emoji, String name,
                                              String description, AchievementSensitivity sensitivity,
                                              boolean secret, AchievementLevel... levels) {
        return new AchievementDefinition(code, emoji, name, description, sensitivity, secret, List.of(levels));
    }
}
