# API — Taux de change

> **Rôle requis pour tous les endpoints de cette section :** `ADMIN`

---

## `GET /api/exchange-rates`

Retourne la liste de tous les taux de change configurés, triés par code devise (ordre alphabétique).

### Réponse `200 OK`

```json
[
  {
    "id": 2,
    "currency": "GBP",
    "rate": 0.86,
    "lastUpdatedAt": "2026-04-15T10:00:00"
  },
  {
    "id": 1,
    "currency": "USD",
    "rate": 1.08,
    "lastUpdatedAt": "2026-04-15T10:00:00"
  }
]
```

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `Long` | Identifiant interne |
| `currency` | `String` | Code ISO 4217 de la devise (ex : `USD`, `GBP`, `CHF`) |
| `rate` | `BigDecimal` | Nombre d'unités de la devise pour 1 EUR |
| `lastUpdatedAt` | `LocalDateTime` ou `null` | Date de la dernière mise à jour — `null` si jamais actualisé |

> **Convention :** `rate = 1.08` pour `USD` signifie **1 EUR = 1,08 USD**.

---

## `PUT /api/exchange-rates`

Met à jour ou crée des taux de change en une seule requête (**upsert par code devise**).

- Si la devise existe déjà en base → son `rate` est mis à jour
- Si la devise est absente → un nouvel enregistrement est créé
- Les devises absentes de la liste soumise ne sont **pas modifiées**

### Corps de la requête

Liste de `UpdateExchangeRateRequest` :

```json
[
  { "currency": "USD", "rate": 1.10 },
  { "currency": "GBP", "rate": 0.88 },
  { "currency": "CHF", "rate": 0.96 }
]
```

| Champ | Type | Contrainte |
|-------|------|------------|
| `currency` | `String` | Obligatoire, non vide |
| `rate` | `BigDecimal` | Obligatoire, strictement positif (`> 0`) |

### Réponse `200 OK`

Liste des `ExchangeRateDto` correspondant aux devises créées ou mises à jour (même format que `GET`).

```json
[
  {
    "id": 1,
    "currency": "USD",
    "rate": 1.10,
    "lastUpdatedAt": "2026-04-15T14:32:00"
  }
]
```

### Erreurs possibles

| Code HTTP | Cas |
|-----------|-----|
| `400 BAD_REQUEST` | `currency` est vide ou nul |
| `400 BAD_REQUEST` | `rate` est nul, nul ou ≤ 0 |
| `401 UNAUTHORIZED` | Utilisateur non authentifié |
| `403 FORBIDDEN` | Utilisateur authentifié mais rôle `USER` (non `ADMIN`) |
