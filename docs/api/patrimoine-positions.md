# API — Instruments, Positions et Ordres

Documentation des endpoints REST pour les instruments financiers, les positions du portefeuille et les ordres.

L'architecture (modèle de données, règles de calcul, sources de prix) est dans [`docs/architecture/instruments.md`](../architecture/instruments.md) et [`docs/architecture/patrimoine.md`](../architecture/patrimoine.md).

---

## Instruments

### GET `/api/instruments`

Liste les instruments du référentiel avec recherche libre.

**Paramètres de requête**

| Paramètre | Type | Description |
|-----------|------|-------------|
| `q` | `String` | Recherche libre sur `isin`, `ticker` ou `name` (min. 2 caractères) |
| `category` | `BOURSE` \| `CRYPTO` | Filtre par catégorie |

**Réponse 200**

```json
[
  {
    "id": 1,
    "category": "BOURSE",
    "isin": "FR0010315770",
    "ticker": null,
    "name": "Lyxor PEA Nasdaq-100 UCITS ETF",
    "currency": "EUR",
    "lastPrice": 88.44,
    "lastPriceUpdatedAt": "2026-04-01T08:00:00",
    "stablePrice": false,
    "boursoramaSymbol": "1rPCAC",
    "coinGeckoId": null,
    "countryAllocation": [
      { "country": "États-Unis", "percentage": 62.50 }
    ],
    "sectorAllocation": [
      { "sector": "Technologie", "percentage": 31.00 }
    ]
  }
]
```

---

### GET `/api/instruments/{id}`

**Réponse 200** — même structure que ci-dessus.

**Erreurs**

| Code | Raison |
|------|--------|
| 404 | Instrument introuvable |

---

### POST `/api/instruments`

Créer un instrument manuellement.

**Corps de la requête**

```json
{
  "category": "BOURSE",
  "isin": "LU1681048804",
  "name": "Amundi PEA MSCI Europe UCITS ETF",
  "currency": "EUR",
  "boursoramaSymbol": "1rTPCEU"
}
```

**Règles :** `category` + `name` + `currency` obligatoires. `isin` obligatoire si BOURSE (unique). `ticker` obligatoire si CRYPTO (unique).

**Réponse 201** — instrument créé avec `lastPrice = null`.

**Erreurs**

| Code | Raison |
|------|--------|
| 409 | ISIN ou ticker déjà existant |

---

### PUT `/api/instruments/{id}`

Modifier un instrument. Mêmes champs que POST.

**Rôle requis :** `ADMIN`

> ⚠ Les instruments sont des données partagées (référencés par les positions de tous les utilisateurs). La modification est réservée aux administrateurs pour empêcher l'altération du nom, de la devise ou du `boursoramaSymbol` par un utilisateur tiers.

**Réponse 200** — `InstrumentDto` mis à jour.

| Code | Erreur |
|------|--------|
| 403  | Rôle insuffisant (USER tentant la modification) |
| 404  | Instrument introuvable |
| 409  | ISIN ou ticker déjà existant |

---

### PATCH `/api/instruments/{id}/stable-price`

Active ou désactive le prix fixe. Quand `true` : cours jamais marqué obsolète, saisie désactivée dans le modal.

**Rôle requis :** `ADMIN`

**Corps de la requête**

```json
{ "stablePrice": true }
```

**Réponse 200** — `InstrumentDto` mis à jour.

---

### DELETE `/api/instruments/{id}`

Supprime un instrument et toutes les positions rattachées.

**Rôle requis :** `ADMIN`

**Réponse 204**

| Code | Raison |
|------|--------|
| 404 | Instrument introuvable |

---

### GET `/api/instruments/active`

Instruments liés à au moins une position `ACTIVE`, triés par catégorie puis par nom.

**Rôle requis :** `ADMIN`

**Réponse 200** — liste de `InstrumentDto` (sans allocations).

---

### PUT `/api/instruments/prices`

Met à jour le cours de plusieurs instruments en une requête. Seuls les instruments présents dans la liste sont modifiés.

**Rôle requis :** `ADMIN`

**Corps de la requête**

```json
[
  { "instrumentId": 1, "lastPrice": 95.20 },
  { "instrumentId": 2, "lastPrice": 62500.00 }
]
```

**Réponse 200** — liste des `InstrumentDto` mis à jour (avec `lastPriceUpdatedAt` actualisé).

**Erreurs**

| Code | Raison |
|------|--------|
| 400 | `lastPrice` nul ou ≤ 0 |
| 404 | Un `instrumentId` introuvable |

---

### PUT `/api/instruments/{id}/allocations`

Remplace l'intégralité de l'allocation géographique. Toutes les lignes existantes sont supprimées avant insertion.

**Rôle requis :** `ADMIN`

**Corps de la requête**

```json
[
  { "country": "États-Unis", "percentage": 62.50 },
  { "country": "Japon",      "percentage": 6.20 }
]
```

**Réponse 200** — liste des `InstrumentAllocationDto` persistés.

> Les lignes dont `country` est vide sont ignorées.

---

### PUT `/api/instruments/{id}/sector-allocations`

Remplace l'intégralité de l'allocation sectorielle. Même comportement que `/allocations`.

**Rôle requis :** `ADMIN`

**Corps de la requête**

```json
[
  { "sector": "Technologie", "percentage": 31.00 },
  { "sector": "Santé",       "percentage": 13.50 }
]
```

**Réponse 200** — liste des `InstrumentSectorAllocationDto` persistés.

---

### POST `/api/admin/allocations/run`

Déclenche la mise à jour automatique des allocations géographiques (scraping Boursorama) pour tous les instruments BOURSE avec `stablePrice = false` et `boursoramaSymbol` renseigné.

**Rôle requis :** `ADMIN`

**Réponse 200**

```json
{ "instrumentsUpdated": 7 }
```

---

## Positions

### GET `/api/positions`

Liste les positions de l'utilisateur connecté avec les totaux calculés.

**Paramètres de requête**

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `category` | `AssetCategory` | — | Filtre par catégorie |
| `status` | `ACTIVE` \| `CLOSED` | `ACTIVE` | Filtre par statut |

**Réponse 200**

```json
[
  {
    "id": 10,
    "category": "BOURSE",
    "partner": "Courtier - PEA",
    "label": "Lyxor PEA Nasdaq-100 UCITS ETF",
    "currency": "EUR",
    "fiscalEnvelope": "PEA",
    "assetSubType": "ETF",
    "instrument": { "id": 1, "isin": "FR0010315770", "name": "Lyxor PEA Nasdaq-100 UCITS ETF", "lastPrice": 88.44 },
    "includeInIncomeProjection": false,
    "status": "ACTIVE",
    "computed": {
      "investedAmountEur": 41733.11,
      "currentValueEur": 51897.31,
      "capitalGainEur": 10164.20,
      "units": 480.000000,
      "monthlyIncomeProjectionEur": null
    }
  },
  {
    "id": 20,
    "category": "LIVRET",
    "partner": "Banque",
    "label": "Livret A",
    "currency": "EUR",
    "fiscalEnvelope": "NONE",
    "annualRate": 3.00,
    "includeInIncomeProjection": true,
    "status": "ACTIVE",
    "computed": {
      "investedAmountEur": 10219.61,
      "currentValueEur": 10219.61,
      "capitalGainEur": 0.00,
      "units": null,
      "monthlyIncomeProjectionEur": 25.55
    }
  },
  {
    "id": 30,
    "category": "LIQUIDITE",
    "label": "Compte courant",
    "currency": "EUR",
    "currentBalance": 525.79,
    "status": "ACTIVE",
    "computed": {
      "investedAmountEur": 525.79,
      "currentValueEur": 525.79,
      "capitalGainEur": 0.00
    }
  }
]
```

> Le bloc `computed` est calculé à la volée — non persisté.

---

### GET `/api/positions/{id}`

Détail d'une position avec ses ordres.

**Réponse 200** — même structure que ci-dessus, avec en supplément :

```json
{
  "orders": [
    {
      "id": 100,
      "orderType": "BUY",
      "quantity": 480.000000,
      "unitPrice": 88.44,
      "amount": 42451.20,
      "amountEur": 42451.20,
      "orderDate": "2024-03-15",
      "notes": null
    }
  ]
}
```

**Erreurs**

| Code | Raison |
|------|--------|
| 404 | Position introuvable |
| 403 | Position appartenant à un autre utilisateur |

---

### POST `/api/positions`

Créer une position.

**Corps — BOURSE**

```json
{
  "category": "BOURSE",
  "partner": "Courtier - PEA",
  "label": "ETF MSCI World",
  "currency": "EUR",
  "fiscalEnvelope": "PEA",
  "assetSubType": "ETF",
  "instrumentId": 1,
  "includeInIncomeProjection": false
}
```

**Corps — CRYPTO**

```json
{
  "category": "CRYPTO",
  "partner": "Binance",
  "label": "USDC",
  "currency": "USD",
  "instrumentId": 5,
  "includeInIncomeProjection": true
}
```

**Corps — IMMO_PAPIER**

```json
{
  "category": "IMMO_PAPIER",
  "partner": "SCPI",
  "label": "Nom du Projet",
  "currency": "EUR",
  "fiscalEnvelope": "NONE",
  "commissionRate": 10.0,
  "includeInIncomeProjection": true
}
```

**Corps — IMMO_PHYSIQUE**

```json
{
  "category": "IMMO_PHYSIQUE",
  "label": "Appartement principal",
  "currency": "EUR",
  "ownershipType": "PLEINE_PROPRIETE",
  "address": "1 Avenue de la Liberté 75001 Paris",
  "estimatedCurrentValue": 500000.00,
  "acquisitionDate": "2019-06-15",
  "acquisitionPrice": 420000.00,
  "includeInIncomeProjection": false
}
```

**Corps — LIVRET**

```json
{
  "category": "LIVRET",
  "partner": "Banque",
  "label": "Livret A",
  "currency": "EUR",
  "fiscalEnvelope": "NONE",
  "annualRate": 3.00,
  "includeInIncomeProjection": true
}
```

**Corps — LIQUIDITE**

```json
{
  "category": "LIQUIDITE",
  "label": "Compte courant",
  "currency": "EUR",
  "currentBalance": 525.79
}
```

**Réponse 201**

**Erreurs**

| Code | Raison |
|------|--------|
| 400 | Champs obligatoires manquants ou incohérents avec la catégorie |
| 404 | `instrumentId` introuvable |

---

### PUT `/api/positions/{id}`

Modifier une position. Mêmes champs que POST.

**Réponse 200**

---

### PUT `/api/positions/{id}/balance`

Mettre à jour le solde d'une position `LIQUIDITE`.

**Corps de la requête**

```json
{ "currentBalance": 612.00 }
```

**Réponse 200**

| Code | Raison |
|------|--------|
| 400 | Position non de type LIQUIDITE |

---

### PUT `/api/positions/{id}/estimated-value`

Mettre à jour la valeur estimée d'un bien `IMMO_PHYSIQUE`.

**Corps de la requête**

```json
{ "estimatedCurrentValue": 510000.00 }
```

**Réponse 200**

---

### PUT `/api/positions/{id}/close`

Fermer une position (`status → CLOSED`). La position et ses ordres restent visibles en historique.

**Réponse 200**

---

### DELETE `/api/positions/{id}`

Supprimer une position et tous ses ordres (cascade).

**Réponse 204**

---

## Ordres

### GET `/api/positions/{id}/orders`

Liste les ordres d'une position, triés par `orderDate` décroissant.

**Réponse 200**

```json
[
  {
    "id": 100,
    "orderType": "BUY",
    "quantity": 480.000000,
    "unitPrice": 88.44,
    "amount": 42451.20,
    "amountEur": 42451.20,
    "orderDate": "2024-03-15",
    "notes": null
  }
]
```

---

### POST `/api/positions/{id}/orders`

Ajouter un ordre. Non applicable à `LIQUIDITE`.

**Corps — BOURSE / CRYPTO (avec quantité)**

```json
{
  "orderType": "BUY",
  "quantity": 10.000000,
  "unitPrice": 88.44,
  "amount": 884.40,
  "orderDate": "2026-04-12",
  "notes": "Versement mensuel PEA"
}
```

**Corps — Abondement employeur (BOURSE)**

```json
{
  "orderType": "ABONDEMENT",
  "quantity": 3.000000,
  "unitPrice": 50.00,
  "amount": 150.00,
  "orderDate": "2026-06-30",
  "notes": "Abondement PEE employeur Q2"
}
```

> L'abondement n'augmente pas `investedAmountEur` — les parts reçues constituent directement de la plus-value.

**Corps — LIVRET / IMMO_PAPIER (sans quantité)**

```json
{
  "orderType": "DEPOSIT",
  "amount": 500.00,
  "orderDate": "2026-04-01"
}
```

**Types d'ordres disponibles par catégorie**

| Type | BOURSE | CRYPTO | LIVRET | IMMO_PAPIER | IMMO_PHYSIQUE |
|------|:------:|:------:|:------:|:-----------:|:-------------:|
| `BUY` | ✓ | ✓ | — | — | — |
| `SELL` | ✓ | ✓ | — | — | — |
| `DEPOSIT` | — | — | ✓ | ✓ | ✓ |
| `WITHDRAWAL` | — | — | ✓ | ✓ | ✓ |
| `INTEREST` | ✓ | ✓ | ✓ | ✓ | — |
| `DIVIDEND` | ✓ | ✓ | — | — | — |
| `AIRDROP` | — | ✓ | — | — | — |
| `ABONDEMENT` | ✓ | — | — | — | — |

**Réponse 201**

---

### PUT `/api/positions/{id}/orders/{orderId}`

Modifier un ordre. Mêmes champs que POST.

**Réponse 200**

---

### DELETE `/api/positions/{id}/orders/{orderId}`

Supprimer un ordre.

**Réponse 204**
