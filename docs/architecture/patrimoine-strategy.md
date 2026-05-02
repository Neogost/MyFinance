# Stratégie & Objectifs patrimoniaux

## Vue d'ensemble

Permet à l'utilisateur de définir et suivre ses objectifs patrimoniaux selon plusieurs axes :

- **Montants cibles** par catégorie d'actifs (BOURSE, CRYPTO, IMMO_PHYSIQUE, IMMO_PAPIER, LIVRET, LIQUIDITE)
- **Plafonds** sur les catégories à éviter d'accumuler (LIQUIDITE, LIVRET)
- **Sous-objectifs de diversification** par dimension à l'intérieur d'une catégorie (ex : 35 % Technology côté BOURSE, 40 % BTC côté CRYPTO)
- **KPI immobiliers** : rendement brut locatif, LTV, rendement SCPI

L'écart entre les objectifs et la réalité du portefeuille est calculé à la volée à partir des positions, des allocations sectorielles/géographiques des instruments, et des revenus locatifs rattachés aux biens IMMO.

---

## Flux UX

1. Depuis la page **Patrimoine**, l'utilisateur ouvre la modal "Stratégie & Objectifs".
2. Pour chaque catégorie, il saisit le montant cible. Pour `LIQUIDITE` et `LIVRET`, il peut aussi définir un plafond.
3. Pour les catégories qui le supportent, il déplie la section "Diversification" et définit des objectifs par dimension (en %). Les valeurs déjà présentes dans le portefeuille sont proposées en suggestions.
4. Pour la catégorie IMMO, il peut configurer des objectifs KPI (rendement brut, LTV, rendement SCPI).
5. Les écarts à la cible sont restitués sur la page Patrimoine (carte de catégorie, panneaux de diversification) et dans le tableau de bord (section "Objectifs & Stratégie").

---

## Modèle de données

### Entité `PatrimoineTarget` — table `patrimoine_targets`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `Long` | PK |
| `user` | `User` | Propriétaire (FK) |
| `category` | `String` | `BOURSE` \| `CRYPTO` \| `IMMO_PHYSIQUE` \| `IMMO_PAPIER` \| `LIVRET` \| `LIQUIDITE` |
| `targetAmountEur` | `Double` | Montant cible en € |
| `targetMaxAmountEur` | `Double` (nullable) | Plafond — applicable uniquement à `LIQUIDITE` et `LIVRET` |

**Contrainte :** `UNIQUE(user_id, category)`

### Entité `PatrimoineTargetBreakdown` — table `patrimoine_target_breakdowns`

Stocke les sous-objectifs de diversification par dimension.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `Long` | PK |
| `target` | `PatrimoineTarget` | FK vers le `PatrimoineTarget` parent (cascade DELETE) |
| `dimension` | `BreakdownDimension` (enum) | Voir tableau ci-dessous |
| `breakdownKey` | `String` | Clé du bucket (ex : `Technology`, `FR`, `BTC`, `RESIDENCE_PRINCIPALE`) |
| `targetPercentage` | `BigDecimal(5,2)` | Pourcentage cible 0–100 |

**Contraintes :**
- `UNIQUE(patrimoine_target_id, dimension, breakdown_key)`
- Pour un même `(target, dimension)`, la somme des `targetPercentage` ≤ 100 (validation service)

### Entité `PatrimoineKpiTarget` — table `patrimoine_kpi_targets`

Stocke les **objectifs** par KPI (les valeurs réelles sont calculées à la volée).

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `Long` | PK |
| `user` | `User` | Propriétaire (FK) |
| `kpiType` | `KpiType` (enum) | `IMMO_RENDEMENT_BRUT` \| `IMMO_LTV` \| `IMMO_PAPIER_RENDEMENT` |
| `targetValue` | `BigDecimal` | Objectif en pourcentage |

**Contrainte :** `UNIQUE(user_id, kpi_type)`

---

## Dimensions de diversification

| Dimension | Catégorie autorisée | Source de la donnée réelle |
|-----------|---------------------|----------------------------|
| `SECTOR` | `BOURSE` | `InstrumentSectorAllocation` (% par secteur sur chaque instrument) |
| `COUNTRY` | `BOURSE` | `InstrumentAllocation` (% par pays sur chaque instrument) |
| `CONTINENT` | `BOURSE` | `InstrumentAllocation` agrégé via mapping pays → continent (80+ pays mappés) |
| `CURRENCY` | `BOURSE` | `Instrument.currency` |
| `ASSET_SUBTYPE` | `BOURSE` | `Position.assetSubType` (ETF / ACTION / OBLIGATION / FONDS_EUROS / TRACKERS / SCPI…) |
| `CRYPTO_TYPE` | `CRYPTO` | `Instrument.cryptoType` (Stablecoin / Store of value / Smart contract / Layer 2 / DeFi / Other) |
| `CRYPTO_NETWORK` | `CRYPTO` | `Instrument.cryptoNetwork` (Bitcoin / Ethereum / Solana / Polygon / Avalanche / BNB Chain / Arbitrum / Optimism / Base / Other) |
| `INSTRUMENT` | `CRYPTO` | `Instrument.ticker` (fallback `name`) — objectifs par coin individuel (BTC 40 %, ETH 30 %…) |
| `PROPERTY_USAGE` | `IMMO_PHYSIQUE` | `Position.propertyUsage` (Résidence principale / Locatif / Secondaire-Loisirs / Autre) |

`PatrimoineTargetService.ALLOWED_DIMENSIONS` est la table de référence des associations dimension ↔ catégorie. Toute combinaison non listée est rejetée par `400 BAD_REQUEST`.

### Couverture (`coverageRatio`)

Pour les dimensions reposant sur des allocations partielles (`SECTOR`, `COUNTRY`, `CONTINENT`), la part non couverte (instrument sans allocation, position sans instrument) est agrégée dans un bucket "Non classé". Le ratio de couverture est exposé dans `PortfolioBreakdownDto.coverageRatio` ; un bandeau d'alerte s'affiche côté frontend si la couverture est inférieure à 80 %.

---

## KPI immobiliers

`PatrimoineKpiService` calcule à la volée la valeur réelle de chaque KPI ; aucune donnée n'est persistée en dehors des objectifs.

| KPI | Formule | Sens (`higherIsBetter`) |
|-----|---------|-------------------------|
| `IMMO_RENDEMENT_BRUT` | `Σ(loyers annuels) / Σ(valeur estimée biens IMMO_PHYSIQUE) × 100` | `true` |
| `IMMO_LTV` | `Σ(capital restant dû) / Σ(valeur estimée biens IMMO_PHYSIQUE) × 100` | `false` |
| `IMMO_PAPIER_RENDEMENT` | `Σ(dividendes SCPI annuels) / Σ(valeur positions IMMO_PAPIER) × 100` | `true` |

**Sources :**
- Loyers annuels = `OtherIncome` de type `LOCATIF` rattaché à un `Position` IMMO_PHYSIQUE × 12
- Capital restant dû = `Debt` de type `IMMOBILIER` lié à un `Position`
- Dividendes SCPI = `OtherIncome` de type `DIVIDENDE` × 12 (toutes positions IMMO_PAPIER confondues)

`hasData=false` lorsqu'aucun bien ou aucune donnée source n'existe pour le KPI.

---

## Liaison revenu locatif → bien IMMO

Le champ `OtherIncome.position` (FK nullable vers `Position`) permet de rattacher un revenu locatif à un bien IMMO_PHYSIQUE :

- Réservé au type `LOCATIF` (`OtherIncomeService` lève `400` si fourni avec un autre type)
- Indispensable au calcul du KPI `IMMO_RENDEMENT_BRUT`
- À la suppression d'un bien, `PositionService.delete()` nullifie tous les `OtherIncome.position` rattachés (SQLite n'applique pas `ON DELETE SET NULL` en l'absence de `PRAGMA foreign_keys = ON`)
- `OtherIncomeDto.from()` contient une garde défensive (`try/catch` sur le proxy Hibernate) pour éviter une `EntityNotFoundException` en cas de FK orpheline

---

## API REST

Voir [`docs/api/patrimoine-outils.md`](../api/patrimoine-outils.md) pour les détails complets.

| Méthode | URL | Description |
|---------|-----|-------------|
| `GET` | `/api/patrimoine/targets` | Renvoie `PatrimoineTargetsDto` (`targets` + `maxTargets` + `breakdowns`) |
| `PUT` | `/api/patrimoine/targets` | Remplace l'intégralité des objectifs et sous-objectifs |
| `GET` | `/api/patrimoine/breakdown/{dimension}?category=` | Répartition réelle du portefeuille pour une dimension |
| `GET` | `/api/patrimoine/kpi/targets` | Objectifs KPI configurés |
| `PUT` | `/api/patrimoine/kpi/targets` | Remplace les objectifs KPI |
| `GET` | `/api/patrimoine/kpi/values` | Valeurs réelles + cibles (calculé à la volée) |

---

## Backend — points clés

- **`PatrimoineTargetService`** — upsert atomique des cibles, plafonds et breakdowns. Validations : dimension autorisée par catégorie, somme par dimension ≤ 100, doublons de clé refusés.
- **`PatrimoineBreakdownService`** — dispatcher par dimension. Trois familles d'agrégation :
  - **Allocations pondérées** (`SECTOR`, `COUNTRY`, `CONTINENT`) : un instrument peut avoir N allocations totalisant ≤ 100 %, le résidu va en "Non classé"
  - **Champ unique** (`CURRENCY`, `ASSET_SUBTYPE`, `CRYPTO_TYPE`, `CRYPTO_NETWORK`, `INSTRUMENT`, `PROPERTY_USAGE`) : chaque position contribue à 100 % à un seul bucket
  - **Mapping** (`CONTINENT`) : utilise les allocations pays puis applique un dictionnaire pays ISO → continent (~80 pays mappés)
- **`PatrimoineKpiService`** — calcul des valeurs réelles à la demande, agrège positions, dettes et revenus.
- **`PatrimoineScoreService`** — bonus de 5 points sur le score patrimonial si au moins un objectif est défini.

---

## Frontend — points clés

- **`PatrimoineStrategyModal`** : modal de saisie groupée. Les sections de diversification sont conditionnelles à la catégorie. Les suggestions des dimensions sont fetchées en live depuis `GET /api/patrimoine/breakdown/{dim}?category=` afin de proposer les vraies valeurs présentes dans le portefeuille (utile notamment pour `INSTRUMENT` côté CRYPTO).
- **`PatrimoinePage`** : carte de catégorie avec barre de progression cible/réel et alerte plafond. Panneaux de diversification (`BourseBreakdownSection`) sous la carte BOURSE / CRYPTO / IMMO_PHYSIQUE.
- **Tableau de bord — section "Objectifs & Stratégie"** :
  - `PatrimoineScoreWidget` (score)
  - `PatrimoineStrategyRadarChart` (radar des objectifs)
  - `PatrimoineKpiWidget` (jauges KPI immobiliers)
  - `DiversificationSection` (donuts par dimension, lazy-fetch uniquement si des objectifs sont configurés)

Chaque widget peut être masqué indépendamment via le panneau de personnalisation du dashboard.

### Composant `DimensionDonut`

Donut Recharts comparant `actualPercentage` vs `targetPercentage` par bucket. Coloration de l'écart :
- Vert si `|écart| ≤ 2 pts`
- Indigo si `|écart| ≤ 5 pts`
- Ambre si `|écart| ≤ 10 pts`
- Rouge au-delà

---

## Migrations SQLite

| Fichier | Contenu |
|---------|---------|
| `010_add_patrimoine_target_breakdowns.sql` | Création initiale de `patrimoine_target_breakdowns` |
| `012_add_kpi_and_immo_objectives.sql` | `position_id` sur `other_incomes`, `property_usage` sur `positions`, `target_max_amount_eur` sur `patrimoine_targets`, table `patrimoine_kpi_targets` |
| `013_add_instrument_breakdown_dimension.sql` | Recréation de `patrimoine_target_breakdowns` avec CHECK constraint étendu (ajout d'`INSTRUMENT`) — SQLite ne supporte pas `ALTER TABLE MODIFY CONSTRAINT` |

---

## Hors périmètre

- Pas de date d'échéance ni d'historique des objectifs (les objectifs sont remplacés à chaque sauvegarde)
- Pas de cumul inter-catégories ni d'objectif global
- Pas de mode famille — les objectifs sont strictement personnels à l'utilisateur connecté
- Pas de rééquilibrage suggéré (« vendez X € de Tech, achetez Y € de Healthcare »)
- Pas d'historisation des écarts à la cible (timeline de convergence)
- Pas de KPI BOURSE (rendement dividendes, ratio frais, etc.)
