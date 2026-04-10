# API — Contrats salariaux et bulletins de paie

Base URL : `http://localhost:8080`

Swagger UI interactif disponible sur : `http://localhost:8080/swagger-ui.html`

Tous les endpoints nécessitent d'être **authentifié** (cookie `JSESSIONID`).
Chaque utilisateur ne peut accéder qu'à **ses propres données**. Un **ADMIN** peut accéder aux données de tous les utilisateurs.

---

## Contrats salariaux — `/api/salary-contracts`

### GET /api/salary-contracts

Retourne la liste des contrats salariaux de l'utilisateur connecté, triés du plus récent au plus ancien.

**Accès** : authentifié (ses propres contrats uniquement)

```http
GET /api/salary-contracts
```

#### Réponses

**200 OK**

```json
[
  {
    "id": 1,
    "startDate": "2023-01-01",
    "endDate": null,
    "annualGrossSalary": 45000.0,
    "paidMonthsPerYear": 12,
    "weeklyHours": 35.0,
    "mealVoucherAmount": 9.5,
    "mealVoucherEmployeeRate": 50.0,
    "isCadre": false,
    "employeePrevoyanceRate": null,
    "annualNetSalary": 36904.05,
    "monthlyGrossSalary": 3750.0,
    "monthlyNetSalary": 3075.34,
    "annualWorkingHours": 1596.0,
    "hourlyGrossSalary": 28.20,
    "hourlyNetSalary": 23.12,
    "dailyGrossSalary": 197.37,
    "dailyNetSalary": 161.86,
    "employeeMonthlyMealVoucherCost": 90.25,
    "employerMonthlyMealVoucherCost": 90.25
  }
]
```

---

### GET /api/salary-contracts/{id}

Retourne le détail d'un contrat avec toutes les **projections calculées**.

**Accès** : propriétaire ou ADMIN

```http
GET /api/salary-contracts/1
```

#### Réponses

**200 OK** — Même format que la liste (voir ci-dessus).

**403 Forbidden** — Le contrat appartient à un autre utilisateur.

**404 Not Found**

```json
{ "message": "Contrat introuvable : 1" }
```

---

### POST /api/salary-contracts

Crée un nouveau contrat salarial. Si `endDate` est absent (`null`), le contrat est considéré comme **actif**. Un seul contrat actif est autorisé par utilisateur.

**Accès** : authentifié

```http
POST /api/salary-contracts
Content-Type: application/json

{
  "startDate": "2023-01-01",
  "endDate": null,
  "annualGrossSalary": 45000.0,
  "paidMonthsPerYear": 12,
  "weeklyHours": 35.0,
  "mealVoucherAmount": 9.5,
  "mealVoucherEmployeeRate": 50.0,
  "isCadre": false,
  "employeePrevoyanceRate": 0.015
}
```

#### Champs

| Champ | Type | Obligatoire | Contraintes | Description |
|-------|------|-------------|-------------|-------------|
| `startDate` | `date` | oui | | Date de début du contrat |
| `endDate` | `date` | non | | Date de fin — `null` = contrat en cours |
| `annualGrossSalary` | `number` | oui | > 0 | Salaire brut annuel (€) |
| `paidMonthsPerYear` | `integer` | oui | 1–13 | Nombre de mois de paie |
| `weeklyHours` | `number` | oui | > 0 | Heures travaillées par semaine |
| `mealVoucherAmount` | `number` | oui | ≥ 0 | Valeur faciale du ticket restaurant (€) |
| `mealVoucherEmployeeRate` | `number` | oui | 0–100 | Part salarié du ticket restaurant (%) |
| `isCadre` | `boolean` | non | | `true` = statut cadre (APEC applicable). `null` traité comme `false` |
| `employeePrevoyanceRate` | `number` | non | 0,0–1,0 | Taux prévoyance/mutuelle salarié en décimal (ex : `0.015` = 1,5 %) |

#### Réponses

**201 Created** — Retourne le contrat créé avec les projections calculées.

**409 Conflict** — Un contrat actif (`endDate = null`) existe déjà.

```json
{ "message": "Un contrat actif existe déjà. Clôturez-le avant d'en créer un nouveau." }
```

---

### PUT /api/salary-contracts/{id}

Modifie un contrat existant (remplacement complet).

**Accès** : propriétaire ou ADMIN

```http
PUT /api/salary-contracts/1
Content-Type: application/json

{
  "startDate": "2023-01-01",
  "endDate": "2024-12-31",
  "annualGrossSalary": 48000.0,
  "paidMonthsPerYear": 13,
  "weeklyHours": 35.0,
  "mealVoucherAmount": 9.5,
  "mealVoucherEmployeeRate": 50.0,
  "isCadre": false,
  "employeePrevoyanceRate": null
}
```

#### Réponses

**200 OK** — Retourne le contrat mis à jour avec les projections recalculées.

**403 Forbidden** — Accès non autorisé.

**404 Not Found** — Contrat introuvable.

**409 Conflict** — Tentative de réactiver un contrat (`endDate → null`) alors qu'un autre est déjà actif.

---

### DELETE /api/salary-contracts/{id}

Supprime un contrat et **tous ses bulletins mensuels** (suppression en cascade).

**Accès** : propriétaire ou ADMIN

```http
DELETE /api/salary-contracts/1
```

#### Réponses

**204 No Content** — Suppression réussie.

**403 Forbidden** — Accès non autorisé.

**404 Not Found** — Contrat introuvable.

---

## Bulletins de paie mensuels — `/api/salary-contracts/{contractId}/pay-slips`

Les bulletins sont **rattachés à un contrat** et permettent de saisir les données réelles mois par mois pour les comparer aux projections théoriques du contrat.

---

### GET /api/salary-contracts/{contractId}/pay-slips

Retourne la liste des bulletins du contrat, triés du plus récent au plus ancien.

**Accès** : propriétaire du contrat ou ADMIN

```http
GET /api/salary-contracts/1/pay-slips
```

#### Réponses

**200 OK**

```json
[
  {
    "id": 1,
    "period": "2025-03-01",
    "grossSalary": 3900.0,
    "taxableNetSalary": 3150.0,
    "netSalary": 2820.0,
    "incomeTaxWithholding": 330.0
  }
]
```

> `period` représente le premier jour du mois concerné (ex : `2025-03-01` pour mars 2025).

---

### POST /api/salary-contracts/{contractId}/pay-slips

Ajoute un bulletin mensuel. Une seule entrée est autorisée par période (mois) et par contrat.

**Accès** : propriétaire du contrat ou ADMIN

```http
POST /api/salary-contracts/1/pay-slips
Content-Type: application/json

{
  "period": "2025-03-01",
  "grossSalary": 3900.0,
  "taxableNetSalary": 3150.0,
  "netSalary": 2820.0,
  "incomeTaxWithholding": 330.0
}
```

#### Champs

| Champ | Type | Obligatoire | Contraintes | Description |
|-------|------|-------------|-------------|-------------|
| `period` | `date` | oui | | Premier jour du mois (ex : `2025-03-01`) |
| `grossSalary` | `number` | oui | > 0 | Revenu brut du mois |
| `taxableNetSalary` | `number` | oui | > 0 | Revenu net fiscal |
| `netSalary` | `number` | oui | > 0 | Revenu net net (versé) |
| `incomeTaxWithholding` | `number` | oui | ≥ 0 | Prélèvement à la source réel |

#### Réponses

**201 Created** — Retourne le bulletin créé.

**403 Forbidden** — Accès non autorisé.

**404 Not Found** — Contrat introuvable.

**409 Conflict** — Un bulletin existe déjà pour cette période.

```json
{ "message": "Un bulletin existe déjà pour la période : 2025-03-01" }
```

---

### PUT /api/salary-contracts/{contractId}/pay-slips/{slipId}

Modifie un bulletin existant.

**Accès** : propriétaire du contrat ou ADMIN

```http
PUT /api/salary-contracts/1/pay-slips/1
Content-Type: application/json

{
  "period": "2025-03-01",
  "grossSalary": 4100.0,
  "taxableNetSalary": 3300.0,
  "netSalary": 2950.0,
  "incomeTaxWithholding": 350.0
}
```

#### Réponses

**200 OK** — Retourne le bulletin mis à jour.

**403 Forbidden** — Accès non autorisé.

**404 Not Found** — Bulletin ou contrat introuvable.

**409 Conflict** — La nouvelle période est déjà occupée par un autre bulletin.

---

### DELETE /api/salary-contracts/{contractId}/pay-slips/{slipId}

Supprime un bulletin.

**Accès** : propriétaire du contrat ou ADMIN

```http
DELETE /api/salary-contracts/1/pay-slips/1
```

#### Réponses

**204 No Content** — Suppression réussie.

**403 Forbidden** — Accès non autorisé.

**404 Not Found** — Bulletin ou contrat introuvable.

---

## Primes — `/api/salary-contracts/{contractId}/bonuses`

Les primes sont **rattachées à un contrat** et représentent les versements exceptionnels ou annuels (13ème mois, prime de vacances, prime Macron, etc.).

---

### GET /api/salary-contracts/{contractId}/bonuses

Retourne la liste des primes du contrat, triées de la plus récente à la plus ancienne.

**Accès** : propriétaire du contrat ou ADMIN

```http
GET /api/salary-contracts/1/bonuses
```

#### Réponses

**200 OK**

```json
[
  {
    "id": 1,
    "label": "Prime de vacances",
    "grossAmount": 1500.0,
    "type": "ANNUELLE",
    "paymentDate": null,
    "paymentMonth": 6
  },
  {
    "id": 2,
    "label": "Prime Macron",
    "grossAmount": 3000.0,
    "type": "EXCEPTIONNELLE",
    "paymentDate": "2025-03-01",
    "paymentMonth": null
  }
]
```

---

### POST /api/salary-contracts/{contractId}/bonuses

Ajoute une prime au contrat. Le champ `paymentDate` est requis pour une prime `EXCEPTIONNELLE`, le champ `paymentMonth` est requis pour une prime `ANNUELLE`.

**Accès** : propriétaire du contrat ou ADMIN

```http
POST /api/salary-contracts/1/bonuses
Content-Type: application/json

{
  "label": "Prime de vacances",
  "grossAmount": 1500.0,
  "type": "ANNUELLE",
  "paymentDate": null,
  "paymentMonth": 6
}
```

#### Champs

| Champ | Type | Obligatoire | Contraintes | Description |
|-------|------|-------------|-------------|-------------|
| `label` | `string` | oui | non vide | Nom de la prime (ex : "13ème mois") |
| `grossAmount` | `number` | oui | > 0 | Montant brut (€) |
| `type` | `enum` | oui | `EXCEPTIONNELLE` ou `ANNUELLE` | Type de prime |
| `paymentDate` | `date` | si `EXCEPTIONNELLE` | | Premier jour du mois de versement |
| `paymentMonth` | `integer` | si `ANNUELLE` | 1–12 | Mois de versement (1 = janvier) |

#### Réponses

**201 Created** — Retourne la prime créée.

**400 Bad Request** — Validation échouée (ex : `paymentDate` manquant pour une prime `EXCEPTIONNELLE`).

**403 Forbidden** — Accès non autorisé.

**404 Not Found** — Contrat introuvable.

---

### PUT /api/salary-contracts/{contractId}/bonuses/{bonusId}

Modifie une prime existante (remplacement complet).

**Accès** : propriétaire du contrat ou ADMIN

```http
PUT /api/salary-contracts/1/bonuses/1
Content-Type: application/json

{
  "label": "Prime de vacances",
  "grossAmount": 1800.0,
  "type": "ANNUELLE",
  "paymentDate": null,
  "paymentMonth": 6
}
```

#### Réponses

**200 OK** — Retourne la prime mise à jour.

**403 Forbidden** — Accès non autorisé.

**404 Not Found** — Prime ou contrat introuvable.

---

### DELETE /api/salary-contracts/{contractId}/bonuses/{bonusId}

Supprime une prime.

**Accès** : propriétaire du contrat ou ADMIN

```http
DELETE /api/salary-contracts/1/bonuses/1
```

#### Réponses

**204 No Content** — Suppression réussie.

**403 Forbidden** — Accès non autorisé.

**404 Not Found** — Prime ou contrat introuvable.

---

## Avantages en nature — `/api/salary-contracts/{contractId}/benefits`

Les avantages en nature sont **rattachés à un contrat** et représentent des compléments de rémunération mensuels versés par l'employeur (frais de télétravail, forfait téléphone, etc.). Leur montant s'ajoute au **net estimé** dans les projections.

---

### GET /api/salary-contracts/{contractId}/benefits

Retourne la liste des avantages du contrat, triés par libellé.

**Accès** : propriétaire du contrat ou ADMIN

```http
GET /api/salary-contracts/1/benefits
```

#### Réponses

**200 OK**

```json
[
  {
    "id": 1,
    "label": "Forfait téléphone",
    "monthlyAmount": 30.0
  },
  {
    "id": 2,
    "label": "Frais de télétravail",
    "monthlyAmount": 50.0
  }
]
```

---

### POST /api/salary-contracts/{contractId}/benefits

Ajoute un avantage en nature au contrat.

**Accès** : propriétaire du contrat ou ADMIN

```http
POST /api/salary-contracts/1/benefits
Content-Type: application/json

{
  "label": "Frais de télétravail",
  "monthlyAmount": 50.0
}
```

#### Champs

| Champ | Type | Obligatoire | Contraintes | Description |
|-------|------|-------------|-------------|-------------|
| `label` | `string` | oui | non vide | Type d'avantage (ex : "Forfait téléphone") |
| `monthlyAmount` | `number` | oui | > 0 | Montant mensuel en € |

#### Réponses

**201 Created** — Retourne l'avantage créé.

**400 Bad Request** — Validation échouée.

**403 Forbidden** — Accès non autorisé.

**404 Not Found** — Contrat introuvable.

---

### PUT /api/salary-contracts/{contractId}/benefits/{benefitId}

Modifie un avantage existant.

**Accès** : propriétaire du contrat ou ADMIN

```http
PUT /api/salary-contracts/1/benefits/1
Content-Type: application/json

{
  "label": "Frais de télétravail",
  "monthlyAmount": 60.0
}
```

#### Réponses

**200 OK** — Retourne l'avantage mis à jour.

**403 Forbidden** — Accès non autorisé.

**404 Not Found** — Avantage ou contrat introuvable.

---

### DELETE /api/salary-contracts/{contractId}/benefits/{benefitId}

Supprime un avantage en nature.

**Accès** : propriétaire du contrat ou ADMIN

```http
DELETE /api/salary-contracts/1/benefits/1
```

#### Réponses

**204 No Content** — Suppression réussie.

**403 Forbidden** — Accès non autorisé.

**404 Not Found** — Avantage ou contrat introuvable.

---

## Modèles

### `SalaryContractDto`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `number` | Identifiant |
| `startDate` | `date` | Date de début |
| `endDate` | `date\|null` | Date de fin — `null` = contrat actif |
| `annualGrossSalary` | `number` | Brut annuel saisi (€) |
| `paidMonthsPerYear` | `integer` | Mois de paie par an |
| `weeklyHours` | `number` | Heures / semaine |
| `mealVoucherAmount` | `number` | Valeur ticket restaurant (€) |
| `mealVoucherEmployeeRate` | `number` | Part salarié (%) |
| `isCadre` | `boolean\|null` | Statut cadre — `true` active le calcul APEC |
| `employeePrevoyanceRate` | `number\|null` | Taux prévoyance/mutuelle salarié (décimal, ex : `0.015`) |
| `annualNetSalary` | `number` | **Calculé** : net imposable annuel via `NetImposableCalculator` (cotisations légales 2025) |
| `monthlyGrossSalary` | `number` | **Calculé** : brut ÷ mois |
| `monthlyNetSalary` | `number` | **Calculé** : net ÷ mois |
| `annualWorkingHours` | `number` | **Calculé** : heures × (228 ÷ 5) |
| `hourlyGrossSalary` | `number` | **Calculé** : brut ÷ heures annuelles |
| `hourlyNetSalary` | `number` | **Calculé** : net ÷ heures annuelles |
| `dailyGrossSalary` | `number` | **Calculé** : brut ÷ 228 |
| `dailyNetSalary` | `number` | **Calculé** : net ÷ 228 |
| `employeeMonthlyMealVoucherCost` | `number` | **Calculé** : coût mensuel salarié (€) |
| `employerMonthlyMealVoucherCost` | `number` | **Calculé** : coût mensuel employeur (€) |

### `MonthlyPaySlipDto`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `number` | Identifiant |
| `period` | `date` | Premier jour du mois |
| `grossSalary` | `number` | Brut réel du mois |
| `taxableNetSalary` | `number` | Net fiscal réel |
| `netSalary` | `number` | Net net versé |
| `incomeTaxWithholding` | `number` | Prélèvement à la source réel |

### `ContractBonusDto`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `number` | Identifiant |
| `label` | `string` | Nom de la prime |
| `grossAmount` | `number` | Montant brut (€) |
| `type` | `enum` | `EXCEPTIONNELLE` ou `ANNUELLE` |
| `paymentDate` | `date\|null` | Premier jour du mois de versement — renseigné si `EXCEPTIONNELLE` |
| `paymentMonth` | `integer\|null` | Mois de versement (1–12) — renseigné si `ANNUELLE` |

### `ContractBenefitDto`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `number` | Identifiant |
| `label` | `string` | Type d'avantage (ex : "Forfait téléphone") |
| `monthlyAmount` | `number` | Montant mensuel (€) |
