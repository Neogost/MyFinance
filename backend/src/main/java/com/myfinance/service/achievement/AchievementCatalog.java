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
                unique()),

            // ── V2 Plus lourd ────────────────────────────────────────────────
            def(AchievementCode.BULL_RUN, "🐂", "Bull Run",
                "Performance YTD du portefeuille BOURSE",
                AchievementSensitivity.FAIBLE, false,
                of(1,"Bronze","🥉",10), of(2,"Or","🥇",25), of(3,"Diamant","💎",50)),

            def(AchievementCode.DIAMOND_HANDS, "💎", "Diamond Hands",
                "Position BOURSE ou CRYPTO détenue sans interruption depuis N ans",
                AchievementSensitivity.FAIBLE, false,
                of(1,"Bronze","🥉",1), of(2,"Or","🥇",3), of(3,"Diamant","💎",5)),

            def(AchievementCode.LE_SANG_FROID, "❄", "Le Sang-Froid",
                "Aucune vente lors d'un repli mensuel > 10 % du portefeuille investissable",
                AchievementSensitivity.FAIBLE, false,
                unique()),

            def(AchievementCode.LE_REBALANCER, "🎯", "Le Rebalancer",
                "Vente dans une catégorie et achat dans une autre dans la même semaine",
                AchievementSensitivity.FAIBLE, false,
                unique()),

            def(AchievementCode.L_ASCENSION, "📊", "L'Ascension",
                "Décile de patrimoine INSEE dans sa tranche d'âge",
                AchievementSensitivity.FAIBLE, false,
                of(1,"Bronze","🥉",5), of(2,"Argent","🥈",7),
                of(3,"Or","🥇",8), of(4,"Platine","💠",9)),

            def(AchievementCode.LE_DISCIPLE, "💪", "Le Disciple",
                "Taux d'épargne moyen sur les 12 derniers mois (croissance patrimoine / salaire)",
                AchievementSensitivity.FAIBLE, false,
                of(1,"Bronze","🥉",30), of(2,"Or","🥇",50), of(3,"Diamant","💎",70)),

            // ── V2 Trivial ────────────────────────────────────────────────────
            def(AchievementCode.THE_FIRST_MILLION, "🏆", "The First Million",
                "Patrimoine total ≥ 1 million €",
                AchievementSensitivity.FORTE, false,
                unique()),

            def(AchievementCode.PIERRE_PAPIER, "📃", "Le Pierre-Papier",
                "Patrimoine en immobilier papier (SCPI, OPCI…)",
                AchievementSensitivity.FORTE, false,
                of(1,"Bronze","🥉",1_000), of(2,"Argent","🥈",10_000),
                of(3,"Or","🥇",50_000), of(4,"Platine","💠",100_000), of(5,"Diamant","💎",250_000)),

            def(AchievementCode.LA_FOURMI, "🐜", "La Fourmi",
                "Épargne sur livrets",
                AchievementSensitivity.FORTE, false,
                of(1,"Bronze","🥉",1_000), of(2,"Argent","🥈",5_000),
                of(3,"Or","🥇",15_000), of(4,"Platine","💠",30_000), of(5,"Diamant","💎",60_000)),

            def(AchievementCode.PAS_TOUS_MEME_PANIER, "🥚", "Pas tous dans le même panier",
                "Aucune catégorie d'actif ne dépasse 50 % du patrimoine",
                AchievementSensitivity.MOYENNE, false,
                unique()),

            def(AchievementCode.LE_COSMOPOLITE, "💱", "Le Cosmopolite",
                "Positions dans des instruments libellés en plusieurs devises",
                AchievementSensitivity.MOYENNE, false,
                of(1,"Bronze","🥉",2), of(2,"Or","🥇",3), of(3,"Diamant","💎",5)),

            def(AchievementCode.LE_PREVOYANT, "🧓", "Le Prévoyant",
                "Avoir un Plan d'Épargne Retraite (PER) actif",
                AchievementSensitivity.NULLE, false,
                unique()),

            def(AchievementCode.LE_ROYAL_FLUSH, "🎰", "Le Royal Flush",
                "Au moins une position active dans chaque enveloppe fiscale : PEA + AV + PER + CTO",
                AchievementSensitivity.NULLE, false,
                unique()),

            def(AchievementCode.MULTI_SOURCES, "🎁", "Multi-sources",
                "Au moins 3 types de revenus complémentaires différents",
                AchievementSensitivity.FAIBLE, false,
                unique()),

            def(AchievementCode.MULTI_PROPRIETAIRE, "🏘", "Multi-propriétaire",
                "Nombre de biens immobiliers physiques",
                AchievementSensitivity.MOYENNE, false,
                of(1,"Bronze","🥉",2), of(2,"Or","🥇",3), of(3,"Diamant","💎",5)),

            def(AchievementCode.PREMIER_TOIT, "🔑", "Premier Toit",
                "Premier bien immobilier physique ajouté",
                AchievementSensitivity.NULLE, false,
                unique()),

            def(AchievementCode.LE_DIVERSIFICATEUR, "🌈", "Le Diversificateur",
                "Nombre de cryptos différentes dans le portefeuille",
                AchievementSensitivity.MOYENNE, false,
                of(1,"Bronze","🥉",5), of(2,"Or","🥇",10), of(3,"Diamant","💎",20)),

            def(AchievementCode.PREMIER_REMBOURSEMENT, "🔥", "Premier Remboursement",
                "Première dette entièrement remboursée",
                AchievementSensitivity.NULLE, false,
                unique()),

            def(AchievementCode.LIBERTE_CONQUISE, "🆓", "Liberté Conquise",
                "Aucune dette active — patrimoine entièrement libre",
                AchievementSensitivity.NULLE, false,
                unique()),

            def(AchievementCode.LORD_DU_MANOIR, "🏠", "Le Lord du Manoir",
                "Un bien immobilier physique financé par un crédit immobilier",
                AchievementSensitivity.NULLE, false,
                unique()),

            def(AchievementCode.LE_COLLECTIONNEUR, "🎖", "Le Collectionneur",
                "Niveaux de hauts faits débloqués",
                AchievementSensitivity.FAIBLE, false,
                of(1,"Bronze","🥉",10), of(2,"Argent","🥈",25), of(3,"Diamant","💎",50)),

            def(AchievementCode.LE_CHASSEUR, "🔍", "Le Chasseur",
                "Hauts faits secrets découverts",
                AchievementSensitivity.NULLE, true,
                unique()),

            def(AchievementCode.L_ENCYCLOPEDISTE, "📚", "L'Encyclopédiste",
                "Badges distincts débloqués dans différentes catégories",
                AchievementSensitivity.FAIBLE, false,
                of(1,"Bronze","🥉",5), of(2,"Argent","🥈",10), of(3,"Diamant","💎",15)),

            // ── V2 Faible ─────────────────────────────────────────────────────
            def(AchievementCode.FORTERESSE_SECURITE, "🛡", "Forteresse de Sécurité",
                "Matelas de sécurité 100 % atteint",
                AchievementSensitivity.FAIBLE, false,
                unique()),

            def(AchievementCode.LE_DESENDET, "🚫", "Le Désendetté",
                "Ratio dette / patrimoine",
                AchievementSensitivity.FAIBLE, false,
                of(1,"Bronze","🥉",70), // threshold stocké en % inversé : 100-30=70
                of(2,"Argent","🥈",85), // 100-15=85
                of(3,"Or","🥇",95),     // 100-5=95
                of(4,"Diamant","💎",100)), // 0% dette

            def(AchievementCode.LE_BOUCLIER, "⛅", "Le Bouclier",
                "Liquidités couvrant N mois de dépenses récurrentes",
                AchievementSensitivity.FAIBLE, false,
                of(1,"Bronze","🥉",6), of(2,"Argent","🥈",12),
                of(3,"Or","🥇",24), of(4,"Diamant","💎",36)),

            def(AchievementCode.AV_VETERAN, "⏳", "AV Vétéran",
                "Assurance-vie ouverte depuis ≥ 8 ans (abattement fiscal actif)",
                AchievementSensitivity.FAIBLE, false,
                unique()),

            def(AchievementCode.L_ACCOMPLISSEUR, "🎯", "L'Accomplisseur",
                "Premier objectif patrimonial atteint",
                AchievementSensitivity.FAIBLE, false,
                unique()),

            def(AchievementCode.LE_RETOUR, "👋", "Le Retour",
                "Reconnexion après ≥ 30 jours d'absence",
                AchievementSensitivity.NULLE, false,
                unique()),

            def(AchievementCode.LE_FIDELE, "📮", "Le Fidèle",
                "Au moins une connexion par mois pendant 12 mois consécutifs",
                AchievementSensitivity.FAIBLE, false,
                unique()),

            def(AchievementCode.COMEBACK_KID, "🎢", "Comeback Kid",
                "Patrimoine revenu à son ATH après un drawdown > 15 %",
                AchievementSensitivity.FAIBLE, false,
                unique()),

            def(AchievementCode.SORTIE_DU_ROUGE, "➕", "Sortie du Rouge",
                "Patrimoine passé de moins de 1 000 € à plus de 10 000 €",
                AchievementSensitivity.FAIBLE, false,
                unique()),

            def(AchievementCode.LEVIER_MAITRISE, "⚖", "Le Levier Maîtrisé",
                "Bien immobilier avec un ratio crédit / valeur entre 30 % et 70 %",
                AchievementSensitivity.FAIBLE, false,
                unique()),

            def(AchievementCode.L_INTER_SECTORIEL, "🏭", "L'Inter-Sectoriel",
                "Exposition à des secteurs différents dans les instruments BOURSE",
                AchievementSensitivity.FAIBLE, false,
                of(1,"Bronze","🥉",3), of(2,"Or","🥇",5), of(3,"Diamant","💎",8)),

            // ── V2 Moyen ──────────────────────────────────────────────────────
            def(AchievementCode.LE_RENTIER, "🏖", "Le Rentier",
                "Revenus passifs (locatif + dividendes) en % du salaire mensuel net",
                AchievementSensitivity.FAIBLE, false,
                of(1,"Bronze","🥉",25), of(2,"Argent","🥈",50),
                of(3,"Or","🥇",75), of(4,"Diamant","💎",100)),

            def(AchievementCode.LEAN_FIRE, "🥗", "Lean FIRE",
                "Patrimoine ≥ 12 × dépenses annuelles",
                AchievementSensitivity.MOYENNE, false,
                unique()),

            def(AchievementCode.FAT_FIRE, "💎", "Fat FIRE",
                "Patrimoine ≥ 25 × dépenses annuelles (objectif FIRE officiel)",
                AchievementSensitivity.MOYENNE, false,
                unique()),

            def(AchievementCode.FREE_AT_LAST, "🏝", "Free at Last",
                "Revenus passifs ≥ dépenses récurrentes mensuelles",
                AchievementSensitivity.FAIBLE, false,
                unique()),

            def(AchievementCode.FIRE_STARTER, "🔥", "FIRE Starter",
                "Pourcentage de l'objectif FIRE atteint (25 × dépenses annuelles)",
                AchievementSensitivity.MOYENNE, false,
                of(1,"Bronze","🥉",1), of(2,"Argent","🥈",5),
                of(3,"Or","🥇",10), of(4,"Platine","💠",25), of(5,"Diamant","💎",50)),

            def(AchievementCode.PATRIOTE_PEA, "🇫🇷", "Patriote du PEA",
                "Capital net investi dans le PEA",
                AchievementSensitivity.MOYENNE, false,
                of(1,"Bronze","🥉",25_000), of(2,"Argent","🥈",75_000),
                of(3,"Diamant","💎",150_000)),

            def(AchievementCode.LE_VETERAN, "🦉", "Le Vétéran",
                "Position détenue sans interruption depuis ≥ 10 ans",
                AchievementSensitivity.FAIBLE, false,
                unique()),

            def(AchievementCode.L_ANNALISTE, "📚", "L'Annaliste",
                "Au moins un relevé de patrimoine par année calendaire",
                AchievementSensitivity.FAIBLE, false,
                of(1,"Or","🥇",5), of(2,"Diamant","💎",10))
        );
    }

    private static AchievementDefinition def(AchievementCode code, String emoji, String name,
                                              String description, AchievementSensitivity sensitivity,
                                              boolean secret, AchievementLevel... levels) {
        return new AchievementDefinition(code, emoji, name, description, sensitivity, secret, List.of(levels));
    }
}
