# API — Optimisation fiscale fin d'année (Tax-Loss Harvesting)

## Endpoints

### `GET /api/tax-loss-harvesting`

Calcule les plus-values réalisées de l'année et identifie les positions candidates à la vente avant le 31 décembre pour réduire l'imposition au PFU (30 %).

**Auth :** Authentifié

**Paramètre de requête**

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `year` | `int` | Non | Année fiscale (défaut : année courante) |

**Réponse 200 — `TaxLossSummaryDto`**

```json
{
  "cto": {
    "basketLabel": "Compte-titres ordinaire",
    "realizedGainsYearEur": "5000.00",
    "totalUnrealizedLossEur": "-7800.00",
    "compensableAmountEur": "5000.00",
    "estimatedTaxSavingEur": "1500.00",
    "candidates": [
      {
        "positionId": 42,
        "label": "ETF Monde",
        "partner": "Boursobank",
        "category": "BOURSE",
        "envelope": "CTO",
        "currentQuantity": "100.000000",
        "unrealizedLossEur": "-3000.00",
        "recommendedSellQuantity": "100.000000",
        "recommendedRealizedLossEur": "-3000.00",
        "estimatedTaxSavingEur": "900.00"
      }
    ]
  },
  "crypto": {
    "basketLabel": "Crypto-monnaies",
    "realizedGainsYearEur": "1200.00",
    "totalUnrealizedLossEur": "-400.00",
    "compensableAmountEur": "400.00",
    "estimatedTaxSavingEur": "120.00",
    "candidates": []
  },
  "year": 2026
}
```

## Règles de gestion

- **Cloisonnement fiscal** : les MV de BOURSE (CTO) ne compensent que les PV de BOURSE, et inversement pour la CRYPTO.
- **Enveloppes exclues** : PEA, AV, PER, PEE_PERCO sont exclus du calcul (régimes spécifiques).
- **Enveloppes éligibles (CTO)** : CTO, FLAT_TAX, AUTRE, NONE.
- **Taux** : PFU 30 % (12,8 % IR + 17,2 % prélèvements sociaux).
- **Méthode de calcul CTO** : coût moyen pondéré (CMP) sur les ordres SELL de l'année.
- **Méthode CRYPTO** : algorithme PTA/VGP via `CryptoTaxService` (article 150 VH bis CGI).
- **Recommandation** : si la MV latente d'une position dépasse la PV à compenser, seule une fraction des parts est recommandée.
- **Candidats** : triés par impact décroissant (plus grande MV en premier).

## Architecture

- **Service** : `TaxLossHarvestingService.computeSummary(User, int year)`
- **Controller** : `TaxLossHarvestingController`
- **DTOs** : `TaxLossSummaryDto`, `BasketAnalysisDto`, `TaxLossCandidateDto`
- **Spec complète** : `docs/architecture/tools/tax-loss-harvesting.md`
