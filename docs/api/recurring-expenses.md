# API — Dépenses récurrentes

Base URL : `http://localhost:8080`

Swagger UI interactif disponible sur : `http://localhost:8080/swagger-ui.html`

Tous les endpoints nécessitent d'être **authentifié** (cookie `JSESSIONID`).
Chaque utilisateur ne peut accéder qu'à **ses propres dépenses**.

---

## GET /api/recurring-expenses

Retourne la liste des dépenses récurrentes de l'utilisateur connecté, triées par catégorie puis par libellé.
Les champs `monthlyAmount` et `annualAmount` sont calculés à la volée (non persistés).

**Accès** : authentifié

```http
GET /api/recurring-expenses
```

### Réponse — 200 OK

```json
[
  {
    "id": 1,
    "category": "LOGEMENT",
    "label": "Loyer Paris 11e",
    "amount": 1000.0,
    "frequency": "MONTHLY",
    "sharePercentage": 50.0,
    "monthlyAmount": 500.0,
    "annualAmount": 6000.0,
    "startDate": "2024-01-01",
    "endDate": null,
    "notes": "Colocation avec Thomas"
  },
  {
    "id": 2,
    "category": "ASSURANCES",
    "label": "Assurance auto",
    "amount": 600.0,
    "frequency": "ANNUAL",
    "sharePercentage": 100.0,
    "monthlyAmount": 50.0,
    "annualAmount": 600.0,
    "startDate": null,
    "endDate": null,
    "notes": null
  }
]
```

---

## GET /api/recurring-expenses/summary

Retourne la synthèse des dépenses actives et la capacité d'épargne calculée.

Une dépense est considérée **active** si `endDate` est `null` ou dans le futur.

Le revenu mensuel de référence est issu du contrat salarial actif (`endDate = null`) :
- `NET_AFTER_TAX` si le profil fiscal est complet
- `NET_IMPOSABLE` en fallback si le profil fiscal est incomplet
- `NONE` si aucun contrat actif n'existe

**Accès** : authentifié

```http
GET /api/recurring-expenses/summary
```

### Réponse — 200 OK

```json
{
  "monthlyNetIncome": 3200.0,
  "incomeSource": "NET_AFTER_TAX",
  "totalMonthlyExpenses": 1850.0,
  "totalAnnualExpenses": 22200.0,
  "savingsCapacity": 1350.0,
  "savingsRate": 42.19,
  "byCategory": [
    { "category": "LOGEMENT",     "monthlyAmount": 800.0,  "annualAmount": 9600.0  },
    { "category": "TRANSPORT",    "monthlyAmount": 350.0,  "annualAmount": 4200.0  },
    { "category": "ABONNEMENTS",  "monthlyAmount": 150.0,  "annualAmount": 1800.0  },
    { "category": "ALIMENTATION", "monthlyAmount": 300.0,  "annualAmount": 3600.0  },
    { "category": "ASSURANCES",   "monthlyAmount": 100.0,  "annualAmount": 1200.0  },
    { "category": "EPARGNE",      "monthlyAmount": 150.0,  "annualAmount": 1800.0  }
  ]
}
```

| Champ | Description |
|-------|-------------|
| `monthlyNetIncome` | Revenu net mensuel de référence (`null` si aucun contrat actif) |
| `incomeSource` | `NET_AFTER_TAX` · `NET_IMPOSABLE` · `NONE` |
| `totalMonthlyExpenses` | Somme des `monthlyAmount` des dépenses actives |
| `totalAnnualExpenses` | Projection annuelle totale |
| `savingsCapacity` | `monthlyNetIncome − totalMonthlyExpenses` (0 si pas de revenu) |
| `savingsRate` | `savingsCapacity / monthlyNetIncome × 100` (`null` si pas de revenu) |
| `byCategory` | Agrégat mensuel et annuel par catégorie (uniquement les catégories présentes) |

---

## POST /api/recurring-expenses

Crée une nouvelle dépense récurrente.

**Accès** : authentifié

```http
POST /api/recurring-expenses
Content-Type: application/json
```

### Corps de la requête

```json
{
  "category": "LOGEMENT",
  "label": "Loyer Paris 11e",
  "amount": 1000.0,
  "frequency": "MONTHLY",
  "sharePercentage": 50.0,
  "startDate": "2024-01-01",
  "endDate": null,
  "notes": "Colocation avec Thomas"
}
```

| Champ | Type | Obligatoire | Contraintes |
|-------|------|-------------|-------------|
| `category` | `ExpenseCategoryEnum` | ✓ | `LOGEMENT` `TRANSPORT` `ASSURANCES` `ABONNEMENTS` `SANTE` `FAMILLE` `ALIMENTATION` `EPARGNE` `AUTRE` |
| `label` | `String` | ✓ | Non vide |
| `amount` | `Float` | ✓ | > 0 |
| `frequency` | `FrequencyEnum` | ✓ | `MONTHLY` `ANNUAL` |
| `sharePercentage` | `Float` | ✓ | Entre 0.01 et 100.0 |
| `startDate` | `LocalDate` | — | Format `YYYY-MM-DD` |
| `endDate` | `LocalDate` | — | Format `YYYY-MM-DD` |
| `notes` | `String` | — | Max 500 caractères |

### Réponses

**201 Created** — dépense créée (même format que GET)

**400 Bad Request** — validation échouée (montant négatif, label vide, sharePercentage hors limites…)

**401 Unauthorized** — non authentifié

---

## PUT /api/recurring-expenses/{id}

Modifie une dépense existante. Corps identique au POST.

**Accès** : propriétaire de la dépense ou ADMIN

```http
PUT /api/recurring-expenses/{id}
Content-Type: application/json
```

### Réponses

**200 OK** — dépense modifiée

**400 Bad Request** — validation échouée

**403 Forbidden** — l'utilisateur n'est pas propriétaire

**404 Not Found** — dépense introuvable

---

## DELETE /api/recurring-expenses/{id}

Supprime une dépense récurrente.

**Accès** : propriétaire de la dépense ou ADMIN

```http
DELETE /api/recurring-expenses/{id}
```

### Réponses

**204 No Content** — suppression effectuée

**403 Forbidden** — l'utilisateur n'est pas propriétaire

**404 Not Found** — dépense introuvable
