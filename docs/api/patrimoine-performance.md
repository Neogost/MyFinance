# API — Performance patrimoniale (TWR + MWR)

Endpoint de calcul de performance globale du patrimoine. **Accès ADMIN uniquement**, fonctionnalité en cours de validation.

---

## GET /api/patrimoine/performance

Calcule et retourne la performance TWR (Time-Weighted Return) et MWR (Money-Weighted Return) depuis le premier ordre jusqu'à aujourd'hui.

### Sécurité

| Rôle requis | Sans auth | Rôle USER |
|-------------|-----------|-----------|
| `ADMIN` | 401 | 403 |

### Paramètres

Aucun — la période est toujours **depuis le premier ordre jusqu'à aujourd'hui** (non paramétrable en V1).

### Réponse 200 — `PerformanceDto`

```json
{
  "computedAt": "2026-05-04T10:32:18Z",
  "from": "2021-01-01",
  "to": "2026-05-04",
  "durationYears": 5.34,
  "twrAnnualized": 0.092,
  "mwrAnnualized": 0.078,
  "totalInvestedEur": 45200.00,
  "currentValueEur": 58900.00,
  "absoluteGainEur": 13700.00,
  "totalDividendsEur": 1240.00,
  "warnings": [
    "Mois de 2015-01 exclu du chaînage TWR : c'est le mois du premier versement (V_début = 0, formule instable).",
    "Taux de change USD absent de l'historique — positions en USD exclues du calcul. Lancer le backfill depuis la page Taux de change."
  ],
  "monthlyBreakdown": [
    {
      "month": "2021-02",
      "included": true,
      "valueStart": 6737.00,
      "valueEnd": 7584.00,
      "cashflowsNetEur": 50.00,
      "weightedCashflowsEur": 48.00,
      "monthlyReturn": 0.1175,
      "partial": false,
      "reason": null
    },
    {
      "month": "2021-03",
      "included": false,
      "valueStart": null,
      "valueEnd": null,
      "cashflowsNetEur": null,
      "weightedCashflowsEur": null,
      "monthlyReturn": null,
      "partial": false,
      "reason": "Aucune position active ni cashflow"
    }
  ]
}
```

### Description des champs

| Champ | Type | Description |
|-------|------|-------------|
| `computedAt` | `Instant` (ISO 8601 UTC) | Horodatage du calcul — utile pour debug |
| `from` | `LocalDate` | Date de début effective du chaînage TWR (1er du mois suivant le premier versement, ou plus tard si historique de prix insuffisant) |
| `to` | `LocalDate` | Date de calcul (aujourd'hui, fuseau Europe/Paris) |
| `durationYears` | `double` | `(to − from) / 365.25` |
| `twrAnnualized` | `Double` (nullable) | TWR annualisé — `null` si aucun mois inclus dans le chaînage |
| `mwrAnnualized` | `Double` (nullable) | XIRR annualisé — `null` si le solveur ne converge pas |
| `totalInvestedEur` | `BigDecimal` | Somme nette de **tous** les versements en EUR depuis le premier ordre (versements − retraits, taux du jour de chaque flux) — inclut les mois exclus du TWR |
| `currentValueEur` | `BigDecimal` | Valorisation globale actuelle du patrimoine éligible |
| `absoluteGainEur` | `BigDecimal` | `currentValueEur − totalInvestedEur` |
| `totalDividendsEur` | `BigDecimal` | Somme des INTEREST + DIVIDEND + AIRDROP sur la période — gains internes déjà compris dans `currentValueEur` |
| `warnings` | `List<String>` | Messages diagnostics (max 20 affichés, puis résumé) |
| `monthlyBreakdown` | `List<MonthlyBreakdownDto>` | Décomposition mois par mois du chaînage TWR — outil de validation |

### Structure `MonthlyBreakdownDto`

| Champ | Type | Présent si | Description |
|-------|------|-----------|-------------|
| `month` | `String` | Toujours | Format `"YYYY-MM"` |
| `included` | `boolean` | Toujours | `false` → mois exclu du chaînage (facteur 1) |
| `valueStart` | `BigDecimal` | `included=true` | V_début — valeur du portefeuille au dernier jour du mois précédent |
| `valueEnd` | `BigDecimal` | `included=true` | V_fin — valeur au dernier jour du mois (ou aujourd'hui si mois partiel) |
| `cashflowsNetEur` | `BigDecimal` | `included=true` | Σ flux externes nets du mois (versements − retraits), uniquement pour les positions valorisables |
| `weightedCashflowsEur` | `BigDecimal` | `included=true` | Σ w_i × F_i (flux pondérés par le temps — dénominateur Modified Dietz) |
| `monthlyReturn` | `Double` | `included=true` | R_m = (V_fin − V_début − F_net) / (V_début + Σ w_i × F_i) |
| `partial` | `boolean` | `included=true` | `true` si c'est le mois en cours (pas encore terminé) |
| `reason` | `String` | `included=false` | Motif d'exclusion |

---

## Catégories couvertes

| Catégorie | Couverture | Source de valorisation |
|-----------|-----------|------------------------|
| `BOURSE` | TWR + MWR | `quantité × prix_historique(date)` × taux_change(date) |
| `CRYPTO` | TWR + MWR | Idem BOURSE |
| `LIVRET` | TWR + MWR | Capitalisation quotidienne : `(1 + annualRate)^(1/365) − 1` |
| `IMMO_PAPIER` | Provisoirement exclu (V1) | — |
| `LIQUIDITE` | Exclu | — |
| `IMMO_PHYSIQUE` | Exclu | — |

**Instruments à prix figé** (`stablePrice = true`, ex. Fonds en Euros, USDC) : valorisés comme la somme nette des cashflows en EUR — pas d'historique de prix requis, aucun warning généré.

---

## Cas particuliers et warnings

| Situation | Comportement |
|-----------|-------------|
| Aucune position éligible | `twr/mwr = null`, warning explicite |
| Taux de change manquant | 1 warning par devise, position exclue |
| Instrument sans historique de prix | 1 warning par instrument, position exclue |
| XIRR non convergent | `mwrAnnualized = null` + warning, TWR toujours calculé |
| Mois du premier versement | Exclu du chaînage (V_début = 0 instable), warning |
| Mois en cours (partiel) | Inclus avec `partial: true`, `D = jour_courant` |
| > 20 warnings | Tronqué à 20 + ligne « … et N autres » |

---

## Algorithmes

### TWR — Modified Dietz mensuel (CFA Institute)

```
Pour chaque mois m :
  R_m = (V_fin − V_début − F_net) / (V_début + Σ w_i × F_i)
  w_i = (D − j_i) / D   [poids du flux au jour j_i, D = nb jours du mois]

TWR_total     = Π(1 + R_m) − 1
TWR_annualisé = (1 + TWR_total)^(365 / nb_jours_période) − 1
```

Seuls les flux des **positions valorisables** au mois concerné entrent dans F_net (évite les R_m négatifs dus aux BUY sans contrepartie de valeur).

### MWR — XIRR (Newton-Raphson + bissection)

```
Cashflows = tous les versements/retraits externes depuis le premier ordre
          + liquidation virtuelle à la valeur actuelle (aujourd'hui)
Résout : Σ C_i / (1+r)^((d_i − d_0)/365) = 0
```

r₀ = 0.10, tolérance = 1e-7, max 100 itérations. Fallback bissection sur [−0.99, 10.0].

---

## Liens

- Architecture complète : `docs/architecture/patrimoine-performance.md`
- Endpoints backfill (prérequis) : `docs/api/patrimoine-performance-backfill.md`
