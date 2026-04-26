# API — Snapshots et données marché

Documentation des endpoints REST pour les relevés de patrimoine (snapshots mensuels) et la mise à jour des données marché.

L'architecture est dans [`docs/architecture/instruments.md`](../architecture/instruments.md) (scheduler) et [`docs/architecture/admin-snapshot-management.md`](../architecture/admin-snapshot-management.md) (gestion admin).

---

## Taux de change

> Documentation complète des endpoints : [`docs/api/exchange-rates.md`](exchange-rates.md)

| Méthode | URL | Rôle | Description |
|---------|-----|------|-------------|
| `GET` | `/api/exchange-rates` | ADMIN | Liste tous les taux configurés, triés par devise |
| `PUT` | `/api/exchange-rates` | ADMIN | Mise à jour groupée (upsert par devise) |

---

## Snapshots utilisateur

### GET `/api/portfolio/snapshots`

Liste les snapshots mensuels de l'utilisateur connecté, triés par date décroissante.

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

Détail d'un snapshot avec tous les `PositionSnapshot`.

**Réponse 200**

```json
{
  "id": 5,
  "snapshotDate": "2026-04-01",
  "totalInvestedEur": 86668.46,
  "totalCurrentValueEur": 221050.03,
  "totalCapitalGainEur": 134381.57,
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

> `investedAmountEur` et `capitalGainEur` sont nullables — un snapshot peut ne contenir que `currentValueEur` si les données d'investissement n'ont pas été saisies.

---

### POST `/api/portfolio/snapshots`

Déclencher manuellement un snapshot pour la date du jour (ou une date passée).

**Corps de la requête**

```json
{ "snapshotDate": "2026-04-12" }
```

> Si un snapshot existe déjà pour ce mois (`snapshotDate` même année/mois), retourne 409.

**Réponse 201** — snapshot créé.

**Erreurs**

| Code | Raison |
|------|--------|
| 409 | Snapshot déjà existant pour ce mois |

---

### POST `/api/portfolio/snapshots/all`

Génère un snapshot pour **tous les utilisateurs** à la date indiquée. Les utilisateurs déjà couverts pour ce mois sont ignorés.

**Rôle requis :** `ADMIN`

**Corps de la requête**

```json
{ "snapshotDate": "2026-04-01" }
```

**Réponse 201**

```json
{
  "created": 3,
  "skipped": 1,
  "failed": 0
}
```

| Champ | Description |
|-------|-------------|
| `created` | Snapshots créés avec succès |
| `skipped` | Utilisateurs déjà couverts pour ce mois |
| `failed` | Erreurs rencontrées |

---

### PUT `/api/portfolio/snapshots/{id}/recalculate`

Recalculer un snapshot existant avec les données actuelles (prix marché + ordres).

**Réponse 200** — snapshot mis à jour.

---

## Données marché (admin)

### POST `/api/admin/market-data/run`

Déclenche la mise à jour complète des données marché de façon **synchrone** : résolution des IDs CoinGecko, cours Boursorama (BOURSE) et CoinGecko (CRYPTO), taux ECB, puis snapshot mensuel pour tous les utilisateurs.

**Rôle requis :** `ADMIN`

**Réponse 200**

```json
{
  "instrumentsResolved": 1,
  "instrumentsUpdated": 8,
  "instrumentsFailed": 0,
  "ratesUpdated": 5,
  "snapshotsCreated": 2,
  "snapshotsSkipped": 0,
  "snapshotsFailed": 0,
  "errors": [],
  "executedAt": "2026-04-01T02:00:00"
}
```

| Champ | Description |
|-------|-------------|
| `instrumentsResolved` | IDs CoinGecko résolus automatiquement |
| `instrumentsUpdated` | Cours mis à jour avec succès |
| `instrumentsFailed` | Cours en échec (API indisponible ou sélecteur absent) |
| `ratesUpdated` | Taux de change mis à jour |
| `snapshotsCreated` | Snapshots patrimoniaux créés |
| `snapshotsSkipped` | Snapshots ignorés (déjà existants) |
| `snapshotsFailed` | Snapshots en échec |
| `errors` | Messages d'erreurs non bloquantes |
| `executedAt` | Horodatage de démarrage |

---

## Gestion admin des relevés

> Documentation complète : [`docs/api/admin-snapshots.md`](admin-snapshots.md)

| Méthode | URL | Rôle | Description |
|---------|-----|------|-------------|
| `GET` | `/api/admin/snapshots?userId={id}` | ADMIN | Liste les snapshots d'un utilisateur |
| `GET` | `/api/admin/snapshots/{id}` | ADMIN | Détail complet d'un snapshot |
| `POST` | `/api/admin/snapshots` | ADMIN | Créer manuellement un snapshot |
| `PUT` | `/api/admin/snapshots/{id}` | ADMIN | Modifier un snapshot existant |
| `DELETE` | `/api/admin/snapshots/{id}` | ADMIN | Supprimer un snapshot |
| `GET` | `/api/admin/users/{userId}/positions` | ADMIN | Positions actives d'un utilisateur |
