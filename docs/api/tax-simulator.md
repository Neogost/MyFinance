# API — Simulateur des impôts

## Vue d'ensemble

| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/tax-simulator` | Authentifié | Lancer une simulation pour l'utilisateur connecté |
| `GET` | `/api/tax-simulator/users/{userId}` | ADMIN | Lancer une simulation pour un autre utilisateur |

> La mise à jour du profil fiscal (parts, abattement) passe par les endpoints existants de gestion du profil utilisateur (`PUT /api/users/{id}`), avec les nouveaux champs ajoutés au `UserDto`.

---

## GET `/api/tax-simulator`

Lance le calcul de simulation d'impôt pour l'utilisateur connecté.

### Paramètres de requête

| Paramètre | Type | Obligatoire | Défaut | Description |
|-----------|------|-------------|--------|-------------|
| `year` | `Integer` | Non | Année en cours | Année fiscale à simuler |
| `salarySource` | `String` | Non | `PROJECTION_CONTRAT` | Source des revenus salariaux : `PROJECTION_CONTRAT` ou `BULLETINS_REELS` |
| `includedIncomes` | `List<Long>` | Non | Tous les `isTaxable=true` de l'année | IDs des `OtherIncome` à inclure. `null` = tous les imposables ; liste vide = aucun ; liste d'IDs = uniquement ceux-ci |

### Exemple de requête

```
GET /api/tax-simulator?year=2024&salarySource=BULLETINS_REELS&includedIncomes=12,15,18
```

### Réponse `200 OK`

```json
{
  "year": 2024,
  "salaryIncomeSource": "BULLETINS_REELS",
  "salaryIncome": 42000.00,
  "otherIncomeInBareme": 3600.00,
  "otherIncomeSeparatelyTaxed": 1200.00,
  "separateTaxAmount": 360.00,
  "grossTaxableIncome": 46800.00,
  "professionalDeduction": 4200.00,
  "deductionType": "FORFAITAIRE_10_POURCENT",
  "netTaxableIncome": 42600.00,
  "fiscalParts": 2.5,
  "baremeEstimatedTax": 3248.40,
  "totalEstimatedTax": 3608.40,
  "effectiveTaxRate": 7.71
}
```

### Erreurs possibles

| Code | Condition |
|------|-----------|
| `400 Bad Request` | `salarySource=BULLETINS_REELS` demandé mais aucun bulletin saisi pour l'année |
| `400 Bad Request` | Profil fiscal incomplet (ex : `useFlatRateDeduction=false` sans `customProfessionalDeduction`) |
| `400 Bad Request` | Aucun contrat salarial actif (si `salarySource=PROJECTION_CONTRAT`) |

---

## GET `/api/tax-simulator/users/{userId}`

Même comportement que l'endpoint précédent, mais pour un utilisateur identifié par son `id`. Réservé aux administrateurs.

### Paramètres

Identiques à `GET /api/tax-simulator` + `{userId}` dans le chemin.

---

## Mise à jour du profil fiscal — `PUT /api/users/{id}`

Les champs fiscaux sont intégrés dans le `UserDto` existant. Aucun endpoint dédié n'est nécessaire.

### Nouveaux champs dans `UserDto` et `UserUpdateRequest`

```json
{
  "fiscalParts": 2.5,
  "useFlatRateDeduction": true,
  "customProfessionalDeduction": null
}
```

| Champ | Type | Obligatoire | Règles |
|-------|------|-------------|--------|
| `fiscalParts` | `Float` | Oui | ≥ 0.5 |
| `useFlatRateDeduction` | `Boolean` | Oui | — |
| `customProfessionalDeduction` | `Float` | Conditionnel | Obligatoire si `useFlatRateDeduction=false`, ≥ 0 |

---

## Mise à jour de `OtherIncome` — `POST` / `PUT` existants

Les deux nouveaux champs sont intégrés dans les DTOs `OtherIncome` existants.

### Nouveaux champs

```json
{
  "type": "DIVIDENDE",
  "label": "Dividendes SCPI 2024",
  "amount": 1200.00,
  "date": "2024-06-15",
  "isTaxable": true,
  "specificTaxRate": 30.0
}
```

| Champ | Type | Obligatoire | Défaut suggéré | Description |
|-------|------|-------------|----------------|-------------|
| `isTaxable` | `Boolean` | Oui | Selon le type (voir tableau section 3.2 de l'architecture) | Ce revenu est-il imposable ? |
| `specificTaxRate` | `Float` | Non | `null` | Taux fixe en % (null = barème IRPP) |
