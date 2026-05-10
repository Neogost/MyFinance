# 🏆 Achievements / Hauts faits — gamification du patrimoine

> **Statut : ✅ V1 spécifiée — prête pour implémentation**
> Le périmètre MVP (25 badges) est figé ci-dessous. Le catalogue complet (119 badges) reste un backlog pour les versions ultérieures.

---

## Vision

Ajouter une couche ludique à MyFinance pour transformer le suivi patrimonial en parcours valorisant. Chaque jalon — patrimonial, comportemental ou exploratoire — débloque un **haut fait** avec un nom mémorable, une icône, et un palier de difficulté.

**Objectifs :**
- **Renforcer la motivation long-terme** : voir un palier proche pousse à l'action (épargne, diversification, régularité).
- **Récompenser la complétude** : remplir son profil, saisir des bulletins, créer des snapshots — autant d'actions invisibles qui méritent reconnaissance.
- **Rendre la découverte sympa** : encourager l'exploration des outils peu utilisés (simulateur de crise, comparateur d'enveloppes, Lombard…).
- **Stimuler la fidélisation** : revenir périodiquement pour voir progresser des barres et débloquer des nouveaux badges.

**Principes :**
- 🚫 **Pas de jugement de valeur**. Pas de badge "punissant" l'inaction. On valorise l'avancée.
- 🎭 **Ton décomplexé**. Mélange entre sérieux financier et clins d'œil culturels (cf. exemples : « Pablo Escobar », « To The Moon »).
- 🔓 **Découverte progressive**. Certains badges sont visibles avec barre de progression, d'autres restent secrets jusqu'au déclenchement.
- 💎 **Paliers multiples**. La majorité des hauts faits ont 3 à 6 niveaux pour conserver de l'élan tout au long du parcours.

---

## 🎯 V1 — MVP (25 badges)

Sélection conçue pour **couvrir l'intégralité des mécaniques** à implémenter (détection, validation, stockage, UI, rareté). Une fois ces 25 badges en production, ajouter les 94 autres ne demandera que de la donnée déclarative.

### Mécaniques couvertes par la sélection

| Mécanique | Badges qui la testent |
|---|---|
| 🟥 **Validation différée par snapshot** (3 mois consécutifs au-dessus du seuil) | #1 To The Moon · #2 Baron de la Bourse · #3 Crypto Addict · #4 Magnat de l'Immobilier · #5 Pablo Escobar |
| 🟧 **Snapshot avec règle d'inclusion** (poids minimum) | #6 Touche-à-tout · #7 Le Globe-Trotter |
| 🟧 **Calcul dérivé sur snapshot** | #8 Le Score Maximal |
| 🟨 **Compteur événementiel** (création) | #9 La Voie de la Richesse · #11 Le Photographe · #13 Le Comptable Méticuleux · #15 L'Architecte |
| 🟨 **Compteur événementiel d'usage outil** | #10 Le Grand Stratège · #20 Survivaliste · #21 Le Funambule |
| 🟨 **Streak temporel** (consécutifs) | #12 Le Quotidien · #14 Le DCA-Master |
| 🟨 **Anciennté du compte** | #16 L'Habitué |
| 🟩 **Déclencheur immédiat** (action utilisateur) | #17 Le Pionnier · #18 Le Personnaliste · #19 Profil Parfait |
| 🟩 **Easter egg secret** | #22 The Answer · #23 Le Vampire |
| **Calcul ATH historique** | #24 Le Phénix · #25 Le Décollage |

### Liste des 25 badges retenus

Code = identifiant Java (enum `AchievementCode`). Niveaux = Bronze 🥉 · Argent 🥈 · Or 🥇 · Platine 💠 · Diamant 💎.

| # | Code | Badge | Catégorie | Sensibilité | Paliers (valeurs) | Trigger |
|---|---|---|---|---|---|---|
| 1 | `TO_THE_MOON` | 🚀 To The Moon | Patrimoine global | 🟥 | 50 K · 100 K · 250 K · 500 K · 1 M | Snapshot mensuel |
| 2 | `BARON_BOURSE` | 🎩 Baron de la Bourse | Bourse | 🟥 | 1 K · 25 K · 50 K · 100 K · 250 K | Snapshot mensuel |
| 3 | `CRYPTO_ADDICT` | 🌙 Crypto Addict | Crypto | 🟥 | 1 K · 25 K · 50 K · 100 K · 250 K | Snapshot mensuel |
| 4 | `MAGNAT_IMMO` | 🏛 Magnat de l'Immobilier | Immobilier | 🟥 | 50 K · 100 K · 250 K · 500 K · 1 M | Snapshot mensuel |
| 5 | `PABLO_ESCOBAR` | 💸 Pablo Escobar | Liquidités | 🟥 | 1 K · 5 K · 10 K · 25 K · 50 K | Snapshot mensuel |
| 6 | `TOUCHE_A_TOUT` | 🌐 Touche-à-tout | Diversification | 🟧 | 3 · 4 · 5 · 6 catégories *(poids ≥ 0,5 %)* | Snapshot mensuel |
| 7 | `GLOBE_TROTTER` | 🌐 Le Globe-Trotter | Géographie | 🟧 | 3 · 5 · 10 pays *(poids ≥ 1 %)* | Snapshot mensuel |
| 8 | `SCORE_MAXIMAL` | ⭐ Le Score Maximal | Ratios | 🟧 | ≥ 70 · ≥ 80 · ≥ 90 · 100 | Snapshot mensuel |
| 9 | `VOIE_RICHESSE` | 💵 La Voie de la Richesse | Revenus | 🟨 | 1 K · 2 K · 3 K · 5 K · 10 K mensuel | Création/maj salaire/revenu |
| 10 | `GRAND_STRATEGE` | 🎯 Le Grand Stratège | Outils | 🟨 | 50 · 100 · 250 simulations | Usage simulateurs |
| 11 | `PHOTOGRAPHE` | 📸 Le Photographe | Régularité | 🟨 | 1 · 6 · 24 · 60 snapshots | Création snapshot |
| 12 | `QUOTIDIEN` | 📅 Le Quotidien | Engagement | 🟨 | 7 · 30 · 100 · 365 jours consécutifs | Login (job nuit) |
| 13 | `COMPTABLE_METICULEUX` | 📜 Le Comptable Méticuleux | Régularité | 🟨 | 12 · 24 · 36 bulletins consécutifs | Création bulletin |
| 14 | `DCA_MASTER` | 🔁 Le DCA-Master | Régularité | 🟨 | 3 · 6 · 12 · 24 mois avec ≥ 1 achat BOURSE/CRYPTO | Création ordre |
| 15 | `ARCHITECTE` | 🏗 L'Architecte | Outils | 🟨 | 1 · 5 · 10 simulations d'emprunt sauvegardées | Sauvegarde simulation |
| 16 | `HABITUE` | 📆 L'Habitué | Anciennté | 🟨 | 1 · 3 · 5 · 10 ans depuis création | Job nuit |
| 17 | `PIONNIER` | 🌟 Le Pionnier | Profil | 🟩 | unique | Création compte |
| 18 | `PERSONNALISTE` | 🎨 Le Personnaliste | Stratégie | 🟩 | unique | Premier objectif défini |
| 19 | `PROFIL_PARFAIT` | 👤 Profil Parfait | Profil | 🟩 | unique | Tous champs renseignés |
| 20 | `SURVIVALISTE` | 💥 Survivaliste | Outils | 🟨 | 1 · 10 · 50 utilisations | Sim. crise lancée |
| 21 | `FUNAMBULE` | 🎢 Le Funambule | Outils | 🟩 | unique | Sim. Lombard utilisée |
| 22 | `THE_ANSWER` | 🌌 The Answer | Easter egg | 🟩 | secret unique *(42 K€ ±100 €)* | Snapshot mensuel |
| 23 | `VAMPIRE` | 🌃 Le Vampire | Easter egg | 🟩 | secret unique | Toggle dark mode |
| 24 | `PHENIX` | 🐦 Le Phénix | Performance | 🟧 | unique *(retour à ATH après −20 %)* | Snapshot mensuel |
| 25 | `DECOLLAGE` | 🚀 Le Décollage | Progression | 🟧 | × 2 · × 5 · × 10 du patrimoine initial | Snapshot mensuel |

**Total : ~80 niveaux à instrumenter sur 25 badges.**

### Données dépendantes à instrumenter pour le MVP

- ✅ Existantes : `PortfolioSnapshot`, `LoginEvent`, `PositionOrder.orderDate`, `User.createdAt`, allocations sectorielles/géographiques.
- 🆕 À ajouter :
  - **ATH du patrimoine** par utilisateur (champ `User.allTimeHighEur` mis à jour à chaque snapshot, pour Phénix et Décollage).
  - **Patrimoine initial** au moment de l'inscription (champ `User.initialNetWorthEur` figé au 1er snapshot post-inscription, pour Décollage).
  - **Compteur d'usage des outils** (incrémenté à chaque appel via Analytics → table dédiée ou agrégat sur `analytics_events`).

---

## Catalogue proposé (V2 et au-delà)

### 🌍 Patrimoine global

| Badge | Description | Paliers |
|---|---|---|
| **🚀 To The Moon** | Patrimoine total déclaré | 25 K · 50 K · 100 K · 250 K · 500 K · **1 M** |
| **🏆 The First Million** | Premier million franchi | 1 M (palier unique, badge or massif) |
| **🦁 Multi-millionnaire** | Patrimoine au-delà du million | 2 M · 5 M · 10 M |
| **📊 Top 10 % INSEE** | Patrimoine dans le décile 1 INSEE de la tranche d'âge | unique (recalculé périodiquement) |

### 📊 Performance & marché

| Badge | Description | Paliers |
|---|---|---|
| **🌙 L'Investisseur ne dort jamais** | Performance globale positive sur N mois consécutifs | 6 · 12 · 24 |
| **🛡 Le Survivant** | Patrimoine maintenu malgré un drawdown global > 20 % | unique |
| **🧘 Le Patient** | Aucune vente pendant un crash > 30 % | unique |
| **🐂 Buffett-Mode** | Performance YoY > benchmark (CAC40 / S&P500) | 1 an · 3 ans · 5 ans |
| **🚀 Le Doubleur** | Patrimoine doublé en N années | 5 · 3 · 1 |
| **💯 Le Centenaire** | Plus-values latentes globales > 100 K€ | unique |
| **🐦 Le Phénix** | Patrimoine revenu à son ATH après un drawdown > 20 % | unique |

### 📈 Bourse

| Badge | Description | Paliers |
|---|---|---|
| **🎩 Baron de la Bourse** | Patrimoine BOURSE | 1 K · 25 K · 50 K · 100 K · 250 K |
| **🐂 Bull Run** | Plus-value latente sur BOURSE | +10 % · +25 % · +50 % YTD |
| **💼 Le Trader Aguerri** | Nombre d'ordres BOURSE | 10 · 50 · 100 · 250 |
| **🇫🇷 Patriote du PEA** | Capital investi en PEA | 25 K · 75 K · 150 K *(plafond)* |
| **🇪🇺 Le Plafondeur PEA-PME** | Plafond PEA-PME atteint | 75 K |

### 🪙 Crypto

| Badge | Description | Paliers |
|---|---|---|
| **🌙 Crypto Addict** | Patrimoine CRYPTO | 1 K · 25 K · 50 K · 100 K · 250 K |
| **💎 Diamond Hands** | Position crypto détenue ininterrompue | 1 an · 3 ans · 5 ans |
| **₿ Bitcoin Maximaliste** | Part du BTC dans le portefeuille crypto > 50 % | unique |
| **🌈 Le Diversificateur** | Posséder ≥ 5 / 10 / 20 cryptos différentes | 3 paliers |
| **🦏 Whale Wannabe** | Patrimoine crypto > 100 K | unique |

### 🏠 Immobilier

| Badge | Description | Paliers |
|---|---|---|
| **🏛 Magnat de l'Immobilier** | Patrimoine en IMMO_PHYSIQUE | 50 K · 100 K · 250 K · 500 K · 1 M |
| **📃 Le Pierre-Papier** | Patrimoine en IMMO_PAPIER (SCPI/OPCI) | 1 K · 10 K · 50 K · 100 K |
| **🔑 Premier Toit** | Première résidence saisie | unique |
| **🏘 Multi-propriétaire** | ≥ 2 / 3 / 5 biens immobiliers | 3 paliers |
| **🏦 Le Levier** | Bien financé par crédit avec LTV > 70 % | unique |

### 💰 Liquidités & épargne sécurisée

| Badge | Description | Paliers |
|---|---|---|
| **💸 Pablo Escobar** | Liquidités disponibles | 1 K · 5 K · 10 K · 25 K · 50 K |
| **🐜 La Fourmi** | Épargne sur livrets | 5 K · 15 K · 30 K · 60 K *(plafond combiné)* |
| **🛡 Forteresse de Sécurité** | Matelas de sécurité 100 % atteint | unique |
| **⛅ Pluie d'Avril** | Matelas de sécurité atteint depuis ≥ 12 mois | unique |

### 🎯 Diversification & équilibre

| Badge | Description | Paliers |
|---|---|---|
| **🥚 Pas Tous dans le Même Panier** | Aucune catégorie > 50 % du patrimoine | unique (re-évalué) |
| **🌐 Touche-à-tout** | Au moins 1 position dans 3 / 4 / 5 / **6** catégories | 4 paliers |
| **🎻 L'Équilibriste** | Toutes catégories entre 10 % et 35 % | unique |
| **📐 Stratège Aligné** | Réel à ±5 % des objectifs sur toutes catégories | unique |

### 🗺 Couverture géographique & sectorielle

Exploite les `breakdowns` déjà gérés côté Stratégie & Objectifs.

| Badge | Description | Paliers |
|---|---|---|
| **🌐 Le Globe-Trotter** | Exposition à ≥ N pays différents (poids ≥ 1 %) | 3 · 5 · 10 |
| **🏭 L'Inter-Sectoriel** | Exposition à ≥ N secteurs différents | 3 · 5 · 8 |
| **💱 Le Cosmopolite** | Patrimoine en ≥ 3 devises différentes | unique |
| **🎯 L'Architecte Précis** | Réel à ±5 pts de la cible sur **toutes** les dimensions (sector + country + currency + subtype) | unique |

### 🎓 Enveloppes fiscales

| Badge | Description | Paliers |
|---|---|---|
| **⏳ AV Vétéran** | Assurance-vie ouverte depuis ≥ 8 ans (abattement) | unique |
| **🧓 Le Prévoyant** | PER actif avec versements annuels enregistrés | unique |
| **🎰 Le Royal Flush** | 1 position active dans **chaque** enveloppe (PEA + AV + PER + CTO) | unique |
| **🧮 Optimiseur Fiscal** | Profil fiscal complet (parts, abattement, frais réels) | unique |

### 💼 Revenus

| Badge | Description | Paliers |
|---|---|---|
| **💵 La Voie de la Richesse** | Revenu mensuel net (toutes sources) | 1 K · 2 K · 3 K · 5 K · 10 K |
| **🏖 Le Rentier** | Revenus passifs ≥ 25 % / 50 % / 100 % du salaire | 3 paliers |
| **🎁 Multi-sources** | Au moins 3 types de revenus complémentaires actifs | unique |
| **📜 Le Comptable Méticuleux** | 12 / 24 / 36 bulletins de paie consécutifs | 3 paliers |

### 📊 Régularité & habitudes

| Badge | Description | Paliers |
|---|---|---|
| **🔁 Le DCA-Master** | Achat BOURSE ou CRYPTO chaque mois pendant N mois | 3 · 6 · 12 · 24 |
| **📅 Le Quotidien** | Connexion à l'app pendant N jours consécutifs | 7 · 30 · 100 · 365 |
| **📸 Le Photographe** | Snapshots manuels créés | 1 · 6 · 24 · 60 |
| **🥁 Le Métronome** | Saisie d'un bulletin de paie chaque mois pendant N mois | 6 · 12 · 24 |

### 🧘 Sagesse financière

Récompenses pour les choix vertueux peu visibles.

| Badge | Description | Paliers |
|---|---|---|
| **❄ Le Sang-Froid** | Aucune vente lors d'une baisse hebdo globale > 10 % | unique |
| **🔁 Le DCA Pur** | Uniquement des achats programmés (jamais de vente) sur N mois | 12 · 24 |
| **💪 Le Disciple** | Taux d'épargne maintenu sur 12 mois | > 30 % · > 50 % · > 70 % |
| **🎯 Le Rebalancer** | Rééquilibrage manuel détecté (vente cat. surpondérée → achat cat. sous-pondérée) | unique |

### 🧠 Outils & exploration

| Badge | Description | Paliers |
|---|---|---|
| **🎯 Le Grand Stratège** | Utilisations cumulées des simulateurs | 50 · 100 · 250 |
| **💥 Survivaliste** | Simulateur de crise utilisé | 1 · 10 · 50 |
| **🏗 L'Architecte** | Simulations d'emprunt sauvegardées | 1 · 5 · 10 |
| **🔮 Le Visionnaire** | Comparateur d'enveloppes fiscales utilisé | unique |
| **🎢 Le Funambule** | Simulateur Lombard utilisé | unique |
| **🪙 L'Apprenti Compositeur** | Simulateur d'intérêts composés utilisé | unique |
| **👴 Le Sage de la Retraite** | Simulateur retraite utilisé avec profil complet | unique |
| **🗺 L'Explorateur** | Visité chaque page de l'app au moins une fois | unique |
| **🛠 Le Praticien** | Utilisé chaque simulateur des Outils au moins une fois | unique |
| **🏗 Le Stratège Documenté** | Défini un objectif **et** des sous-objectifs sur les 4 dimensions BOURSE | unique |
| **📖 Le Lecteur Attentif** | Ouvert le CHANGELOG / les notes de version | unique |
| **✅ Le Profil Optimal** | Passage de "profil fiscal incomplet" à "complet" | unique |

### 🔥 FIRE — indépendance financière

| Badge | Description | Paliers |
|---|---|---|
| **🔥 FIRE Starter** | 1 % / 5 % / 10 % de l'objectif FIRE atteint | 3 paliers |
| **🛟 Coast FIRE** | Capital tel que les intérêts composés atteignent FIRE à la retraite | unique |
| **🥗 Lean FIRE** | 12 × dépenses annuelles | unique |
| **💎 Fat FIRE** | 25 × dépenses annuelles (objectif officiel FIRE) | unique |
| **🏝 Free at last** | Revenus passifs ≥ dépenses récurrentes mensuelles | unique |

### 📐 Ratios & santé financière

Récompenses la **qualité** du portefeuille, pas seulement la taille.

| Badge | Description | Paliers |
|---|---|---|
| **🚫 Le Désendetté** | Ratio dette / patrimoine | < 30 % · < 15 % · < 5 % · 0 % |
| **💚 Le Cashflow Positif** | Δ Revenus − Dépenses > 0 sur N mois consécutifs (Bilan financier) | 6 · 12 · 24 |
| **⭐ Le Score Maximal** | Score patrimonial | ≥ 70 · ≥ 80 · ≥ 90 · 100 |
| **🛡 Le Bouclier** | Ratio matelas / dépenses mensuelles | ≥ 6 · ≥ 12 · ≥ 24 mois |
| **⚖ Le Levier Maîtrisé** | Ratio crédit / valeur immo entre 30 % et 70 % (zone saine) | unique |

### 💳 Dettes & gestion

| Badge | Description | Paliers |
|---|---|---|
| **🚫 Crédit-Free** | Aucune dette pendant N mois consécutifs | 6 · 12 · 24 |
| **🔥 Premier Remboursement** | Première dette intégralement remboursée | unique |
| **🤝 Le Négociateur** | Renégociation enregistrée (changement de taux/durée) | unique |
| **🏠 Le Lord du Manoir** | Crédit immo couplé à une IMMO_PHYSIQUE | unique |

### 🎭 Profil & complétude

| Badge | Description | Paliers |
|---|---|---|
| **🌟 Le Pionnier** | Premier compte créé | unique |
| **👤 Profil Parfait** | Tous les champs profil renseignés (perso + fiscal + matelas) | unique |
| **🎨 Le Personnaliste** | Premier objectif patrimonial défini | unique |
| **🎯 L'Accomplisseur** | Premier objectif patrimonial atteint | unique |

### 🎯 Progression personnelle (relatif)

Récompense la **trajectoire**, pas seulement le niveau atteint — clé pour ceux qui partent de bas.

| Badge | Description | Paliers |
|---|---|---|
| **🚀 Le Décollage** | Patrimoine multiplié par N depuis l'inscription | × 2 · × 5 · × 10 |
| **➕ Sortie du Rouge** | Passage d'un patrimoine net négatif à positif | unique |
| **📊 L'Ascension** | Passage à un décile INSEE supérieur dans sa tranche d'âge | un par décile gagné |
| **🆓 Liberté Conquise** | Toute dette remboursée depuis l'arrivée sur l'app | unique |

### ⏳ Anciennté & fidélité

Récompenses du long terme à plat (indépendantes du niveau de patrimoine).

| Badge | Description | Paliers |
|---|---|---|
| **🎖 Le Pionnier de l'année 1** | Compte créé pendant la première année de l'app | unique (rare) |
| **📆 L'Habitué** | Anciennté du compte | 1 · 3 · 5 · 10 ans |
| **🦉 Le Vétéran** | Position détenue de manière continue depuis ≥ 10 ans | unique |
| **📚 L'Annaliste** | Au moins un snapshot par année calendaire pendant N ans | 5 · 10 |

### 🔄 Retour & engagement

Garder l'utilisateur en cas de phase difficile ou d'éclipse.

| Badge | Description | Paliers |
|---|---|---|
| **👋 Le Retour** | Première reconnexion après ≥ 30 jours d'absence | unique |
| **🎢 Comeback Kid** | Patrimoine revenu à son ATH après une chute > 15 % | unique |
| **📮 Le Fidèle** | Au moins 1 connexion par mois pendant 12 mois consécutifs | unique |

### 👨‍👩‍👧 Famille (mode foyer)

| Badge | Description | Paliers |
|---|---|---|
| **🌳 Le Patriarche** | Groupe familial créé | unique |
| **🤲 L'Hospitalier** | 1 / 3 / 5 membres rejoignent le groupe | 3 paliers |
| **🏰 Patrimoine Familial** | Patrimoine cumulé du groupe > seuils | 100 K · 500 K · 1 M |
| **❄ L'Effet Snowball Familial** | Tous les membres du foyer ont un score patrimonial > 50 | unique |
| **🎓 Le Coach** | Un membre invité atteint un objectif après son arrivée | unique |
| **💰 L'Économe Familial** | Taux d'épargne du foyer > 30 % maintenu pendant 12 mois | unique |

### 🌱 Investissement responsable (futur)

À activer dès qu'une donnée ESG sera attachée aux instruments.

| Badge | Description | Paliers |
|---|---|---|
| **🌳 L'Éthique** | Part du portefeuille en instruments labellisés ESG | 25 % · 50 % · 75 % |
| **🌿 Le Vert** | Première position en ETF / fonds ISR | unique |
| **🌍 Le Conscient** | Tous les ETF du portefeuille ont une notation ESG renseignée | unique |

### 🥚 Easter eggs / fun

| Badge | Description | Paliers |
|---|---|---|
| **🌌 The Answer** | Patrimoine exactement à 42 K€ (à un instant T) | secret |
| **🐶 Doge Approves** | Première position en DOGE | secret |
| **🌃 Le Vampire** | Mode nuit activé | secret |
| **🎂 Anniversaire MyFinance** | Connexion à la date anniversaire de la création du compte | annuel |
| **🎉 Black Friday** | Ordre BOURSE/CRYPTO le Black Friday | annuel secret |
| **🔔 New Year, New Wealth** | Premier ordre de l'année saisi en janvier | annuel |
| **▲ Le Triangle Sacré** | Allocation actions / immo / liquidités exactement 60/30/10 (à ±2 pts) | secret |
| **🔢 Le Numérologiste** | Patrimoine se terminant par .42 / .69 / .404 à un instant T | secret |
| **🎃 Vendredi 13** | Connexion à l'app un vendredi 13 | secret |
| **🌃 L'Insomniaque** | Connexion entre 3h et 5h du matin (heure Paris) | secret |

### 🎖 Méta & collection

Récompenses **sur les badges eux-mêmes** — donne un objectif final à la collection.

| Badge | Description | Paliers |
|---|---|---|
| **🎖 Le Collectionneur** | Hauts faits débloqués (toutes catégories confondues) | 25 · 50 · 100 |
| **🏆 Le Spécialiste** | Compléter une catégorie entière au plus haut palier | 1 · 3 · 5 catégories |
| **📚 L'Encyclopédiste** | Au moins 1 badge dans chacune des catégories du catalogue | unique |
| **💎 Le Légendaire** | Badges débloqués au plus haut palier (Diamant) | 5 · 10 |
| **🔍 Le Chasseur** | Trouver des badges secrets | 3 · 5 · 10 |

---

## Mécaniques proposées

### Détection — architecture hybride (figé V1)

| Type | Quand | Badges concernés |
|---|---|---|
| **Événementielle** | À la création/modification d'une entité (ordre, position, bulletin, simulation, snapshot manuel, toggle dark mode…) | 🟨 compteurs · 🟩 actions immédiates · easter eggs liés à un toggle |
| **Périodique — snapshot mensuel** | Hooké sur le `MarketDataService` scheduler après création du snapshot mensuel | 🟥 seuils patrimoniaux · 🟧 diversification / ratios / Phénix / Décollage |
| **Périodique — job nuit** | Tâche quotidienne légère | Streaks de connexion (`Le Quotidien`), anciennté du compte (`L'Habitué`) |
| **Rétroactive** | Au déploiement V1 + à chaque promotion d'un badge "ajouté en V2+" | Backfill de tous les badges déjà mérités |

### Stockage (figé V1)

```sql
CREATE TABLE user_achievement (
    id BIGINT PRIMARY KEY AUTOINCREMENT,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_code VARCHAR(40) NOT NULL,        -- valeur de l'enum AchievementCode
    level INTEGER NOT NULL,                       -- 1 à N selon le badge
    confirmed_at TIMESTAMP NOT NULL,              -- date d'unlock officielle
    confirmation_snapshot_id BIGINT REFERENCES portfolio_snapshots(id),

    -- Réservé aux badges 🟥 (validation différée)
    first_eligible_at TIMESTAMP,                  -- 1re fois où le seuil a été atteint
    consecutive_validations INTEGER DEFAULT 0,    -- 0..N (N = fenêtre de confirmation)
    last_check_at TIMESTAMP,                      -- dernier passage du batch

    UNIQUE(user_id, achievement_code, level)
);
CREATE INDEX idx_user_achievement_user ON user_achievement(user_id);
CREATE INDEX idx_user_achievement_pending ON user_achievement(achievement_code, confirmed_at)
    WHERE confirmed_at IS NULL;  -- pour le batch
```

Côté Java :
- Énum `AchievementCode` listant les 25 codes du MVP (cf. table V1 plus haut).
- Énum `AchievementSensitivity` { FORTE, MOYENNE, FAIBLE, NULLE }.
- Entité `UserAchievement` mappée sur la table.

### Affichage (figé V1)

- **Page Profil utilisateur — section "Hauts faits"**
  - Galerie d'icônes (emoji du badge) avec tooltip libellé + palier au survol.
  - Badges débloqués affichés en couleur, badges futurs/secrets en silhouette grisée.
  - Pas de barre de progression visible côté badges 🟥 en attente de confirmation (option silencieuse, cf. Anti-cheat).
- **Popup d'unlock**
  - Déclenché uniquement pour les badges **événementiels** (🟨/🟩) — pas de popup pour les unlocks issus du batch nocturne ou snapshot mensuel (l'utilisateur les découvre en consultant la section).
  - Modal centré, **fermable** par ✕ ou clic extérieur — pas d'auto-dismiss pour ne pas frustrer.
  - Contenu : icône XL, libellé, palier, courte description.
- **Indicateur "nouveau"**
  - Badge numérique (🆕 N) sur l'entrée de menu *Profil* tant que l'utilisateur n'a pas consulté la section après un nouvel unlock (event ou batch).
- **Hors V1** : widget tableau de bord, compteur global, partage externe.

### Niveaux & rareté (figé V1)

5 paliers visuels avec emojis et palette Tailwind :

| Palier | Emoji | Couleur Tailwind | Usage |
|---|---|---|---|
| Bronze | 🥉 | `amber-700` / `amber-100` | 1er palier d'un badge multi-niveau |
| Argent | 🥈 | `gray-400` / `gray-100` | 2e palier |
| Or | 🥇 | `yellow-500` / `yellow-100` | 3e palier |
| Platine | 💠 | `cyan-500` / `cyan-100` | 4e palier |
| Diamant | 💎 | `indigo-600` / `indigo-100` | 5e palier (max) |

- Les badges **uniques** (1 palier) utilisent une couleur neutre (`indigo-500`) et l'emoji du badge sans médaille.
- Les badges **secrets** (Easter eggs) ont un fond violet (`violet-100` / `violet-700`) pour marquer la rareté.
- Pas de score / XP global en V1 — la collection parle d'elle-même.

### Anti-cheat & validation différée

**Problème** : un badge basé sur un seuil de patrimoine est trivialement cheatable — il suffit d'ajouter une position fictive de 50 K€, d'attendre l'unlock, puis de supprimer la position. Ça vide le système de son sens.

**Stratégie globale** : classer chaque haut fait selon sa sensibilité à la triche, puis appliquer une **validation différée** pour les badges les plus sensibles, basée sur les snapshots mensuels de patrimoine (qui font foi).

#### Classification par sensibilité

| Sensibilité | Catégories concernées | Stratégie de validation |
|---|---|---|
| 🟥 **Forte** | Seuils de patrimoine (global, par catégorie, FIRE), enveloppes (PEA plafond), Liquidités, Magnat Immobilier, Crypto Addict, Baron de la Bourse | Différée — N snapshots consécutifs au-dessus du seuil |
| 🟧 **Moyenne** | Diversification, Couverture géo/sectorielle, Score patrimonial, Ratios, Stratège Aligné | Snapshot mensuel avec **seuils d'inclusion** (poids ≥ 1 % pour compter) |
| 🟨 **Faible** | DCA-master, Régularité, Anciennté, Connexion, compteurs cumulés (snapshots créés, ordres saisis) | Validation temps réel — la nature du badge empêche la triche |
| 🟩 **Nulle** | Easter eggs, Premier pas, Outils utilisés, Pédagogie | Validation immédiate, pas d'enjeu |

#### Validation différée — flow pour les badges 🟥 forte sensibilité

```
ÉLIGIBLE ──── snapshot N+1 OK ────► EN COURS (1/3)
   │                                     │
   │                          snapshot N+2 OK
   │                                     ▼
   │                              EN COURS (2/3)
   │                                     │
   │                          snapshot N+3 OK
   │                                     ▼
   │                                CONFIRMÉ ✅
   │
   └── Si à un quelconque snapshot le seuil n'est plus atteint :
       retour à ÉLIGIBLE (la fenêtre repart à 0)
```

- Le batch tourne **après chaque snapshot mensuel** (déjà programmé via le `MarketDataService` scheduler).
- La fenêtre par défaut est de **3 snapshots consécutifs** (≈ 3 mois) — paramétrable globalement ou par catégorie de badge.
- Une fois **CONFIRMÉ**, le badge est immuable : la suppression ultérieure d'une position ne le retire pas.
- Si l'utilisateur veut accélérer, il peut **créer manuellement des snapshots intermédiaires** : tant qu'ils sont espacés d'au moins X jours, ils comptent dans la fenêtre.

#### Règles d'inclusion pour les badges 🟧 moyenne sensibilité

Un seul snapshot suffit, mais avec des contraintes structurelles qui empêchent les positions cosmétiques :

- **Le Globe-Trotter** : un pays ne compte que si l'exposition pondérée est **≥ 1 %** du patrimoine total. Une position de 10 € en Indonésie ne suffit pas à cocher "Asie du Sud-Est".
- **L'Inter-Sectoriel** : idem côté secteurs, seuil ≥ 1 %.
- **Touche-à-tout** : une catégorie compte si elle représente **≥ 0,5 %** du patrimoine.
- **Le Diversificateur (crypto)** : une crypto compte si elle représente **≥ 0,5 %** du portefeuille crypto.

#### Audit trail

La table `user_achievement` doit conserver suffisamment d'historique pour le débogage et la transparence :

| Colonne | Usage |
|---|---|
| `first_eligible_at` | Date de première éligibilité (entrée dans la fenêtre) |
| `consecutive_validations` | Nombre de snapshots consécutifs validés (0 → N) |
| `last_check_at` | Dernier passage du batch sur cet achievement |
| `confirmed_at` | Date d'unlock officielle (NULL tant que pas confirmé) |
| `confirmation_snapshot_id` | Snapshot qui a déclenché la confirmation (audit) |

#### Notifications pendant la phase d'attente

Deux options à arbitrer :

- **Option silencieuse (recommandée pour MVP)** — aucune notification tant que le badge n'est pas CONFIRMÉ. Évite la frustration en cas d'oscillation autour du seuil et préserve l'effet de surprise.
- **Option transparente** — afficher dans la page achievements un état *« 🕐 En attente de confirmation (2/3 snapshots) »* pour les badges 🟥 en cours de validation, avec date prévue de l'unlock.

#### Bonus : protection des badges immuables

- **Pas de fenêtre rétroactive** côté seuil patrimoine : un palier confirmé reste acquis même si le patrimoine redescend ensuite.
- **Action irréversible** : suppression d'une position ne supprime pas un badge déjà confirmé.
- **Cooldown** sur certains badges secrets exigeant une correspondance exacte (ex. « The Answer » : 42 K€ à ±100 € près, vérifié uniquement sur les snapshots mensuels — pas en temps réel pour éviter les déclenchements multiples lors de fluctuations).
- **Anti-bombing snapshot** : un utilisateur ne peut pas créer plus de N snapshots manuels par jour (limite déjà existante côté `AdminSnapshotService` à confirmer / ajouter).

---

## Exemples de variations de paliers (sweet spot)

Pour les badges quantitatifs, le bon découpage doit donner un **prochain palier toujours visible**. Quelques règles empiriques :

- **Ratio × 2 à × 2,5** entre paliers pour les petits montants (1 K → 5 K → 25 K).
- **Ratio × 2** pour les grandes valeurs (100 K → 250 K → 500 K → 1 M).
- **Pas de palier final** sur les badges « infinis » : « To The Moon » s'arrête volontairement à 1 M, mais on relaye avec « Multi-millionnaire » au-delà.

---

## ✅ Décisions arbitrées (V1)

| # | Question | Décision V1 |
|---|---|---|
| 1 | Score / niveau global ? | ❌ Non — collection de badges sans niveau ni XP global. Pas de discrimination entre utilisateurs. |
| 2 | Débloquer des fonctionnalités ? | ❌ Non — badges purement cosmétiques. |
| 3 | Style de notification | ✅ Popup d'unlock fermable pour les badges événementiels uniquement. Indicateur 🆕 sur le menu Profil tant que pas consulté. |
| 4 | Partage externe | ❌ Non en V1. |
| 5 | Saisonnalité / badges limités | ❌ Non — catalogue fixe. |
| 6 | Badges collectifs (foyer) | ❌ Non — uniquement individuels. |
| 7 | Curation MVP | ✅ 25 badges sélectionnés (cf. section MVP), 94 autres reportés en V2+. |
| 8 | Confidentialité | ✅ Badges privés, non visibles aux autres membres du foyer. |
| 9 | Niveau de fun | ✅ On garde — Pablo Escobar, Le Vampire, Doge Approves… restent fidèles à l'ADN. |
| 10 | Performance | ✅ Architecture hybride — événementiel pour les compteurs, périodique pour les seuils. Pas de recalcul exhaustif à chaque login. |
| 11 | Backfill au déploiement | ✅ Oui — message d'accueil avec compte des badges débloqués rétroactivement. |
| 12 | ATH du patrimoine | ✅ Nouveau champ `User.allTimeHighEur` mis à jour à chaque snapshot. |
| 13 | Paliers visuels | ✅ 5 niveaux — Bronze 🥉 / Argent 🥈 / Or 🥇 / Platine 💠 / Diamant 💎 avec couleurs Tailwind. |
| 14 | Emplacement UI | ✅ Section dédiée dans la page Profil utilisateur. Pas de widget tableau de bord en V1. |

---

## Pistes d'extension

Une fois le MVP en place, plusieurs directions possibles :

- **Quêtes hebdomadaires / mensuelles** : « Cette semaine : saisis 1 bulletin et fais 1 simulation » → bonus de progression.
- **Défis communautaires** (statistiques anonymisées) : « 30 % des utilisateurs ont débloqué *Crypto Addict* niveau 1 ce mois ».
- **Achievements liés à la performance** : suivi du Sharpe perso, drawdown traversé, hold pendant un crash > 30 %.
- **Achievements pédagogiques** : compléter un parcours d'onboarding sur les enveloppes fiscales, lire la doc de la stratégie patrimoniale.
- **Personnalisation visuelle** : badge favori épinglé en avatar, thème de couleur débloqué selon le palier le plus haut.
- **Quêtes guidées** : au lieu de badges passifs, des chaînes hebdomadaires (« Cette semaine : (1) saisis un bulletin, (2) lance une simulation, (3) vérifie tes objectifs »). Récompense liée à la chaîne complète, pas aux étapes isolées.
- **Niveau "Patrimonialiste"** global : score cumulant tous les badges (pondéré par rareté), affiché dans le profil avec titre dynamique : *Apprenti → Aventurier → Bâtisseur → Stratège → Maître → Légende*.
- **Trophées de fin d'année** : récap annuel attribuant rétroactivement des titres uniques (« Le Plus Régulier 2026 », « La Plus Grande Progression 2026 », « Le Plus Diversifié 2026 »).
- **Achievements avec "preuve"** : pour débloquer un badge, exiger plusieurs actions complémentaires (ex. *Le Fiscaliste* requiert : simulation d'impôts lancée **et** comparaison de 2 enveloppes). Force la complétude d'usage et évite les unlocks triviaux.

---

> Prochaine étape proposée : **trier la liste actuelle pour définir un MVP réaliste (~25 badges max)**, puis ouvrir une issue d'implémentation avec spec technique (entités, services, déclencheurs, UI).
