# Gestion des dépenses récurrentes

## Vue d'ensemble

La gestion des dépenses récurrentes permet à chaque utilisateur de saisir ses charges fixes ou périodiques afin de calculer sa **capacité d'épargne mensuelle**, définie comme :

```
Capacité d'épargne = Revenus nets mensuels − Total dépenses mensuelles projetées
```

Chaque dépense est saisie avec une **fréquence** (mensuelle ou annuelle). Le système effectue automatiquement la projection inverse :

| Fréquence saisie | Projection calculée |
|-----------------|---------------------|
| Mensuelle | × 12 → montant annuel projeté |
| Annuelle | ÷ 12 → montant mensuel projeté |

Dans le cadre d'une **colocation** ou d'une dépense partagée, l'utilisateur peut indiquer sa **part réelle** (en %) afin que seul son quote-part soit pris en compte dans le calcul. Exemple : loyer de 1 000 € partagé à 50 % → quote-part = 500 €/mois.

---

## 1. Catégories de dépenses

Les dépenses sont regroupées en huit catégories (`ExpenseCategoryEnum`) :

| Catégorie | Enum | Exemples typiques |
|-----------|------|-------------------|
| Logement | `LOGEMENT` | Loyer, remboursement prêt immobilier, charges de copropriété, assurance habitation, taxe foncière, électricité, gaz, eau, internet |
| Transport | `TRANSPORT` | Remboursement crédit auto / LOA / LLD, assurance véhicule, abonnement transports en commun, entretien véhicule |
| Assurances & Prévoyance | `ASSURANCES` | Mutuelle santé complémentaire, prévoyance / invalidité, assurance emprunteur |
| Abonnements & Numérique | `ABONNEMENTS` | Téléphone mobile, streaming vidéo (Netflix, Canal+…), streaming musique (Spotify…), cloud (iCloud, Google One…), presse numérique |
| Santé & Bien-être | `SANTE` | Salle de sport, activités sportives, soins réguliers non remboursés |
| Famille & Enfants | `FAMILLE` | Crèche, garde d'enfants, activités extra-scolaires, pension alimentaire, frais scolaires |
| Alimentation | `ALIMENTATION` | Courses alimentaires, abonnements de livraison de repas |
| Épargne programmée | `EPARGNE` | Virement automatique vers PEA / CTO, versement assurance-vie, versement livret (traité comme une charge sortante du courant) |
| Autre | `AUTRE` | Toute dépense récurrente non classifiable |

> **Choix de conception :** L'`EPARGNE` est volontairement une catégorie de dépense pour modéliser les virements automatiques vers les comptes d'investissement depuis le compte courant. Elle est distincte du module Patrimoine qui, lui, enregistre les positions et leur valorisation.

---

## 2. Modèle de données

### 2.1 Entité — `RecurringExpense`

| Champ | Type Java | Colonne SQLite | Description |
|-------|-----------|----------------|-------------|
| `id` | `Long` | `id` | Identifiant auto-incrémenté |
| `user` | `User` | `user_id` (FK) | Propriétaire de la dépense |
| `category` | `ExpenseCategoryEnum` | `category` | Catégorie (voir § 1) |
| `label` | `String` | `label` | Libellé libre (ex : "Loyer Paris") |
| `amount` | `Float` | `amount` | Montant brut saisi (en €) |
| `frequency` | `FrequencyEnum` | `frequency` | Fréquence de la dépense (`MONTHLY` / `ANNUAL`) |
| `sharePercentage` | `Float` | `share_percentage` | Part de l'utilisateur en % (défaut : 100.0). Utilisé pour la colocation |
| `startDate` | `LocalDate` | `start_date` | Date de début (nullable — si connue) |
| `endDate` | `LocalDate` | `end_date` | Date de fin (nullable = dépense en cours) |
| `notes` | `String` | `notes` | Notes libres (nullable) |

**Règle :** `sharePercentage` doit être compris entre 0.01 et 100.0.

### 2.2 Enums

```java
public enum FrequencyEnum {
    MONTHLY,   // Dépense mensuelle
    ANNUAL     // Dépense annuelle (ex : assurance, abonnement annuel)
}

public enum ExpenseCategoryEnum {
    LOGEMENT,
    TRANSPORT,
    ASSURANCES,
    ABONNEMENTS,
    SANTE,
    FAMILLE,
    ALIMENTATION,
    EPARGNE,
    AUTRE
}
```

### 2.3 Diagramme de classes

```mermaid
classDiagram
    class User {
        +Long id
        +String firstName
        +String lastName
        +String login
        +RoleEnum role
    }

    class RecurringExpense {
        +Long id
        +ExpenseCategoryEnum category
        +String label
        +Float amount
        +FrequencyEnum frequency
        +Float sharePercentage
        +LocalDate startDate
        +LocalDate endDate
        +String notes
    }

    class FrequencyEnum {
        MONTHLY
        ANNUAL
    }

    class ExpenseCategoryEnum {
        LOGEMENT
        TRANSPORT
        ASSURANCES
        ABONNEMENTS
        SANTE
        FAMILLE
        EPARGNE
        AUTRE
    }

    User "1" o-- "0..*" RecurringExpense : expenses
    RecurringExpense --> FrequencyEnum : frequency
    RecurringExpense --> ExpenseCategoryEnum : category
```

---

## 3. Calculs de projection

Les montants projetés sont calculés à la volée dans le DTO (`RecurringExpenseDto`) et ne sont jamais persistés.

### 3.1 Formules de base

```
montantEffectif  = amount × (sharePercentage / 100)

si frequency = MONTHLY :
    monthlyAmount = montantEffectif
    annualAmount  = montantEffectif × 12

si frequency = ANNUAL :
    annualAmount  = montantEffectif
    monthlyAmount = montantEffectif / 12
```

### 3.2 Calcul de la capacité d'épargne

La capacité d'épargne est calculée dans un DTO de synthèse (`ExpenseSummaryDto`) qui agrège :

1. **Revenus nets mensuels** — issus du contrat salarial actif (`SalaryContract.endDate = null`) :
   - Source : `annualNetAfterTax / paidMonthsPerYear` (depuis `SalaryContractDto`)
   - Plus : revenus complémentaires mensualisés (`OtherIncome`)

2. **Total dépenses mensuelles projetées** — somme des `monthlyAmount` de toutes les dépenses actives (sans `endDate` ou dont `endDate` est dans le futur)

3. **Capacité d'épargne** :

```
capacitéÉpargne = revenuNetMensuel − totalDépensesMensuelles
```

> **Remarque :** Si l'utilisateur n'a pas de contrat salarial actif (ou si le profil fiscal est incomplet et que `netAfterTax` est `null`), la capacité d'épargne est affichée avec le `netImposable` comme revenu de référence, avec un avertissement.

### 3.3 Agrégation par catégorie

Le résumé expose aussi le total mensuel et annuel par catégorie, pour permettre une visualisation en graphique (camembert des charges ou barres empilées).

---

## 4. API REST

Préfixe : `/api/recurring-expenses`  
Accès : Utilisateur authentifié (toutes ses propres dépenses uniquement)

| Méthode | URL | Description |
|---------|-----|-------------|
| `GET` | `/api/recurring-expenses` | Liste toutes les dépenses récurrentes de l'utilisateur connecté (avec `monthlyAmount` et `annualAmount` calculés) |
| `POST` | `/api/recurring-expenses` | Créer une dépense récurrente |
| `PUT` | `/api/recurring-expenses/{id}` | Modifier une dépense (ownership vérifié) |
| `DELETE` | `/api/recurring-expenses/{id}` | Supprimer une dépense (ownership vérifié) |
| `GET` | `/api/recurring-expenses/summary` | Résumé : total par catégorie + capacité d'épargne calculée |

### 4.1 Requête de création / modification

```json
{
  "category": "LOGEMENT",
  "label": "Loyer Paris 11e",
  "amount": 1000.00,
  "frequency": "MONTHLY",
  "sharePercentage": 50.0,
  "startDate": "2024-01-01",
  "endDate": null,
  "notes": "Colocation avec Thomas"
}
```

### 4.2 Réponse — `RecurringExpenseDto`

```json
{
  "id": 1,
  "category": "LOGEMENT",
  "label": "Loyer Paris 11e",
  "amount": 1000.00,
  "frequency": "MONTHLY",
  "sharePercentage": 50.0,
  "monthlyAmount": 500.00,
  "annualAmount": 6000.00,
  "startDate": "2024-01-01",
  "endDate": null,
  "notes": "Colocation avec Thomas"
}
```

### 4.3 Réponse — `ExpenseSummaryDto`

```json
{
  "monthlyNetIncome": 3200.00,
  "incomeSource": "NET_AFTER_TAX",
  "totalMonthlyExpenses": 1850.00,
  "totalAnnualExpenses": 22200.00,
  "savingsCapacity": 1350.00,
  "savingsRate": 42.19,
  "byCategory": [
    { "category": "LOGEMENT",    "monthlyAmount": 800.00,  "annualAmount": 9600.00  },
    { "category": "TRANSPORT",   "monthlyAmount": 350.00,  "annualAmount": 4200.00  },
    { "category": "ABONNEMENTS", "monthlyAmount": 150.00,  "annualAmount": 1800.00  },
    { "category": "ASSURANCES",  "monthlyAmount": 100.00,  "annualAmount": 1200.00  },
    { "category": "SANTE",       "monthlyAmount": 50.00,   "annualAmount":  600.00  },
    { "category": "EPARGNE",     "monthlyAmount": 400.00,  "annualAmount": 4800.00  }
  ]
}
```

Champs de `ExpenseSummaryDto` :

| Champ | Description |
|-------|-------------|
| `monthlyNetIncome` | Revenu net mensuel de référence (net d'impôt si disponible, net imposable sinon) |
| `incomeSource` | Source utilisée : `NET_AFTER_TAX` ou `NET_IMPOSABLE` (avertissement frontend si fallback) |
| `totalMonthlyExpenses` | Somme des `monthlyAmount` de toutes les dépenses actives |
| `totalAnnualExpenses` | Projection annuelle totale |
| `savingsCapacity` | `monthlyNetIncome − totalMonthlyExpenses` |
| `savingsRate` | `savingsCapacity / monthlyNetIncome × 100` (en %) |
| `byCategory` | Tableau agrégé par catégorie |

---

## 5. Architecture backend

Suit les mêmes conventions que les autres modules :

```
com.myfinance
├── domain/
│   ├── RecurringExpense.java       (@Entity)
│   └── ExpenseCategoryEnum.java
│   └── FrequencyEnum.java
├── repository/
│   └── RecurringExpenseRepository.java
├── service/
│   └── RecurringExpenseService.java
├── controller/
│   └── RecurringExpenseController.java
└── dto/
    ├── RecurringExpenseDto.java           (record)
    ├── ExpenseSummaryDto.java             (record)
    ├── ExpenseCategorySummaryDto.java     (record)
    ├── CreateRecurringExpenseRequest.java (record)
    └── UpdateRecurringExpenseRequest.java (record)
```

`RecurringExpenseService` injecte :
- `RecurringExpenseRepository`
- `SalaryContractRepository` (ou `SalaryContractService`) → pour lire le revenu net du contrat actif
- `OtherIncomeRepository` → pour agréger les revenus complémentaires dans la synthèse

---

## 6. Architecture frontend

```
frontend/src/
├── api/
│   └── expenses.js                         # Appels API /api/recurring-expenses
└── components/
    └── expenses/
        ├── RecurringExpensePage.jsx         # Page principale (liste + résumé)
        ├── RecurringExpenseForm.jsx         # Modal création / édition
        └── ExpenseSummaryPanel.jsx          # Bloc capacité d'épargne + répartition par catégorie
```

### 6.1 Navigation

Ajout d'un menu dédié **Dépenses** dans `Navigation.jsx`, au même niveau que Patrimoine et Revenus (bouton simple, sans dropdown dans un premier temps).

```
Dashboard | Patrimoine | Revenus ▾ | Dépenses | Outils ▾ | [ADMIN] | Mon profil | Déconnexion
```

### 6.2 Page principale — `RecurringExpensePage`

La page se compose de deux zones :

1. **Résumé capacité d'épargne** (`ExpenseSummaryPanel`) — en haut de page :
   - Ligne de chiffres clés : Revenus nets / Total dépenses / Capacité d'épargne / Taux d'épargne
   - Graphique camembert (Recharts Pie) des dépenses par catégorie

2. **Liste des dépenses** — tableau ou liste de cartes :
   - Groupées par catégorie
   - Affichage : libellé, montant saisi + fréquence, quote-part (si < 100 %), montant mensuel et annuel projeté
   - Actions : modifier / supprimer

### 6.3 Formulaire — `RecurringExpenseForm`

Modal avec les champs :
- Catégorie (select avec les 8 catégories)
- Libellé (texte libre)
- Montant (numérique)
- Fréquence (toggle Mensuel / Annuel)
- Part (%) — champ conditionnel, affiché avec un indicateur "Mode colocation" et un aperçu du montant effectif
- Date de début (optionnel)
- Date de fin (optionnel — laisser vide = en cours)
- Notes (optionnel)

---

## 7. Flux de saisie

```mermaid
stateDiagram-v2
    state "Page Dépenses" as page
    state "Formulaire de saisie" as form
    state "Validation" as validate
    state "Sauvegarde" as save
    state "Affichage résumé mis à jour" as summary

    [*] --> page
    page --> form : Nouvelle dépense
    form --> validate : Soumettre
    validate --> save : OK
    validate --> form : Erreurs de saisie
    save --> summary : Rechargement du résumé
    summary --> page
```

---

## 8. Règles métier

1. **Ownership strict** : un utilisateur ne peut voir, modifier ou supprimer que ses propres dépenses. Le service vérifie `expense.user.id == currentUser.id` et lève une `ResponseStatusException(403)` sinon.
2. **Dépense active** : une dépense est considérée active si `endDate == null` ou `endDate >= today`. Seules les dépenses actives sont prises en compte dans le résumé.
3. **Quote-part** : `sharePercentage` doit être dans `]0 ; 100]`. Une valeur de 100 % est équivalente à une dépense sans répartition.
4. **Absence de contrat salarial actif** : le calcul de la capacité d'épargne reste disponible mais affiche un avertissement ("Aucun revenu salarial actif — revenus = 0 €").
5. **Revenus complémentaires** : inclus dans le revenu mensuel de référence au prorata de leur fréquence (les `OtherIncome` annuels sont divisés par 12).

---

## 9. Tests unitaires

Suivent les conventions du projet :

| Classe de test | Contenu |
|----------------|---------|
| `RecurringExpenseServiceTest` | CRUD, calcul de projection, capacité d'épargne, vérification ownership, fallback `NET_IMPOSABLE` |
| `RecurringExpenseControllerTest` | Tous les endpoints, authentification, validation des DTOs |

---

## 10. Évolutions futures envisagées

| Évolution | Description |
|-----------|-------------|
| **Graphique d'évolution** | Historisation mensuelle des dépenses pour visualiser leur évolution dans le tableau de bord |
| **Import automatique** | Import depuis un relevé bancaire (CSV/OFX) pour détecter les dépenses récurrentes |
| **Regroupements familiaux** | Partager une dépense entre plusieurs membres d'un groupe (future feature `FamilyGroup`) |
| **Alertes de dépassement** | Notification si la capacité d'épargne devient négative |
| **Catégories personnalisées** | Permettre à l'utilisateur de créer ses propres catégories |
