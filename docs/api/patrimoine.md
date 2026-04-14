# API — Gestion du patrimoine

Documentation des endpoints REST pour la gestion des positions, ordres, instruments et snapshots.

La documentation de l'architecture (modèle de données, règles de calcul, diagramme de classes) est dans [`docs/architecture/patrimoine.md`](../architecture/patrimoine.md).

---

## Instruments

### GET `/api/instruments`

Liste les instruments du référentiel. Supporte la recherche par ISIN ou ticker.

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
    "lastPriceUpdatedAt": "2026-04-01T08:00:00"
  },
  {
    "id": 2,
    "category": "CRYPTO",
    "isin": null,
    "ticker": "ETH",
    "name": "Ethereum",
    "currency": "USD",
    "lastPrice": 1890.79,
    "lastPriceUpdatedAt": "2026-04-01T08:05:00"
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
  "ticker": null,
  "name": "Amundi PEA MSCI Europe UCITS ETF",
  "currency": "EUR"
}
```

**Règles de validation**
- `category` obligatoire
- `isin` obligatoire si `category = BOURSE`, doit être unique
- `ticker` obligatoire si `category = CRYPTO`, doit être unique
- `name` obligatoire

**Réponse 201** — instrument créé avec `lastPrice = null`.

**Erreurs**

| Code | Raison |
|------|--------|
| 409 | ISIN ou ticker déjà existant |

---

### PUT `/api/instruments/{id}`

Modifier les informations d'un instrument (hors `lastPrice` qui est géré par le scheduler).

**Corps de la requête** — mêmes champs que POST.

**Réponse 200**

---

### POST `/api/instruments/{id}/refresh-price`

Forcer la mise à jour du prix depuis l'API marché (Yahoo Finance pour BOURSE, CoinGecko pour CRYPTO).

**Réponse 200**

```json
{
  "id": 1,
  "lastPrice": 89.12,
  "lastPriceUpdatedAt": "2026-04-12T14:23:00"
}
```

**Erreurs**

| Code | Raison |
|------|--------|
| 404 | Instrument introuvable |
| 503 | API marché indisponible |

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
    "partner": "SaxoBank - PEA",
    "label": "Lyxor PEA Nasdaq-100 UCITS ETF",
    "currency": "EUR",
    "fiscalEnvelope": "PEA",
    "assetSubType": "ETF",
    "instrument": {
      "id": 1,
      "isin": "FR0010315770",
      "name": "Lyxor PEA Nasdaq-100 UCITS ETF",
      "lastPrice": 88.44
    },
    "includeInIncomeProjection": false,
    "status": "ACTIVE",
    "computed": {
      "investedAmountEur": 0.00,
      "currentValueEur": 0.00,
      "capitalGainEur": 0.00,
      "units": 0.000000,
      "monthlyIncomeProjectionEur": null
    }
  },
  {
    "id": 20,
    "category": "LIVRET",
    "partner": "BNP Parisbas",
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
    "partner": "Swile",
    "label": "Ticket Restaurant",
    "currency": "EUR",
    "currentBalance": 525.79,
    "status": "ACTIVE",
    "computed": {
      "investedAmountEur": 525.79,
      "currentValueEur": 525.79,
      "capitalGainEur": 0.00,
      "units": null,
      "monthlyIncomeProjectionEur": null
    }
  }
]
```

> Le bloc `computed` est calculé à la volée — non persisté.

---

### GET `/api/positions/{id}`

Détail d'une position avec ses ordres et les totaux calculés.

**Réponse 200** — même structure que ci-dessus, avec en supplément :

```json
{
  "orders": [
    {
      "id": 100,
      "orderType": "BUY",
      "quantity": 480.000000,
      "unitPrice": 88.44,
      "amount": 0.00,
      "amountEur": 0.00,
      "exchangeRate": null,
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

**Corps de la requête — BOURSE**

```json
{
  "category": "BOURSE",
  "partner": "SaxoBank - PEA",
  "label": "Lyxor PEA Nasdaq-100 UCITS ETF",
  "currency": "EUR",
  "fiscalEnvelope": "PEA",
  "assetSubType": "ETF",
  "instrumentId": 1,
  "includeInIncomeProjection": false
}
```

**Corps de la requête — CRYPTO**

```json
{
  "category": "CRYPTO",
  "partner": "Binance",
  "label": "Earn USDC",
  "currency": "USD",
  "instrumentId": 5,
  "includeInIncomeProjection": true
}
```

**Corps de la requête — IMMO_PAPIER**

```json
{
  "category": "IMMO_PAPIER",
  "partner": "Housers",
  "label": "TORRES DE PATERNA",
  "currency": "EUR",
  "fiscalEnvelope": "NONE",
  "commissionRate": 10.0,
  "includeInIncomeProjection": true
}
```

**Corps de la requête — IMMO_PHYSIQUE**

```json
{
  "category": "IMMO_PHYSIQUE",
  "label": "6 Rue edouard Branly 49300 CHOLET",
  "currency": "EUR",
  "ownershipType": "NUE_PROPRIETE",
  "address": "6 Rue edouard Branly 49300 CHOLET",
  "estimatedCurrentValue": 115000.00,
  "includeInIncomeProjection": false
}
```

**Corps de la requête — LIVRET**

```json
{
  "category": "LIVRET",
  "partner": "BNP Parisbas",
  "label": "Livret A",
  "currency": "EUR",
  "fiscalEnvelope": "NONE",
  "annualRate": 3.00,
  "includeInIncomeProjection": true
}
```

**Corps de la requête — LIQUIDITE**

```json
{
  "category": "LIQUIDITE",
  "partner": "Swile",
  "label": "Ticket Restaurant",
  "currency": "EUR",
  "currentBalance": 525.79
}
```

**Réponse 201** — position créée.

**Erreurs**

| Code | Raison |
|------|--------|
| 400 | Champs obligatoires manquants ou incohérents avec la catégorie |
| 404 | `instrumentId` introuvable |

---

### PUT `/api/positions/{id}`

Modifier les informations d'une position. Mêmes champs que POST.

**Réponse 200**

---

### PUT `/api/positions/{id}/balance`

Mettre à jour le solde d'une position `LIQUIDITE`. Non applicable aux autres catégories.

**Corps de la requête**

```json
{
  "currentBalance": 612.00
}
```

**Réponse 200**

**Erreurs**

| Code | Raison |
|------|--------|
| 400 | Position non de type LIQUIDITE |

---

### PUT `/api/positions/{id}/estimated-value`

Mettre à jour la valeur estimée d'un bien `IMMO_PHYSIQUE`. Non applicable aux autres catégories.

**Corps de la requête**

```json
{
  "estimatedCurrentValue": 120000.00
}
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
    "exchangeRate": null,
    "orderDate": "2024-03-15",
    "notes": null
  }
]
```

---

### POST `/api/positions/{id}/orders`

Ajouter un ordre sur une position.

> Non applicable à la catégorie `LIQUIDITE`.

**Corps de la requête — BOURSE / CRYPTO (avec quantité)**

```json
{
  "orderType": "BUY",
  "quantity": 10.000000,
  "unitPrice": 88.44,
  "amount": 884.40,
  "currency": "EUR",
  "exchangeRate": null,
  "orderDate": "2026-04-12",
  "notes": "Versement mensuel PEA"
}
```

**Corps de la requête — LIVRET / IMMO_PAPIER (sans quantité)**

```json
{
  "orderType": "DEPOSIT",
  "quantity": null,
  "unitPrice": null,
  "amount": 500.00,
  "currency": "EUR",
  "exchangeRate": null,
  "orderDate": "2026-04-01"
}
```

**Corps de la requête — avec devise étrangère**

```json
{
  "orderType": "BUY",
  "quantity": 0.05,
  "unitPrice": 59916.82,
  "amount": 2995.84,
  "currency": "USD",
  "exchangeRate": 1.085,
  "orderDate": "2026-04-12"
}
```

> `amountEur` est calculé côté backend : `amount / exchangeRate`.

**Règles de validation**
- `orderType` obligatoire
- `quantity` et `unitPrice` obligatoires pour BOURSE et CRYPTO
- `amount` obligatoire
- `orderDate` obligatoire
- `LIQUIDITE` → 400 systématique

**Réponse 201**

---

### PUT `/api/positions/{id}/orders/{orderId}`

Modifier un ordre. Mêmes champs que POST.

**Réponse 200**

---

### DELETE `/api/positions/{id}/orders/{orderId}`

Supprimer un ordre.

**Réponse 204**

---

## Snapshots

### GET `/api/portfolio/snapshots`

Liste les snapshots mensuels de l'utilisateur, triés par date décroissante.

**Réponse 200**

```json
[
  {
    "id": 5,
    "snapshotDate": "2026-04-01",
    "totalInvestedEur": 86668.46,
    "totalCurrentValueEur": 221050.03,
    "totalCapitalGainEur": 134381.57
  },
  {
    "id": 4,
    "snapshotDate": "2026-03-01",
    "totalInvestedEur": 85100.00,
    "totalCurrentValueEur": 218300.00,
    "totalCapitalGainEur": 133200.00
  }
]
```

---

### GET `/api/portfolio/snapshots/{id}`

Détail d'un snapshot avec la liste de tous les `PositionSnapshot`.

**Réponse 200**

```json
{
  "id": 5,
  "snapshotDate": "2026-04-01",
  "totalInvestedEur": 86668.46,
  "totalCurrentValueEur": 221050.03,
  "totalCapitalGainEur": 134381.57,
  "exchangeRatesJson": "{\"USD\":1.085,\"GBP\":0.856}",
  "positionSnapshots": [
    {
      "id": 50,
      "position": { "id": 10, "label": "Lyxor PEA Nasdaq-100 UCITS ETF", "category": "BOURSE" },
      "investedAmountEur": 41733.11,
      "currentValueEur": 51897.31,
      "capitalGainEur": 10164.20,
      "units": 480.000000,
      "unitPriceEur": 108.12
    }
  ]
}
```

---

### POST `/api/portfolio/snapshots`

Déclencher manuellement un snapshot pour la date du jour (ou une date passée).

**Corps de la requête**

```json
{
  "snapshotDate": "2026-04-12"
}
```

> Si un snapshot existe déjà pour ce mois (`snapshotDate` même année/mois), retourne 409.

**Réponse 201**

**Erreurs**

| Code | Raison |
|------|--------|
| 409 | Snapshot déjà existant pour ce mois |

---

### PUT `/api/portfolio/snapshots/{id}/recalculate`

Recalculer un snapshot existant avec les données actuelles (prix marché + ordres).

**Réponse 200** — snapshot mis à jour.

---

## Droits d'accès

| Action | Rôle requis |
|--------|-------------|
| Gérer ses positions et ordres | USER, ADMIN |
| Consulter / déclencher ses snapshots | USER, ADMIN |
| Gérer le référentiel d'instruments | USER, ADMIN |
| Consulter les données d'un autre utilisateur | ADMIN uniquement |
