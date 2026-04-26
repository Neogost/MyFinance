# Scoring Patrimonial

## Vue d'ensemble

Le scoring patrimonial est un indicateur synthétique affiché sur le **tableau de bord** sous forme de widget card, cohérent avec les autres widgets existants (`SafetyNetWidget`, `FireProjectionWidget`, `DetteWidget`).

Il évalue la cohérence et la solidité du patrimoine sur une échelle de 0 à 105 points (100 + 5 bonus) et attribue un profil qualitatif à l'utilisateur.

---

## Emplacement UI

Widget dédié `PatrimoineScoreWidget` sur `DashboardPage`, au même niveau que les autres widgets financiers.

### Structure de la card

```
┌─────────────────────────────────────────────┐
│  Score Patrimonial              ⚖️ Équilibré │
│  ━━━━━━━━━━━━━━━━━━━━░░░░░  63 / 100        │
│                                              │
│  Diversification      ████████░░  13/20     │
│  Matelas sécurité     ██████████  15/15     │
│  Endettement          ███████░░░  14/20     │
│  Capacité épargne     ████░░░░░░   8/20     │
│  Cohérence âge/risque ██████░░░░  10/15     │
│  Progression          ███░░░░░░░   3/10     │
│                                              │
│  💡 Votre taux d'épargne peut être amélioré │
└─────────────────────────────────────────────┘
```

- Chaque axe affiche une barre de progression + score partiel
- Une ligne de conseil met en avant **le point faible principal**
- Mention **"Profil FIRE"** affichée si horizon FIRE ≤ 15 ans

---

## Calcul du score

### Axe 1 — Diversification (20 pts)

**Source de données :** positions actives (`/api/positions`) + `PatrimoineTarget`

| Condition | Points |
|-----------|--------|
| ≥ 4 catégories représentées | +8 |
| Aucune catégorie > 60% du total | +7 |
| Allocation cohérente avec les objectifs (`PatrimoineTarget`) | +5 |

**Catégories :** BOURSE, CRYPTO, IMMO_PHYSIQUE, IMMO_PAPIER, LIVRET, LIQUIDITE

---

### Axe 2 — Matelas de sécurité (15 pts)

**Source de données :** positions LIQUIDITE + LIVRET + config `safetyNetMode/safetyNetMonths` + dépenses récurrentes

| Couverture vs objectif | Points |
|------------------------|--------|
| < 1 mois | 0 |
| 1–2 mois | 5 |
| 2–3 mois | 10 |
| ≥ objectif configuré (3–6 mois) | 15 |

> Si `safetyNetMode = FIXED_AMOUNT`, comparer le solde liquide au montant cible.

---

### Axe 3 — Endettement (20 pts)

**Source de données :** `/api/debts/summary` + revenus nets (`SalaryContractDto.monthlyNetAfterTax`)

**Taux d'endettement** = somme `monthlyTotalCost` / `monthlyNetAfterTax`

| Taux d'endettement | Points |
|--------------------|--------|
| > 40% | 0 |
| 33–40% | 5 |
| 20–33% | 12 |
| < 20% | 16 |

**Ratio dette/patrimoine** = total `remainingCapital` / `totalCurrentValueEur`

| Ratio | Points bonus |
|-------|-------------|
| < 30% | +4 |
| 30–60% | +2 |
| > 60% | 0 |

---

### Axe 4 — Capacité d'épargne (20 pts)

**Source de données :** `/api/recurring-expenses/summary` + revenus nets

Taux d'épargne = (revenus nets mensuels - charges récurrentes mensuelles) / revenus nets mensuels

| Taux d'épargne | Points |
|----------------|--------|
| < 5% | 0 |
| 5–10% | 8 |
| 10–20% | 14 |
| > 20% | 20 |

---

### Axe 5 — Cohérence âge/risque (15 pts)

**Source de données :** `User.birthDate` + répartition des positions actives par catégorie

Allocation cible actions (BOURSE + CRYPTO) ≈ `(110 - âge)` %

| Écart entre allocation réelle et cible | Points |
|----------------------------------------|--------|
| > 30 pts | 0 |
| 20–30 pts | 5 |
| 10–20 pts | 10 |
| < 10 pts | 15 |

> Exemple : 30 ans → cible 80% actions. Allocation réelle = 20% → écart 60 pts → sous-optimisé.
> Exemple : 60 ans → cible 50% actions. Allocation réelle = 85% → écart 35 pts → surexposé.

---

### Axe 6 — Progression patrimoniale (10 pts)

**Source de données :** `PortfolioSnapshot` — tendance des 6 derniers snapshots

| Tendance | Points |
|----------|--------|
| Baisse sur les 3 derniers mois | 0 |
| Stagnation | 3 |
| Croissance modérée (< inflation estimée 2%) | 6 |
| Croissance positive | 10 |

> Nécessite au moins 2 snapshots. En dessous → axe ignoré et score ramené sur 90 pts.

---

### Bonus — Engagement stratégique (5 pts)

| Condition | Points |
|-----------|--------|
| ≥ 3 catégories avec un `PatrimoineTarget` défini | +5 |

---

## Profils

| Score | Profil | Label affiché |
|-------|--------|---------------|
| < 35 | Fragile | ⚠️ Fragile |
| 35–54 | Prudent | 🛡️ Prudent |
| 55–69 | Équilibré | ⚖️ Équilibré |
| 70–82 | Dynamique | 📈 Dynamique |
| > 82 | Optimisé | 🚀 Optimisé |

### Mention spéciale
Si l'horizon FIRE (calculé dans `FireProjectionWidget`) est ≤ 15 ans, afficher la mention **"Profil FIRE"** en complément du profil principal.

---

## Implémentation backend

### Endpoint

```
GET /api/patrimoine/score
```

**Réponse :**
```json
{
  "totalScore": 63,
  "maxScore": 105,
  "profile": "EQUILIBRE",
  "fireMention": false,
  "weakestAxisId": "EPARGNE",
  "weakestAxisAdvice": "Votre taux d'épargne peut être amélioré.",
  "axes": [
    {
      "id": "DIVERSIFICATION",
      "label": "Diversification",
      "score": 13,
      "maxScore": 20
    },
    {
      "id": "MATELAS",
      "label": "Matelas de sécurité",
      "score": 15,
      "maxScore": 15
    },
    {
      "id": "ENDETTEMENT",
      "label": "Endettement",
      "score": 14,
      "maxScore": 20
    },
    {
      "id": "EPARGNE",
      "label": "Capacité d'épargne",
      "score": 8,
      "maxScore": 20
    },
    {
      "id": "AGE_RISQUE",
      "label": "Cohérence âge/risque",
      "score": 10,
      "maxScore": 15
    },
    {
      "id": "PROGRESSION",
      "label": "Progression",
      "score": 3,
      "maxScore": 10
    }
  ]
}
```

### Sources à agréger

| Axe | Services nécessaires |
|-----|----------------------|
| Diversification | `PositionService`, `PatrimoineTargetService` |
| Matelas sécurité | `PositionService` (LIQUIDITE/LIVRET), `UserService`, `RecurringExpenseService` |
| Endettement | `DebtService.getSummary()`, `SalaryContractService` |
| Épargne | `RecurringExpenseService.getSummary()`, `SalaryContractService` |
| Âge/risque | `UserService` (birthDate), `PositionService` |
| Progression | `PortfolioSnapshotService` |
| Bonus | `PatrimoineTargetService` |

---

## Implémentation frontend

### Composant
`src/components/dashboard/PatrimoineScoreWidget.jsx`

- Appel `GET /api/patrimoine/score` au chargement du dashboard
- Barre de progression globale + profil en en-tête
- Liste des 6 axes avec mini barre de progression et score partiel
- Couleur par axe : rouge (< 50%), orange (50–75%), vert (> 75%)
- Conseil sur l'axe le plus faible en pied de card

---

## Évolutions futures envisagées

- Historique du score dans le temps (ajout dans les `PortfolioSnapshot` mensuels)
- Comparaison avec le référentiel INSEE (`/api/patrimoine/referentiel`)
- Recommandations personnalisées selon profil familial (`FamilyGroup`, `fiscalParts`)
