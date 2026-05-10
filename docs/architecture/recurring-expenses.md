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

### 2.3 Entité — `UserBudget`

Plafond mensuel défini par l'utilisateur pour une catégorie de dépense. Stocké en base et synchronisé entre tous ses appareils.

| Champ | Type Java | Colonne SQLite | Description |
|-------|-----------|----------------|-------------|
| `id` | `Long` | `id` | Identifiant auto-incrémenté |
| `user` | `User` | `user_id` (FK) | Propriétaire du budget |
| `category` | `ExpenseCategoryEnum` | `category` | Catégorie concernée |
| `monthlyLimit` | `Float` | `monthly_limit` | Plafond mensuel en € |

**Contrainte d'unicité :** `(user_id, category)` — un seul budget par catégorie et par utilisateur.

### 2.4 Diagramme de classes

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

    class UserBudget {
        +Long id
        +ExpenseCategoryEnum category
        +Float monthlyLimit
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
        ALIMENTATION
        EPARGNE
        AUTRE
    }

    User "1" o-- "0..*" RecurringExpense : expenses
    User "1" o-- "0..*" UserBudget : budgets
    RecurringExpense --> FrequencyEnum : frequency
    RecurringExpense --> ExpenseCategoryEnum : category
    UserBudget --> ExpenseCategoryEnum : category
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

### 4.0 Dépenses récurrentes

Préfixe : `/api/recurring-expenses`  
Accès : Utilisateur authentifié (toutes ses propres dépenses uniquement)

| Méthode | URL | Description |
|---------|-----|-------------|
| `GET` | `/api/recurring-expenses` | Liste toutes les dépenses récurrentes de l'utilisateur connecté (avec `monthlyAmount` et `annualAmount` calculés) |
| `POST` | `/api/recurring-expenses` | Créer une dépense récurrente |
| `PUT` | `/api/recurring-expenses/{id}` | Modifier une dépense (ownership vérifié) |
| `DELETE` | `/api/recurring-expenses/{id}` | Supprimer une dépense (ownership vérifié) |
| `GET` | `/api/recurring-expenses/summary` | Résumé : total par catégorie + capacité d'épargne calculée |

### 4.0b Budgets par catégorie

Préfixe : `/api/expense-budgets`  
Accès : Utilisateur authentifié

| Méthode | URL | Description |
|---------|-----|-------------|
| `GET` | `/api/expense-budgets` | Retourne la map `{ catégorie → plafond mensuel }` de l'utilisateur |
| `PUT` | `/api/expense-budgets` | Remplace intégralement les budgets de l'utilisateur (delete-then-saveAll) |

Réponse (GET et PUT) :
```json
{ "LOGEMENT": 900.0, "TRANSPORT": 200.0, "ABONNEMENTS": 80.0 }
```

Requête PUT :
```json
{ "budgets": { "LOGEMENT": 900.0, "TRANSPORT": 200.0 } }
```

> Envoyer une map vide (`{}`) supprime tous les budgets de l'utilisateur. Les catégories absentes de la map sont traitées comme "sans budget".

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
│   ├── UserBudget.java             (@Entity, UNIQUE user_id+category)
│   └── ExpenseCategoryEnum.java
│   └── FrequencyEnum.java
├── repository/
│   ├── RecurringExpenseRepository.java
│   └── UserBudgetRepository.java          (findByUser, deleteByUser)
├── service/
│   ├── RecurringExpenseService.java
│   └── UserBudgetService.java             (getBudgets, upsertAll @Transactional)
├── controller/
│   ├── RecurringExpenseController.java
│   └── UserBudgetController.java
└── dto/
    ├── RecurringExpenseDto.java           (record)
    ├── ExpenseSummaryDto.java             (record)
    ├── ExpenseCategorySummaryDto.java     (record)
    ├── CreateRecurringExpenseRequest.java (record)
    ├── UpdateRecurringExpenseRequest.java (record)
    └── UpsertUserBudgetsRequest.java      (record — Map<ExpenseCategoryEnum, Float>)
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
│   └── expenses.js                         # Appels API /api/recurring-expenses + /api/expense-budgets
└── components/
    └── expenses/
        ├── RecurringExpensePage.jsx         # Page principale (liste + résumé + éditeur de budgets)
        └── RecurringExpenseForm.jsx         # Modal création / édition
```

### 6.1 Navigation

Ajout d'un menu dédié **Dépenses** dans `Navigation.jsx`, au même niveau que Patrimoine et Revenus (bouton simple, sans dropdown dans un premier temps).

```
Dashboard | Patrimoine | Revenus ▾ | Dépenses | Outils ▾ | [ADMIN] | Mon profil | Déconnexion
```

### 6.2 Page principale — `RecurringExpensePage`

La page se compose de trois zones :

1. **Résumé capacité d'épargne** — en haut de page, 4 KPIs :
   - Revenus nets mensuels (avec tooltip de décomposition)
   - Total dépenses / mois
   - Capacité d'épargne (vert si ≥ 0, rouge sinon)
   - Taux d'épargne (vert ≥ 30 %, orange ≥ 10 %, rouge sinon)

2. **Répartition par catégorie** — barres horizontales avec **seuils de budget** :
   - Bouton **⚙ Budgets** : ouvre un éditeur inline pour définir un plafond mensuel par catégorie
   - Barres colorées selon le ratio dépenses réelles / plafond : vert (< 75 %), orange (75–100 %), rouge (> 100 %)
   - Les budgets sont persistés en base via `GET/PUT /api/expense-budgets` et synchronisés entre appareils
   - Mise à jour en temps réel lors de la saisie ; envoi explicite via le bouton **"Sauvegarder les budgets"**

3. **Liste des dépenses** — groupée par catégorie :
   - Affichage : libellé, montant saisi + fréquence, quote-part (si < 100 %), montant mensuel et annuel projeté
   - En-tête de catégorie : badge "⚠ Plafond dépassé" si budget défini et dépassé
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
| `UserBudgetServiceTest` | `getBudgets`, `upsertAll` (nominal, map vide, valeurs ≤ 0 ignorées) |
| `UserBudgetControllerTest` | GET/PUT 200, 401 sans auth, 400 corps invalide |

---

## 10. Calendrier des abonnements — spécification fonctionnelle

> **Statut : spécifié, non implémenté.**

### 10.1 Vision

Offrir une vue temporelle des prélèvements récurrents : savoir *quand* sortent les charges, combien un mois donné coûte, et anticiper les mois chargés. La fonctionnalité s'appuie entièrement sur les dépenses déjà saisies — aucune saisie supplémentaire n'est requise (seul un champ optionnel `paymentDay` est ajouté).

---

### 10.2 Modèle de données — évolution

#### Nouveau champ : `paymentDay`

| Champ | Type Java | Colonne SQLite | Contrainte | Description |
|-------|-----------|----------------|------------|-------------|
| `paymentDay` | `Integer` | `payment_day` | nullable, 1–28 | Jour du mois du prélèvement (mensuel uniquement) |

**Convention par fréquence :**

| Fréquence | Source de la date de prélèvement | Comportement si absent |
|-----------|-----------------------------------|------------------------|
| `MONTHLY` | `paymentDay` (1–28) | Ignorée dans le calendrier |
| `ANNUAL`  | `startDate` (jour + mois extraits) | Ignorée dans le calendrier si `startDate` est null |

> **Pourquoi 1–28 et pas 1–31 ?** Pour éviter les jours inexistants en février. Un prélèvement saisi le 29 serait silencieusement absent certains mois. On limite à 28, cohérent avec la réalité bancaire française (les banques n'acceptent pas les dates > 28 pour les prélèvements automatiques).

**Aucun autre champ ni table n'est nécessaire.** Tout le calcul du calendrier est effectué côté frontend à partir du `GET /api/recurring-expenses` existant.

**Migration :** `022_add_payment_day_to_recurring_expenses.sql`
```sql
ALTER TABLE recurring_expenses ADD COLUMN payment_day INTEGER;
```

---

### 10.3 Logique de calcul du calendrier

#### Règles de placement d'une dépense dans le calendrier

```
Pour chaque RecurringExpenseDto :

  Si frequency = MONTHLY :
    → placée le jour paymentDay de chaque mois
    → ignorée si paymentDay est null

  Si frequency = ANNUAL :
    → placée le jour startDate.dayOfMonth du mois startDate.monthValue, une fois par an
    → ignorée si startDate est null
```

#### Calcul du montant à afficher

Le montant affiché dans le calendrier est toujours le **montant effectif** (quote-part appliquée) :
```
montantAffiché = amount × (sharePercentage / 100)
```

Pour les dépenses annuelles, le montant affiché est le montant **brut annuel** (pas la projection mensuelle).

#### Total mensuel

```
totalDuMois = Σ montantAffiché des dépenses MONTHLY avec paymentDay défini
            + Σ montantAffiché des dépenses ANNUAL dont le mois correspond au mois affiché
```

---

### 10.4 Vues

Le calendrier expose **deux vues** sélectionnables via un toggle :

#### Vue Grille (calendrier mensuel)

- Grille classique 7 colonnes × 5–6 lignes pour le mois sélectionné
- Navigation précédent / suivant par mois, retour au mois courant
- Chaque jour portant au moins un prélèvement affiche :
  - Une pastille colorée par catégorie de dépense
  - Le total du jour au survol (tooltip)
- En-tête du mois : total des prélèvements du mois et nombre de lignes
- Les dépenses ANNUAL n'apparaissent que dans le mois correspondant

#### Vue Timeline (annuelle)

- 12 blocs mensuels pour l'année sélectionnée (navigation par an)
- Chaque bloc affiche :
  - Le mois et le total du mois
  - La liste des dépenses du mois (libellé, catégorie, montant effectif, date de prélèvement)
  - Les dépenses MONTHLY triées par `paymentDay` croissant
  - Les dépenses ANNUAL insérées à leur position chronologique
- Les dépenses sans date de prélèvement ne figurent pas dans la liste mais leur absence n'est pas signalée (le calendrier ne couvre que les dépenses datées)

#### Bandeau de synthèse (commun aux deux vues)

Affiché en permanence en haut de la page, il récapitule les dépenses **datées** uniquement :

| KPI | Calcul |
|-----|--------|
| Total annuel des abonnements datés | Σ annualAmount des dépenses avec date |
| Coût mensuel moyen | total annuel / 12 |
| Nombre d'abonnements datés | count |
| Mois le plus chargé | mois avec le plus grand `totalDuMois` |

---

### 10.5 Navigation — évolution

Le bouton simple **Dépenses** devient un **menu déroulant** `Dépenses ▾`, sur le même modèle que `Revenus ▾` et `Outils ▾` :

```
Dashboard | Patrimoine | Revenus ▾ | Dépenses ▾ | Outils ▾ | [ADMIN] | Mon profil | Déconnexion
                                         ├─ Mes dépenses
                                         └─ Calendrier
```

Sur mobile, les deux entrées apparaissent dans le menu hamburger sous une section "Dépenses".

---

### 10.6 Architecture frontend

```
frontend/src/
├── api/
│   └── expenses.js                              # inchangé — GET /api/recurring-expenses suffit
└── components/
    └── expenses/
        ├── RecurringExpensePage.jsx             # inchangé
        ├── RecurringExpenseForm.jsx             # +champ paymentDay (conditionnel si MONTHLY)
        ├── SubscriptionCalendarPage.jsx         # nouveau — page principale du calendrier
        ├── CalendarGridView.jsx                 # nouveau — vue grille mensuelle
        └── CalendarTimelineView.jsx             # nouveau — vue timeline annuelle
```

#### `SubscriptionCalendarPage`

Responsabilités :
- Charge les dépenses via `GET /api/recurring-expenses` au montage
- Filtre celles qui ont une date de prélèvement exploitable
- Calcule le calendrier côté client (pas de nouvel endpoint)
- Gère l'état : `viewMode` (`GRID` | `TIMELINE`), `selectedMonth`, `selectedYear`
- Affiche le bandeau de synthèse + le toggle de vue + la vue active

#### `CalendarGridView`

Props : `expenses[]`, `month` (1–12), `year`, `onMonthChange`

Logique interne :
- Construit la grille des jours du mois
- Pour chaque jour, filtre les dépenses dont `paymentDay === jour` (MONTHLY) ou dont `startDate.dayOfMonth === jour && startDate.month === month` (ANNUAL)
- Pastilles colorées par `category` (couleur de la catégorie)

#### `CalendarTimelineView`

Props : `expenses[]`, `year`, `onYearChange`

Logique interne :
- Itère sur les 12 mois
- Pour chaque mois, collecte les dépenses MONTHLY + ANNUAL du mois
- Trie par `paymentDay` / jour de `startDate`

#### Mise à jour de `RecurringExpenseForm`

Ajout du champ `paymentDay` :
- Visible uniquement si `frequency === 'MONTHLY'`
- Input numérique 1–28 (ou select avec 1 à 28), non obligatoire
- Label : "Jour de prélèvement (optionnel)"
- Pour ANNUAL : note informative — "Le jour de prélèvement est déduit de la date de début"

---

### 10.7 API — évolution minimale

Aucun nouvel endpoint. Seuls les DTOs et les request records existants sont enrichis :

| DTO / Record | Modification |
|---|---|
| `RecurringExpenseDto` | + champ `Integer paymentDay` |
| `CreateRecurringExpenseRequest` | + champ `Integer paymentDay` (nullable) |
| `UpdateRecurringExpenseRequest` | + champ `Integer paymentDay` (nullable) |

Validation ajoutée dans `RecurringExpenseService` :
```
si paymentDay != null → doit être dans [1, 28]
si frequency = ANNUAL → paymentDay ignoré côté backend (non persisté — la date vient de startDate)
```

> **Note :** On pourrait aussi persister `paymentDay` pour ANNUAL à des fins d'affichage, mais `startDate` suffit et évite la redondance.

---

### 10.8 Règles métier

1. `paymentDay` n'a de sens que pour les dépenses `MONTHLY`. Pour `ANNUAL`, c'est `startDate` qui fait foi.
2. Une dépense sans date exploitable n'est pas affichée dans le calendrier (ni en grille, ni en timeline) — elle continue d'apparaître normalement dans la page "Mes dépenses".
3. Le calendrier n'affiche que les dépenses **actives** (`endDate == null` ou `endDate >= aujourd'hui`).
4. La modification d'une dépense (ex : changement de `paymentDay`) se répercute immédiatement dans le calendrier lors du prochain chargement.
5. Le bandeau de synthèse ne comptabilise que les dépenses *avec date*, pour refléter fidèlement ce qui est planifié.

---

### 10.9 Tests

| Classe de test | Cas couverts |
|----------------|--------------|
| `RecurringExpenseServiceTest` | Validation `paymentDay` hors [1,28] → 400 ; `paymentDay` null accepté ; `paymentDay` sur ANNUAL ignoré |
| `RecurringExpenseControllerTest` | GET retourne `paymentDay` ; PUT accepte et persiste `paymentDay` |
| `SubscriptionCalendarPage.test.jsx` | Calcul correct du total mensuel ; dépense ANNUAL placée au bon mois ; dépenses sans date absentes du calendrier |

---

### 10.10 Points d'attention pour l'implémentation

| Point | Détail |
|-------|--------|
| **Jours variables** | Février a 28/29 jours. Un `paymentDay = 28` est affiché le 28 en février, ce qui est correct. On interdit > 28 à la saisie pour éviter tout cas limite. |
| **Fuseau horaire** | Tout en `LocalDate` côté backend, calculs `Date` JS côté frontend — utiliser `date-fns` ou calcul natif JS sans `new Date()` sur des strings ISO pour éviter les décalages UTC. |
| **Performance** | `GET /api/recurring-expenses` retourne au maximum quelques dizaines de lignes — le calcul frontend est négligeable, aucune pagination nécessaire. |
| **Dépense active vs terminée** | Utiliser `endDate` pour exclure les dépenses terminées du calendrier (déjà géré par le filtre frontend existant). |

---

## 11. Évolutions futures envisagées

| Évolution | Description |
|-----------|-------------|
| **Cumul progressif** | Ajouter une courbe de cumul annuel dans la vue timeline (total dépensé depuis le 1er janvier) |
| **Graphique d'évolution** | Historisation mensuelle des dépenses pour visualiser leur évolution dans le tableau de bord |
| **Import automatique** | Import depuis un relevé bancaire (CSV/OFX) pour détecter les dépenses récurrentes |
| **Regroupements familiaux** | Partager une dépense entre plusieurs membres d'un groupe (future feature `FamilyGroup`) |
| **Catégories personnalisées** | Permettre à l'utilisateur de créer ses propres catégories |
