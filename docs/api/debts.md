# API — Dettes

Préfixe : `/api/debts`
Authentification : session cookie `JSESSIONID` obligatoire.
Toutes les opérations sont restreintes aux dettes de l'utilisateur connecté (sauf ADMIN qui peut accéder à toutes).

---

## GET /api/debts

Liste toutes les dettes de l'utilisateur connecté, triées par type puis par libellé.

**Réponse 200**

```json
[
  {
    "id": 1,
    "type": "IMMOBILIER",
    "label": "Crédit BNP appartement Paris",
    "lender": "BNP Paribas",
    "startDate": "2021-06-01",
    "endDate": "2051-06-01",
    "initialCapital": 200000.00,
    "annualRate": 0.0325,
    "insuranceRate": 0.0035,
    "monthlyPayment": 870.00,
    "remainingCapitalOverride": null,
    "currency": "EUR",
    "positionId": 12,
    "remainingCapital": 184532.17,
    "projectionMode": true,
    "monthlyInsurance": 58.33,
    "monthlyTotal": 928.33,
    "progressPercent": 7.73,
    "nextMonthsSchedule": [
      { "month": "2026-05", "payment": 870.00, "interest": 498.50, "capital": 371.50, "remainingCapital": 184160.67 },
      { "month": "2026-06", "payment": 870.00, "interest": 497.49, "capital": 372.51, "remainingCapital": 183788.16 }
    ],
    "createdAt": "2026-04-01T09:00:00"
  }
]
```

**Champs calculés :**
- `remainingCapital` : si `remainingCapitalOverride` est défini, utilise cette valeur ; sinon calcule par la formule d'amortissement `B(n) = P*(1+r)^n − M*((1+r)^n − 1)/r` où `n` = mois écoulés depuis `startDate`.
- `projectionMode` : `true` si le capital restant est calculé automatiquement (projection), `false` si c'est une valeur saisie manuellement (`remainingCapitalOverride` non null).
- `monthlyInsurance` : `initialCapital × insuranceRate / 12`.
- `monthlyTotal` : `monthlyPayment + monthlyInsurance`.
- `repaymentProgress` : `(1 − remainingCapital / initialCapital) × 100`.
- `nextMonthsSchedule` : tableau d'amortissement des 12 prochains mois.

---

## GET /api/debts/{id}

Détail d'une dette (même structure que la liste).

**Réponses**
- `200` — dette trouvée
- `403` — n'appartient pas à l'utilisateur connecté
- `404` — introuvable

---

## GET /api/debts/summary

Synthèse globale des dettes : totaux et répartition par type.

**Réponse 200**

```json
{
  "totalCount": 3,
  "totalRemainingCapital": 254000.00,
  "totalMonthlyPayment": 1640.00,
  "totalMonthlyInsurance": 98.50,
  "totalMonthlyCost": 1738.50,
  "byType": [
    {
      "type": "IMMOBILIER",
      "count": 1,
      "totalRemainingCapital": 184532.17,
      "totalMonthlyPayment": 870.00,
      "totalMonthlyInsurance": 58.33
    },
    {
      "type": "VEHICULE",
      "count": 1,
      "totalRemainingCapital": 12000.00,
      "totalMonthlyPayment": 450.00,
      "totalMonthlyInsurance": 10.50
    }
  ]
}
```

---

## POST /api/debts

Crée une nouvelle dette.

**Corps de la requête**

```json
{
  "type": "IMMOBILIER",
  "label": "Crédit BNP appartement Paris",
  "lender": "BNP Paribas",
  "startDate": "2021-06-01",
  "endDate": "2051-06-01",
  "initialCapital": 200000.00,
  "annualRate": 0.0325,
  "insuranceRate": 0.0035,
  "monthlyPayment": 870.00,
  "remainingCapitalOverride": null,
  "currency": "EUR",
  "positionId": 12
}
```

| Champ | Requis | Description |
|-------|--------|-------------|
| `type` | Oui | `IMMOBILIER`, `ETUDIANT`, `VEHICULE`, `CONSOMMATION`, `AUTRE` |
| `label` | Oui | Libellé libre |
| `lender` | Non | Établissement prêteur |
| `startDate` | Non | Date de début du prêt |
| `endDate` | Non | Date de fin théorique |
| `initialCapital` | Oui | Capital initial emprunté (> 0) |
| `annualRate` | Oui | Taux d'intérêt annuel en décimal (ex : `0.0325` pour 3,25 %) |
| `insuranceRate` | Non | Taux assurance emprunteur annuel en décimal |
| `monthlyPayment` | Non | Mensualité hors assurance |
| `remainingCapitalOverride` | Non | Capital restant dû saisi manuellement — désactive la projection automatique |
| `currency` | Non | Code ISO 3 lettres (défaut : `EUR`) |
| `positionId` | Non | ID d'une position `IMMO_PHYSIQUE` liée (uniquement pour type `IMMOBILIER`) |

**Réponses**
- `201 Created` — dette créée (corps : `DebtDto`)
- `400` — champs obligatoires manquants ou invalides

---

## PUT /api/debts/{id}

Modifie une dette existante. Corps identique à `POST /api/debts`.

**Réponses**
- `200` — dette mise à jour
- `400` — données invalides
- `403` — n'appartient pas à l'utilisateur connecté
- `404` — introuvable

---

## DELETE /api/debts/{id}

Supprime une dette et tout son historique de mises à jour manuelles (cascade).

**Réponses**
- `204 No Content` — suppression réussie
- `403` — n'appartient pas à l'utilisateur connecté
- `404` — introuvable

---

## GET /api/debts/{id}/balance-entries

Retourne l'historique des mises à jour manuelles du capital restant dû, triées par date décroissante.

**Réponse 200**

```json
[
  {
    "id": 3,
    "entryDate": "2026-04-01",
    "balance": 183200.00,
    "note": "Relevé bancaire avril 2026",
    "createdAt": "2026-04-05T18:30:00"
  },
  {
    "id": 1,
    "entryDate": "2026-01-01",
    "balance": 185500.00,
    "note": "Relevé bancaire janvier 2026",
    "createdAt": "2026-01-06T09:12:00"
  }
]
```

---

## POST /api/debts/{id}/balance-entries

Ajoute une mise à jour manuelle du capital restant dû. Après l'ajout, `remainingCapitalOverride` de la dette est automatiquement mis à jour avec la valeur de l'entrée la plus récente (par date).

**Corps de la requête**

```json
{
  "entryDate": "2026-04-01",
  "balance": 183200.00,
  "note": "Relevé bancaire avril 2026"
}
```

| Champ | Requis | Description |
|-------|--------|-------------|
| `entryDate` | Oui | Date du relevé |
| `balance` | Oui | Capital restant dû (≥ 0) |
| `note` | Non | Commentaire libre |

**Réponses**
- `201 Created` — entrée créée (corps : `DebtBalanceEntryDto`)
- `400` — données invalides
- `403` — n'appartient pas à l'utilisateur connecté
- `404` — dette introuvable

---

## DELETE /api/debts/{id}/balance-entries/{entryId}

Supprime une entrée d'historique. Après la suppression, `remainingCapitalOverride` est recalculé depuis l'entrée la plus récente restante. Si l'historique est vide après suppression, `remainingCapitalOverride` repasse à `null` (mode projection automatique).

**Réponses**
- `204 No Content` — suppression réussie
- `403` — la dette n'appartient pas à l'utilisateur connecté
- `404` — dette ou entrée introuvable
