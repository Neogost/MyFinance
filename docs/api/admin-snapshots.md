# API — Gestion admin des relevés de patrimoine

Documentation des endpoints REST réservés à l'administrateur pour créer, modifier et supprimer manuellement les relevés de patrimoine (`PortfolioSnapshot`) de n'importe quel utilisateur.

La documentation de l'architecture (flux, règles métier, fichiers concernés) est dans [`docs/architecture/admin-snapshot-management.md`](../architecture/admin-snapshot-management.md).

---

## GET `/api/admin/snapshots?userId={id}`

Liste tous les snapshots d'un utilisateur, triés par date décroissante. Retourne une version résumée (sans détail des positions).

**Paramètres de requête**

| Paramètre | Type | Description |
|-----------|------|-------------|
| `userId` | `Long` | Identifiant de l'utilisateur (obligatoire) |

**Rôle requis :** `ADMIN`

**Réponse 200**

```json
[
  {
    "id": 12,
    "snapshotDate": "2026-04-01",
    "totalInvestedEur": 35000.00,
    "totalCurrentValueEur": 37200.00,
    "totalCapitalGainEur": 2200.00,
    "userId": 3,
    "userFullName": "Alice Dupont",
    "positions": null
  }
]
```

**Erreurs**

| Code | Raison |
|------|--------|
| 404 | Utilisateur introuvable |

---

## GET `/api/admin/snapshots/{id}`

Détail complet d'un snapshot avec la liste de toutes les `PositionSnapshot`.

**Rôle requis :** `ADMIN`

**Réponse 200**

```json
{
  "id": 12,
  "snapshotDate": "2026-04-01",
  "totalInvestedEur": 35000.00,
  "totalCurrentValueEur": 37200.00,
  "totalCapitalGainEur": 2200.00,
  "userId": 3,
  "userFullName": "Alice Dupont",
  "positions": [
    {
      "id": 45,
      "positionId": 10,
      "positionLabel": "Livret A",
      "positionPartner": "BNP Parisbas",
      "positionCategory": "LIVRET",
      "investedAmountEur": 10000.00,
      "currentValueEur": 10000.00,
      "capitalGainEur": 0.00,
      "units": null,
      "unitPriceEur": null
    }
  ]
}
```

---

## POST `/api/admin/snapshots`

Crée manuellement un snapshot pour un utilisateur à une date donnée.

**Rôle requis :** `ADMIN`

**Corps de la requête**

```json
{
  "userId": 3,
  "snapshotDate": "2026-04-01",
  "positions": [
    {
      "positionId": 10,
      "investedAmountEur": 10000.00,
      "currentValueEur": 10000.00,
      "units": null,
      "unitPriceEur": null
    },
    {
      "positionId": 11,
      "investedAmountEur": 25000.00,
      "currentValueEur": 27200.00,
      "units": 250.5,
      "unitPriceEur": 108.60
    }
  ]
}
```

> Les totaux du portfolio (`totalInvestedEur`, `totalCurrentValueEur`, `totalCapitalGainEur`) sont calculés automatiquement côté serveur.
>
> `capitalGainEur` de chaque position est calculé automatiquement : `currentValueEur − investedAmountEur`.
>
> Si un snapshot existe déjà pour le même mois, retourne 409.

**Réponse 201** — snapshot créé avec les totaux calculés.

**Erreurs**

| Code | Raison |
|------|--------|
| 400 | Une `positionId` n'appartient pas à l'utilisateur cible |
| 404 | Utilisateur introuvable |
| 409 | Un snapshot existe déjà pour ce mois |

---

## PUT `/api/admin/snapshots/{id}`

Met à jour un snapshot existant. Toutes les `PositionSnapshot` sont remplacées par les nouvelles valeurs.

**Rôle requis :** `ADMIN`

**Corps de la requête** — même structure que `POST /api/admin/snapshots`.

> Le `userId` dans le corps doit correspondre à l'utilisateur du snapshot existant.

**Réponse 200** — snapshot mis à jour.

**Erreurs**

| Code | Raison |
|------|--------|
| 400 | `userId` du corps ne correspond pas au snapshot / position hors périmètre |
| 404 | Snapshot introuvable |
| 409 | Conflit de mois avec un autre snapshot existant |

---

## DELETE `/api/admin/snapshots/{id}`

Supprime un snapshot et toutes ses `PositionSnapshot` (cascade).

**Rôle requis :** `ADMIN`

**Réponse 204** — aucun corps.

**Erreurs**

| Code | Raison |
|------|--------|
| 404 | Snapshot introuvable |

---

## GET `/api/admin/users/{userId}/positions`

Liste les positions **actives** d'un utilisateur. Utilisé par le frontend pour alimenter le formulaire de saisie manuelle.

**Rôle requis :** `ADMIN`

**Réponse 200**

```json
[
  {
    "id": 10,
    "label": "Livret A",
    "partner": "BNP Parisbas",
    "category": "LIVRET"
  },
  {
    "id": 11,
    "label": "Lyxor PEA Nasdaq-100",
    "partner": "SaxoBank",
    "category": "BOURSE"
  }
]
```

**Erreurs**

| Code | Raison |
|------|--------|
| 404 | Utilisateur introuvable |

---

## Droits d'accès

| Action | Rôle requis |
|--------|-------------|
| Tous les endpoints `/api/admin/**` | `ADMIN` uniquement |
