# API — Outils patrimoniaux

Documentation des endpoints REST pour le scoring patrimonial, les objectifs, le référentiel INSEE et les droits d'accès.

L'architecture est dans [`docs/architecture/patrimoine-scoring.md`](../architecture/patrimoine-scoring.md), [`docs/architecture/patrimoine-strategy.md`](../architecture/patrimoine-strategy.md) et [`docs/architecture/patrimoine.md`](../architecture/patrimoine.md).

---

## Référentiel INSEE

### GET `/api/patrimoine/referentiel`

Retourne le référentiel INSEE Enquête Patrimoine 2021-2022 : seuils de patrimoine brut par tranche d'âge et par décile D1–D9.

**Accès** : authentifié

**Réponse 200**

```json
{
  "source": "INSEE Enquête Patrimoine 2021-2022",
  "tranches": [
    {
      "label": "18-29 ans",
      "ageMin": 18,
      "ageMax": 29,
      "d1": 0,
      "d2": 200,
      "d3": 2000,
      "d4": 6000,
      "d5": 13000,
      "d6": 27000,
      "d7": 53000,
      "d8": 100000,
      "d9": 193000
    },
    {
      "label": "30-39 ans",
      "ageMin": 30,
      "ageMax": 39,
      "d1": 400,
      "d2": 3500,
      "d3": 11000,
      "d4": 27000,
      "d5": 56000,
      "d6": 107000,
      "d7": 192000,
      "d8": 314000,
      "d9": 517000
    }
  ]
}
```

**Utilisation frontend :** `PatrimoinePage` calcule l'âge de l'utilisateur depuis `birthDate` (fourni par `GET /api/auth/me`), trouve la tranche correspondante et détermine le décile. Affichage : `D{rang}/10 · {label tranche}` sous la valeur du patrimoine brut.

---

## Stratégie & Objectifs patrimoniaux

### GET `/api/patrimoine/targets`

Retourne les objectifs (montants cibles, plafonds et sous-objectifs de diversification) sous la forme d'un `PatrimoineTargetsDto` à 3 champs.

**Accès** : authentifié

**Réponse 200**

```json
{
  "targets": {
    "BOURSE": 150000.0,
    "CRYPTO": 10000.0,
    "IMMO_PHYSIQUE": 400000.0
  },
  "maxTargets": {
    "LIQUIDITE": 5000.0,
    "LIVRET": 20000.0
  },
  "breakdowns": {
    "BOURSE": [
      { "dimension": "SECTOR",   "key": "Technology",  "targetPercentage": 35 },
      { "dimension": "COUNTRY",  "key": "FR",          "targetPercentage": 50 },
      { "dimension": "CURRENCY", "key": "EUR",         "targetPercentage": 60 }
    ],
    "CRYPTO": [
      { "dimension": "INSTRUMENT", "key": "BTC", "targetPercentage": 40 },
      { "dimension": "INSTRUMENT", "key": "ETH", "targetPercentage": 30 }
    ],
    "IMMO_PHYSIQUE": [
      { "dimension": "PROPERTY_USAGE", "key": "RESIDENCE_PRINCIPALE", "targetPercentage": 60 },
      { "dimension": "PROPERTY_USAGE", "key": "LOCATIF",              "targetPercentage": 40 }
    ]
  }
}
```

- `targets` — objectif de montant cible par catégorie (en €)
- `maxTargets` — plafond à ne pas dépasser, applicable uniquement à `LIQUIDITE` et `LIVRET`
- `breakdowns` — sous-objectifs de répartition par dimension pour chaque catégorie

---

### PUT `/api/patrimoine/targets`

Enregistre les objectifs patrimoniaux (remplacement complet — `SaveTargetsRequest`).

**Accès** : authentifié

**Corps de la requête**

```json
{
  "targets": {
    "BOURSE": 150000.0,
    "CRYPTO": 10000.0,
    "IMMO_PHYSIQUE": 400000.0
  },
  "maxTargets": {
    "LIQUIDITE": 5000.0,
    "LIVRET": 20000.0
  },
  "breakdowns": {
    "BOURSE": [
      { "dimension": "SECTOR",  "key": "Technology", "targetPercentage": 35 }
    ],
    "CRYPTO": [
      { "dimension": "INSTRUMENT", "key": "BTC", "targetPercentage": 40 }
    ]
  }
}
```

**Règles de validation :**

- Catégories valides : `BOURSE`, `CRYPTO`, `IMMO_PAPIER`, `IMMO_PHYSIQUE`, `LIVRET`, `LIQUIDITE`
- `maxTargets` accepte uniquement `LIQUIDITE` et `LIVRET` (plafond)
- Dimensions autorisées par catégorie :
  - **BOURSE** : `SECTOR`, `COUNTRY`, `CONTINENT`, `CURRENCY`, `ASSET_SUBTYPE`
  - **CRYPTO** : `CRYPTO_TYPE`, `CRYPTO_NETWORK`, `INSTRUMENT`
  - **IMMO_PHYSIQUE** : `PROPERTY_USAGE`
- Pour chaque dimension d'une catégorie, la somme des `targetPercentage` ≤ 100 % (sinon `400 BAD_REQUEST`)
- Les clés en doublon (case-insensitive) sont refusées (`400`)

**Réponse 200** — `PatrimoineTargetsDto` mis à jour.

---

### GET `/api/patrimoine/breakdown/{dimension}`

Retourne la répartition réelle du portefeuille pour la dimension demandée, à comparer aux sous-objectifs (`PortfolioBreakdownDto`).

**Accès** : authentifié

**Path variable** :
`sector` | `country` | `continent` | `currency` | `asset-subtype` | `crypto-type` | `crypto-network` | `property-usage` | `instrument`

**Query param** (optionnel) :
`category=BOURSE | CRYPTO` — utile lorsque la même dimension est calculée pour plusieurs catégories (ex : `currency` côté BOURSE).

**Réponse 200**

```json
{
  "dimension": "INSTRUMENT",
  "totalEur": 12000.00,
  "coverageRatio": 100.0,
  "unclassifiedEur": 0.00,
  "breakdown": [
    { "key": "BTC", "valueEur": 7200.00, "actualPercentage": 60.0 },
    { "key": "ETH", "valueEur": 3600.00, "actualPercentage": 30.0 },
    { "key": "SOL", "valueEur": 1200.00, "actualPercentage": 10.0 }
  ]
}
```

- `coverageRatio` — % de la valeur totale réellement classée (le reste est en "Non classé")
- `unclassifiedEur` — montant non classé (pour `SECTOR`/`COUNTRY` quand les allocations instrumentales sont incomplètes)

**Réponse 400** — dimension inconnue.

---

## KPI patrimoniaux (Immobilier)

### GET `/api/patrimoine/kpi/targets`

Retourne les objectifs KPI configurés par l'utilisateur.

**Accès** : authentifié

**Réponse 200**

```json
{
  "IMMO_RENDEMENT_BRUT":   5.0,
  "IMMO_LTV":              60.0,
  "IMMO_PAPIER_RENDEMENT": 4.5
}
```

Valeurs en pourcentages. `{}` = aucun KPI configuré.

---

### PUT `/api/patrimoine/kpi/targets`

Enregistre les objectifs KPI (remplacement complet).

**Accès** : authentifié

**Corps de la requête**

```json
{
  "IMMO_RENDEMENT_BRUT":   5.0,
  "IMMO_LTV":              60.0,
  "IMMO_PAPIER_RENDEMENT": 4.5
}
```

Clés valides : `IMMO_RENDEMENT_BRUT`, `IMMO_LTV`, `IMMO_PAPIER_RENDEMENT`.

---

### GET `/api/patrimoine/kpi/values`

Retourne la valeur **réelle** de chaque KPI calculée à la volée + l'objectif associé (s'il existe).

**Accès** : authentifié

**Réponse 200**

```json
[
  {
    "kpiType": "IMMO_RENDEMENT_BRUT",
    "actualValue": 4.2,
    "targetValue": 5.0,
    "higherIsBetter": true,
    "hasData": true
  },
  {
    "kpiType": "IMMO_LTV",
    "actualValue": 45.0,
    "targetValue": 60.0,
    "higherIsBetter": false,
    "hasData": true
  }
]
```

**Calcul** :
- `IMMO_RENDEMENT_BRUT` = somme des loyers annuels (`OtherIncome` LOCATIF rattachés à un bien IMMO_PHYSIQUE × 12) / valeur estimée totale des biens × 100
- `IMMO_LTV` = somme des capitaux restants dus (`Debt` IMMOBILIER liés à un bien) / valeur estimée totale des biens × 100
- `IMMO_PAPIER_RENDEMENT` = somme des dividendes annuels SCPI (`OtherIncome` DIVIDENDE × 12) / valeur des positions IMMO_PAPIER × 100

`hasData=false` si les données nécessaires au calcul sont absentes (ex : pas de bien IMMO_PHYSIQUE).

---

## Scoring patrimonial

### GET `/api/patrimoine/score`

Calcule et retourne le score patrimonial de l'utilisateur connecté (calculé à la volée, non persisté) en 6 axes.

**Accès** : authentifié

**Réponse 200**

```json
{
  "totalScore": 72,
  "maxScore": 105,
  "profile": "EQUILIBRE",
  "weakestAxisId": "epargne",
  "weakestAxisAdvice": "Votre taux d'épargne est insuffisant. Visez 15 % minimum.",
  "axes": [
    {
      "id": "diversification",
      "label": "Diversification",
      "score": 16,
      "maxScore": 20,
      "detail": "4 catégories d'actifs présentes",
      "missingData": false
    },
    {
      "id": "matelas",
      "label": "Matelas de sécurité",
      "score": 12,
      "maxScore": 15,
      "detail": "3 mois de dépenses couverts",
      "missingData": false
    },
    {
      "id": "endettement",
      "label": "Endettement",
      "score": 18,
      "maxScore": 20,
      "detail": "Ratio dette/patrimoine : 28 %",
      "missingData": false
    },
    {
      "id": "epargne",
      "label": "Épargne",
      "score": 8,
      "maxScore": 20,
      "detail": "Taux d'épargne : 8 %",
      "missingData": false
    },
    {
      "id": "age_risque",
      "label": "Âge & Risque",
      "score": 12,
      "maxScore": 15,
      "detail": "Profil cohérent avec l'horizon d'investissement",
      "missingData": false
    },
    {
      "id": "progression",
      "label": "Progression",
      "score": 6,
      "maxScore": 10,
      "detail": "Patrimoine en hausse sur 3 snapshots",
      "missingData": false
    }
  ]
}
```

| Champ | Description |
|-------|-------------|
| `totalScore` | Score global (0–105) |
| `maxScore` | Maximum atteignable (100 axes + 5 bonus objectifs) |
| `profile` | `FRAGILE` (<30) · `PRUDENT` (30–49) · `EQUILIBRE` (50–69) · `DYNAMIQUE` (70–84) · `OPTIMISE` (≥85) |
| `weakestAxisId` | ID de l'axe avec le moins bon score relatif |
| `weakestAxisAdvice` | Conseil actionnable pour l'axe le plus faible |
| `axes[].missingData` | `true` si des données manquent pour cet axe |

---

## Droits d'accès

| Action | Rôle requis |
|--------|-------------|
| Gérer ses positions et ordres | USER, ADMIN |
| Consulter / déclencher ses propres snapshots | USER, ADMIN |
| Gérer le référentiel d'instruments (CRUD) | USER, ADMIN |
| Mettre à jour les cours manuellement | ADMIN uniquement |
| Activer / désactiver le prix fixe | ADMIN uniquement |
| Déclencher le scheduler complet | ADMIN uniquement |
| Générer un snapshot pour tous les utilisateurs | ADMIN uniquement |
| Consulter le référentiel INSEE | USER, ADMIN |
| Consulter / mettre à jour ses objectifs | USER, ADMIN |
| Consulter son score patrimonial | USER, ADMIN |
| Accéder aux données d'un autre utilisateur | ADMIN uniquement |
| CRUD snapshots admin | ADMIN uniquement — voir [`docs/api/admin-snapshots.md`](admin-snapshots.md) |
