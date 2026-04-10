# Gestion des revenus

## Vue d'ensemble

La gestion des revenus repose sur **quatre niveaux complémentaires** :

| Niveau | Entité | Objectif |
|--------|--------|----------|
| Vue théorique | `SalaryContract` | Projections à partir du contrat (brut annuel, tickets resto…) |
| Réel mensuel | `MonthlyPaySlip` | Bulletins de salaire saisis mois par mois |
| Primes | `ContractBonus` | Versements exceptionnels ou annuels rattachés à un contrat |
| Avantages en nature | `ContractBenefit` | Compléments mensuels nets (télétravail, téléphone…) rattachés à un contrat |
| Revenus complémentaires | `OtherIncome` | Tout revenu hors salaire (locatif, dividendes, aides…) |

La **vue théorique** (`SalaryProjectionDto`) et les **bulletins réels** (`MonthlyPaySlip`) sont affichables côte à côte pour permettre à l'utilisateur de mesurer l'écart entre les projections et la réalité (primes, avantages en nature, variation de salaire).

---

## 1. Contrat salarial — `SalaryContract`

### Objectif

Stocker les informations contractuelles pour générer des **estimations** annuelles, mensuelles, journalières et horaires. Ces données constituent la **vision théorique** du revenu.

### Modèle persisté

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `Long` | Identifiant |
| `startDate` | `LocalDate` | Date de début du contrat |
| `endDate` | `LocalDate` | Date de fin — `null` = contrat en cours |
| `annualGrossSalary` | `Float` | Salaire brut annuel (en €) |
| `paidMonthsPerYear` | `Integer` | Nombre de mois de paie (12 ou 13) |
| `weeklyHours` | `Float` | Heures travaillées par semaine |
| `mealVoucherAmount` | `Float` | Valeur faciale d'un ticket restaurant (en €) |
| `mealVoucherEmployeeRate` | `Float` | Part salarié du ticket restaurant (en %, ex : 50.0) |
| `isCadre` | `Boolean` | `true` = statut cadre (APEC applicable). `null` traité comme `false` |
| `employeePrevoyanceRate` | `Float` | Taux prévoyance/mutuelle salarié en décimal (ex : `0.015` = 1,5%). Nullable |

**Règle** : un seul contrat peut avoir `endDate = null` par utilisateur (contrat actif).

### Projections calculées — `SalaryProjectionDto` (non persisté)

| Champ | Formule |
|-------|---------|
| `annualNetSalary` | `NetImposableCalculator.calculer(annualGrossSalary, isCadre, employeePrevoyanceRate, taxParams)` |
| `monthlyGrossSalary` | `annualGrossSalary ÷ paidMonthsPerYear` |
| `monthlyNetSalary` | `annualNetSalary ÷ paidMonthsPerYear` |
| `annualWorkingHours` | `weeklyHours × (228 ÷ 5)` |
| `hourlyGrossSalary` | `annualGrossSalary ÷ annualWorkingHours` |
| `hourlyNetSalary` | `annualNetSalary ÷ annualWorkingHours` |
| `dailyGrossSalary` | `annualGrossSalary ÷ 228` |
| `dailyNetSalary` | `annualNetSalary ÷ 228` |
| `employeeMonthlyMealVoucherCost` | `mealVoucherAmount × (employeeRate ÷ 100) × 19` |
| `employerMonthlyMealVoucherCost` | `mealVoucherAmount × ((100 − employeeRate) ÷ 100) × 19` |

> `annualNetSalary` représente le **net imposable annuel**, calculé à partir des taux de cotisations salariales réels (voir section [NetImposableCalculator](#nettoimposablecalculator--calcul-du-net-imposable) ci-dessous).

### Constantes utilisées

| Constante | Valeur | Justification |
|-----------|--------|---------------|
| PASS (Plafond Annuel SS) | `47 100 €` (2025) | Seuil de plafonnement des cotisations vieillesse et AGIRC-ARRCO T1 — externalisé dans `tax-parameters.yml` |
| Jours travaillés / an | `228` | Convention standard (tooltip explicatif prévu dans l'IHM) |
| Jours travaillés / mois | `19` | 228 ÷ 12, arrondi |
| Jours / semaine ouvrée | `5` | |

---

## 1bis. NetImposableCalculator — Calcul du net imposable

### Objectif

Calculer le **salaire net imposable** (revenu après cotisations salariales déductibles, avant CSG non déductible et CRDS) à partir du brut annuel, en appliquant les taux légaux français 2025.

> **Net imposable ≠ Net à payer** : la CSG non déductible (2,40 %) et la CRDS (0,50 %) sont prélevées sur le bulletin mais **ne sont pas déductibles** du revenu imposable. Elles ne rentrent donc pas dans le calcul du net imposable.

### Implémentation

Classe utilitaire pure `NetImposableCalculator` (méthode statique, pas de bean Spring) dans `com.myfinance.service`. Appellable depuis `SalaryContractDto.from()` (méthode statique) et depuis `TaxSimulatorService` (bean Spring).

### Cotisations salariales déductibles prises en compte

| Cotisation | Base de calcul | Taux 2025 |
|------------|----------------|-----------|
| Vieillesse plafonnée | `min(brut, PASS)` | 6,90 % |
| Vieillesse déplafonnée | `brut` | 0,40 % |
| CSG déductible | `brut × 98,25 %` | 6,80 % |
| AGIRC-ARRCO Tranche 1 | `min(brut, PASS)` | 3,15 % |
| CEG Tranche 1 | `min(brut, PASS)` | 0,86 % |
| AGIRC-ARRCO Tranche 2 | `max(0, min(brut, 8×PASS) − PASS)` | 8,64 % |
| CEG Tranche 2 | `max(0, min(brut, 8×PASS) − PASS)` | 1,08 % |
| APEC | `min(brut, 4×PASS)` | 0,024 % — **cadres uniquement** |
| Prévoyance/mutuelle | `brut` | variable (stocké dans `employeePrevoyanceRate`, nullable) |

### Formule

```
assietteCsg      = brut × 98,25 %
vieillessePlaf   = min(brut, PASS) × 6,90 %
vieillesseDeplaf = brut × 0,40 %
csgDeductible    = assietteCsg × 6,80 %
agircArrco       = min(brut, PASS) × 3,15 % + max(0, min(brut, 8×PASS) − PASS) × 8,64 %
ceg              = min(brut, PASS) × 0,86 % + max(0, min(brut, 8×PASS) − PASS) × 1,08 %
apec             = si cadre : min(brut, 4×PASS) × 0,024 %   sinon : 0
prevoyance       = si employeePrevoyanceRate renseigné : brut × taux   sinon : 0

totalDeductible  = vieillessePlaf + vieillesseDeplaf + csgDeductible + agircArrco + ceg + apec + prevoyance

netImposable     = max(0, brut − totalDeductible)
```

### Configuration externalisée

Tous les taux et le PASS sont externalisés dans `tax-parameters.yml` (même fichier que le barème IRPP), sous la clé `employee-contributions`. Ils peuvent être mis à jour chaque année sans recompilation.

```yaml
tax:
  pass: 47100.0
  employee-contributions:
    csg-base-rate: 0.9825
    csg-deductible-rate: 0.0680
    vieillesse-plafonne-rate: 0.0690
    vieillesse-de-plafonnee-rate: 0.0040
    agirc-arrco-t1-rate: 0.0315
    ceg-t1-rate: 0.0086
    agirc-arrco-t2-rate: 0.0864
    ceg-t2-rate: 0.0108
    apec-rate: 0.00024
```

---

## 2. Bulletins de salaire mensuels — `MonthlyPaySlip`

### Objectif

Permettre la saisie des **données réelles** mois par mois, issues du bulletin de salaire. En combinant cette vue avec `SalaryProjectionDto`, l'utilisateur peut visualiser les écarts (prime, avantages en nature, variation de cotisations).

### Modèle persisté

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `Long` | Identifiant |
| `period` | `LocalDate` | Mois concerné (ex : 2025-03-01 pour mars 2025) |
| `grossSalary` | `Float` | Revenu brut du mois |
| `taxableNetSalary` | `Float` | Revenu net fiscal (après cotisations sociales) |
| `netSalary` | `Float` | Revenu net net (montant effectivement versé) |
| `incomeTaxWithholding` | `Float` | Prélèvement à la source réel du mois |

### Relations

- Un `MonthlyPaySlip` est **rattaché à un `SalaryContract`** (le contrat actif au moment de la période)
- Une période donnée (`period`) ne peut avoir **qu'un seul bulletin** par contrat

### Vue comparée — Réel vs Théorique

```
Pour un mois M :

  SalaryProjectionDto.monthlyGrossSalary   ← théorique (SalaryContract)
  MonthlyPaySlip.grossSalary               ← réel (bulletin saisi)

  Écart = réel − théorique
  (positif = prime / avantage ; négatif = absence / retenue)
```

---

## 3. Primes — `ContractBonus`

### Objectif

Enregistrer les **versements ponctuels ou récurrents** liés au contrat (13ème mois, prime de vacances, prime exceptionnelle, etc.) pour les distinguer du salaire mensuel de base et les intégrer dans la vision globale des revenus.

### Modèle persisté

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `Long` | Identifiant |
| `label` | `String` | Nom de la prime (ex : "Prime Macron", "13ème mois") |
| `grossAmount` | `Float` | Montant brut en € |
| `type` | `BonusTypeEnum` | `EXCEPTIONNELLE` ou `ANNUELLE` |
| `paymentDate` | `LocalDate` | Premier jour du mois de versement — renseigné si `EXCEPTIONNELLE` |
| `paymentMonth` | `Integer` | Mois de versement (1–12) — renseigné si `ANNUELLE` |

### Types de primes (`BonusTypeEnum`)

| Valeur | Description | Champ associé |
|--------|-------------|---------------|
| `EXCEPTIONNELLE` | Prime versée à une date précise (usage unique ou ponctuel) | `paymentDate` (obligatoire) |
| `ANNUELLE` | Prime récurrente versée chaque année à un mois fixe | `paymentMonth` (obligatoire, 1–12) |

### Relations

- Un `ContractBonus` est **rattaché à un `SalaryContract`**
- Un contrat peut avoir **plusieurs primes**
- Les primes sont supprimées en **cascade** si le contrat est supprimé

---

## 4. Avantages en nature — `ContractBenefit`

### Objectif

Enregistrer les **compléments de rémunération mensuels** versés par l'employeur (frais de télétravail, forfait téléphone, mutuelle…). Contrairement aux primes, il s'agit de montants fixes et récurrents qui s'ajoutent directement au **net estimé** dans les projections — ils ne transitent pas par le brut et ne sont pas soumis aux cotisations salariales.

### Modèle persisté

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `Long` | Identifiant |
| `label` | `String` | Type d'avantage (ex : "Frais de télétravail", "Forfait téléphone") |
| `monthlyAmount` | `Float` | Montant mensuel en € |

### Intégration dans les projections (frontend)

Les montants mensuels sont ramenés aux différentes périodes selon les mêmes constantes que le reste des projections :

| Période | Calcul |
|---------|--------|
| Annuel | `monthlyAmount × 12` |
| Mensuel | `monthlyAmount` |
| Journalier | `monthlyAmount × 12 ÷ 228` |
| Horaire | `monthlyAmount × 12 ÷ 228 ÷ hoursPerDay` |

Chaque ligne d'avantage apparaît dans le tooltip du "Net estimé" correspondant.

### Relations

- Un `ContractBenefit` est **rattaché à un `SalaryContract`**
- Un contrat peut avoir **plusieurs avantages**
- Les avantages sont supprimés en **cascade** si le contrat est supprimé

---

## 5. Revenus non salariés — `OtherIncome`

### Objectif

Enregistrer tout revenu hors salariat : revenu locatif, dividendes non liés au portefeuille suivi, aides sociales, etc. Cette vision permet d'avoir un tableau de bord complet des entrées financières.

### Modèle persisté

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `Long` | Identifiant |
| `type` | `OtherIncomeTypeEnum` | Catégorie du revenu |
| `label` | `String` | Description libre (ex : "Loyer appartement Lyon") |
| `amount` | `Float` | Montant perçu (en €) |
| `date` | `LocalDate` | Date de perception |
| `isTaxable` | `Boolean` | Indique si ce revenu est soumis à l'impôt |
| `specificTaxRate` | `Float` | Taux d'imposition fixe en % (ex : 30.0 pour la flat tax). `null` = inclus dans le barème IRPP normal |

### Types de revenus (`OtherIncomeTypeEnum`)

| Valeur | Description | `isTaxable` suggéré | `specificTaxRate` suggéré |
|--------|-------------|---------------------|---------------------------|
| `LOCATIF` | Revenu locatif (loyers perçus, charges récupérées…) | `true` | `null` (barème IRPP) |
| `DIVIDENDE` | Dividendes hors portefeuille suivi dans l'application | `true` | `30.0` (flat tax PFU fréquente) |
| `AIDE_SOCIALE` | Allocations, aides (CAF, Pôle Emploi, etc.) | `false` | — |
| `AUTRE` | Tout autre revenu non salarial (libellé libre) | `true` | `null` |

> **Note :** Les dividendes liés à une position du portefeuille sont gérés via l'entité `Dividend` (liée à `Isbn`). `OtherIncome` de type `DIVIDENDE` couvre les dividendes hors portefeuille.

> **Note fiscale :** Les champs `isTaxable` et `specificTaxRate` sont utilisés par le Simulateur des impôts pour déterminer si ce revenu entre dans le calcul IRPP et à quel taux. Voir [`docs/architecture/tax-simulator.md`](tax-simulator.md).

---

## Diagramme de classes — Revenus

```mermaid
classDiagram
    class SalaryContract {
        +Long id
        +LocalDate startDate
        +LocalDate endDate
        +Float annualGrossSalary
        +Integer paidMonthsPerYear
        +Float weeklyHours
        +Float mealVoucherAmount
        +Float mealVoucherEmployeeRate
        +Boolean isCadre
        +Float employeePrevoyanceRate
    }
    class SalaryProjectionDto {
        <<DTO — calculé, non persisté>>
        +Float annualNetSalary
        +Float monthlyGrossSalary
        +Float monthlyNetSalary
        +Float annualWorkingHours
        +Float hourlyGrossSalary
        +Float hourlyNetSalary
        +Float dailyGrossSalary
        +Float dailyNetSalary
        +Float employeeMonthlyMealVoucherCost
        +Float employerMonthlyMealVoucherCost
    }
    class MonthlyPaySlip {
        +Long id
        +LocalDate period
        +Float grossSalary
        +Float taxableNetSalary
        +Float netSalary
        +Float incomeTaxWithholding
    }
    class ContractBonus {
        +Long id
        +String label
        +Float grossAmount
        +BonusTypeEnum type
        +LocalDate paymentDate
        +Integer paymentMonth
    }
    class BonusTypeEnum {
        EXCEPTIONNELLE
        ANNUELLE
    }
    class ContractBenefit {
        +Long id
        +String label
        +Float monthlyAmount
    }
    class OtherIncome {
        +Long id
        +OtherIncomeTypeEnum type
        +String label
        +Float amount
        +LocalDate date
        +Boolean isTaxable
        +Float specificTaxRate
    }
    class OtherIncomeTypeEnum {
        LOCATIF
        DIVIDENDE
        AIDE_SOCIALE
        AUTRE
    }
    class User {
        +Long id
        +String login
        +RoleEnum role
    }

    User "1" o-- "0..*" SalaryContract : salaryContracts
    SalaryContract ..> SalaryProjectionDto : calcule
    SalaryContract "1" o-- "0..*" MonthlyPaySlip : paySlips
    SalaryContract "1" o-- "0..*" ContractBonus : bonuses
    ContractBonus --> BonusTypeEnum : type
    SalaryContract "1" o-- "0..*" ContractBenefit : benefits
    User "1" o-- "0..*" OtherIncome : otherIncomes
    OtherIncome --> OtherIncomeTypeEnum : type
```

---

## Endpoints

### Contrats salariaux
| Méthode | URL | Description |
|---------|-----|-------------|
| `GET` | `/api/salary-contracts` | Liste des contrats de l'utilisateur connecté |
| `GET` | `/api/salary-contracts/{id}` | Détail + `SalaryProjectionDto` calculé |
| `POST` | `/api/salary-contracts` | Créer un contrat |
| `PUT` | `/api/salary-contracts/{id}` | Modifier un contrat |
| `DELETE` | `/api/salary-contracts/{id}` | Supprimer un contrat |

### Bulletins mensuels
| Méthode | URL | Description |
|---------|-----|-------------|
| `GET` | `/api/salary-contracts/{id}/pay-slips` | Liste des bulletins d'un contrat |
| `POST` | `/api/salary-contracts/{id}/pay-slips` | Ajouter un bulletin |
| `PUT` | `/api/salary-contracts/{id}/pay-slips/{slipId}` | Modifier un bulletin |
| `DELETE` | `/api/salary-contracts/{id}/pay-slips/{slipId}` | Supprimer un bulletin |

### Primes
| Méthode | URL | Description |
|---------|-----|-------------|
| `GET` | `/api/salary-contracts/{id}/bonuses` | Liste des primes d'un contrat |
| `POST` | `/api/salary-contracts/{id}/bonuses` | Ajouter une prime |
| `PUT` | `/api/salary-contracts/{id}/bonuses/{bonusId}` | Modifier une prime |
| `DELETE` | `/api/salary-contracts/{id}/bonuses/{bonusId}` | Supprimer une prime |

### Avantages en nature
| Méthode | URL | Description |
|---------|-----|-------------|
| `GET` | `/api/salary-contracts/{id}/benefits` | Liste des avantages d'un contrat |
| `POST` | `/api/salary-contracts/{id}/benefits` | Ajouter un avantage |
| `PUT` | `/api/salary-contracts/{id}/benefits/{benefitId}` | Modifier un avantage |
| `DELETE` | `/api/salary-contracts/{id}/benefits/{benefitId}` | Supprimer un avantage |

### Revenus complémentaires
| Méthode | URL | Description |
|---------|-----|-------------|
| `GET` | `/api/other-incomes` | Liste des revenus non salariés de l'utilisateur |
| `POST` | `/api/other-incomes` | Ajouter un revenu |
| `PUT` | `/api/other-incomes/{id}` | Modifier un revenu |
| `DELETE` | `/api/other-incomes/{id}` | Supprimer un revenu |

---

## Droits d'accès

| Action | Rôle requis |
|--------|------------|
| Gérer son contrat salarial | USER, ADMIN |
| Gérer ses bulletins mensuels | USER, ADMIN |
| Gérer ses primes | USER, ADMIN |
| Gérer ses avantages en nature | USER, ADMIN |
| Gérer ses revenus non salariés | USER, ADMIN |
| Consulter les données d'un autre utilisateur | ADMIN uniquement |

---

## Lien avec le Simulateur des impôts

Les données de revenus salariaux et complémentaires alimentent le **Simulateur des impôts** :

- `MonthlyPaySlip.taxableNetSalary` → utilisé si l'option "Bulletins réels" est choisie
- `NetImposableCalculator.calculer(annualGrossSalary, isCadre, employeePrevoyanceRate, taxParams)` → utilisé si l'option "Projection contrat" est choisie
- `OtherIncome.amount` (filtrés par `isTaxable` et `specificTaxRate`) → revenus complémentaires

La documentation complète du simulateur est dans [`docs/architecture/tax-simulator.md`](tax-simulator.md).
