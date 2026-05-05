# API — Fiscalité crypto (formulaire 2086)

## Endpoints

| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/crypto-tax/state` | Authentifié | État courant (PTA, valorisation, confirmation historique) |
| `GET` | `/api/crypto-tax/summary?year=&taxOption=&tmi=` | Authentifié | Synthèse annuelle (PTA, cessions, PV nette, impôt estimé) |
| `GET` | `/api/crypto-tax/cessions?year=` | Authentifié | Détail des cessions (format 2086 — une ligne par SELL_FIAT) |
| `GET` | `/api/crypto-tax/form-2086.csv?year=` | Authentifié | Export CSV du formulaire 2086 |
| `PUT` | `/api/crypto-tax/historical-data-confirmation` | Authentifié | Confirmer/infirmer la complétude de l'historique |

---

## GET /api/crypto-tax/state

### Paramètres
Aucun.

### Réponse `CryptoTaxStateDto`
```json
{
  "currentPta": 4000.00,
  "currentPortfolioValueEur": 18000.00,
  "firstOperationDate": "2020-01-15",
  "totalOperationsCount": 8,
  "historicalDataConfirmed": true
}
```

---

## GET /api/crypto-tax/summary

### Paramètres query
| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `year` | int | Année courante | Année fiscale |
| `taxOption` | string | `PFU` | `PFU` ou `BAREME` |
| `tmi` | float | null | TMI en % (obligatoire si `taxOption=BAREME`) |

### Réponse `CryptoTaxSummaryDto`
```json
{
  "year": 2024,
  "ptaAtYearStart": 8000.00,
  "ptaAtYearEnd": 4000.00,
  "totalCessionsEur": 12000.00,
  "totalPlusValueEur": 8000.00,
  "totalMoinsValueEur": 0.00,
  "plusValueNetteImposable": 8000.00,
  "exemptedBy305Threshold": false,
  "declarationRequired": true,
  "taxOption": "PFU",
  "tmi": null,
  "estimatedTaxEur": 2400.00,
  "cessionsCount": 1,
  "warnings": []
}
```

---

## GET /api/crypto-tax/cessions

### Paramètres query
| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `year` | int | Année courante | Année fiscale |

### Réponse `List<CryptoCessionDto>`
```json
[
  {
    "orderId": 42,
    "cessionDate": "2024-06-01",
    "instrumentLabel": "Bitcoin",
    "amountSold": 0.5,
    "prixDeCessionEur": 12000.00,
    "ptaAvantCession": 8000.00,
    "vgpEur": 24000.00,
    "vgpFromManualOverride": false,
    "plusValueEur": 8000.00,
    "ptaApresCession": 4000.00,
    "notes": "Vente Kraken"
  }
]
```

---

## GET /api/crypto-tax/form-2086.csv

### Réponse
Fichier CSV avec `Content-Disposition: attachment; filename="fiscalite-crypto-2086-{year}.csv"`.

```csv
N°,Date de cession,Valeur portefeuille (VGP),Prix de cession (PC),Prix total acquisition (PTA),Plus-value,Notes
1,2024-06-01,24000.00,12000.00,8000.00,8000.00,Vente Kraken
TOTAL,,,12000.00,,8000.00,
```

---

## PUT /api/crypto-tax/historical-data-confirmation

### Corps
```json
{ "confirmed": true }
```

### Réponse
`204 No Content`

---

## Champs crypto sur PositionOrder

Les endpoints `POST/PUT /api/positions/{id}/orders` acceptent désormais des champs supplémentaires pour les positions CRYPTO :

| Champ | Type | Description |
|-------|------|-------------|
| `cryptoOperationType` | enum | `BUY_FIAT`, `SELL_FIAT`, `SWAP_OUT`, `SWAP_IN`, `TRANSFER_IN`, `TRANSFER_OUT` |
| `swapCounterpartPositionId` | Long | Pour `SWAP_OUT` : id de la position de destination (crée le `SWAP_IN` en miroir) |
| `swapCounterpartQuantity` | BigDecimal | Pour `SWAP_OUT` : quantité reçue sur la position de destination |
| `swapCounterpartAmount` | BigDecimal | Pour `SWAP_OUT` : montant dans la devise de la position de destination |
| `portfolioValueAtDateEur` | BigDecimal | Override manuel de la VGP pour un `SELL_FIAT` (si cours historiques indisponibles) |

La réponse `PositionOrderDto` expose aussi `cryptoOperationType`, `swapCounterpartOrderId`, `portfolioValueAtDateEur`.
