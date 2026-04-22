# Matelas de sécurité

## Vue d'ensemble

Le **matelas de sécurité** est la réserve de liquidités qu'un utilisateur maintient pour faire face aux imprévus (perte d'emploi, dépense exceptionnelle, etc.) avant de pouvoir investir sereinement le surplus.

La fonctionnalité permet à l'utilisateur de **définir son objectif de matelas** selon trois modes, puis de **visualiser sa couverture actuelle** en comparant cet objectif à la somme de ses positions `LIVRET` et `LIQUIDITE` actives.

---

## 1. Modes de calcul de l'objectif

L'utilisateur choisit l'un des trois modes suivants dans son profil :

| Mode | Enum | Description | Calcul de l'objectif |
|------|------|-------------|----------------------|
| Mois de dépenses | `MONTHS_EXPENSES` | N mois de dépenses récurrentes mensuelles | `safetyNetMonths × totalMonthlyExpenses` |
| Mois de salaire | `MONTHS_SALARY` | N mois de salaire net mensuel | `safetyNetMonths × activeNetMonthlySalary` |
| Seuil fixe | `FIXED_AMOUNT` | Montant cible en EUR saisi directement | `safetyNetAmount` |

Les modes `MONTHS_EXPENSES` et `MONTHS_SALARY` utilisent des données déjà disponibles dans l'API :
- **Dépenses** : `totalMonthlyExpenses` issu de `GET /api/recurring-expenses/summary` (champ `totalMonthlyAmount`)
- **Salaire** : revenu net mensuel du contrat actif (`monthlyNetAfterTax`) issu de `GET /api/salary-contracts` (premier contrat avec `status = ACTIVE`)

Si les données sources sont absentes (aucun contrat, aucune dépense saisie), l'objectif calculé est `null` et l'indicateur affiche un message d'invitation à compléter les données.

---

## 2. Modèle de données

### 2.1 Champs ajoutés sur l'entité `User`

Trois champs **nullables** sont ajoutés directement sur l'entité `User` (pas de nouvelle table).

| Champ Java | Colonne SQLite | Type | Description |
|------------|----------------|------|-------------|
| `safetyNetMode` | `safety_net_mode` | `TEXT` (enum) | Mode de calcul : `MONTHS_EXPENSES`, `MONTHS_SALARY`, `FIXED_AMOUNT` — null si non configuré |
| `safetyNetMonths` | `safety_net_months` | `REAL` | Nombre de mois cibles (modes `MONTHS_EXPENSES` et `MONTHS_SALARY`) |
| `safetyNetAmount` | `safety_net_amount` | `REAL` | Montant cible en EUR (mode `FIXED_AMOUNT`) |

**Règle de cohérence :** si `safetyNetMode` est non null, le champ associé doit être renseigné :
- `MONTHS_EXPENSES` ou `MONTHS_SALARY` → `safetyNetMonths > 0`
- `FIXED_AMOUNT` → `safetyNetAmount > 0`

### 2.2 Enum `SafetyNetMode`

```java
package com.myfinance.domain;

public enum SafetyNetMode {
    MONTHS_EXPENSES,
    MONTHS_SALARY,
    FIXED_AMOUNT
}
```

### 2.3 DTO

Les champs sont exposés dans `UserDto` (record existant) avec 3 nouveaux champs :

```java
public record UserDto(
    // ... champs existants ...
    SafetyNetMode safetyNetMode,        // null si non configuré
    Double        safetyNetMonths,
    Double        safetyNetAmount
) { ... }
```

Ils sont également acceptés dans `UpdateUserRequest` (requête existante) et dans une nouvelle requête dédiée `UpdateSafetyNetRequest` pour la page Profil.

---

## 3. API

Un endpoint dédié évite de passer par le CRUD admin des utilisateurs pour une mise à jour self-service :

| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `PUT` | `/api/profile/safety-net` | Authentifié | Met à jour les paramètres du matelas de l'utilisateur connecté |

### Requête `PUT /api/profile/safety-net`

```json
{
  "safetyNetMode":   "MONTHS_EXPENSES",
  "safetyNetMonths": 4.0,
  "safetyNetAmount": null
}
```

La validation côté backend vérifie la cohérence mode ↔ valeur : si le mode est `MONTHS_EXPENSES` ou `MONTHS_SALARY`, `safetyNetMonths` doit être > 0 ; si le mode est `FIXED_AMOUNT`, `safetyNetAmount` doit être > 0.

> **Note :** `GET /api/auth/me` et `GET /api/users/{id}` retournent déjà les trois champs via `UserDto` — aucun nouvel endpoint de lecture n'est nécessaire.

---

## 4. Calcul du matelas actuel

Le calcul est réalisé **côté frontend** en combinant les données existantes — aucune logique backend nouvelle.

```
currentSafetyNet = Σ currentValueEur des positions ACTIVE
                   où category ∈ { LIVRET, LIQUIDITE }
```

Sources : `GET /api/positions` (déjà chargé dans `PatrimoinePage`).

### Calcul de l'objectif selon le mode

| Mode | Calcul |
|------|--------|
| `MONTHS_EXPENSES` | `safetyNetMonths × summary.totalMonthlyAmount` |
| `MONTHS_SALARY` | `safetyNetMonths × activeContract.monthlyNetAfterTax` |
| `FIXED_AMOUNT` | `safetyNetAmount` |

### Indicateur de couverture

```
coveragePct = currentSafetyNet / targetSafetyNet × 100
```

| État | Condition | Couleur |
|------|-----------|---------|
| Insuffisant | `coveragePct < 80` | Rouge |
| Presque atteint | `80 ≤ coveragePct < 100` | Ambre |
| Objectif atteint | `coveragePct ≥ 100` | Emerald |

---

## 5. Points d'intégration UI

### 5.1 Page Profil — saisie

Nouvelle section **"Matelas de sécurité"** dans la page `ProfilPage` :
- Sélecteur de mode (3 options radio ou select)
- Champ numérique conditionnel :
  - Modes `MONTHS_EXPENSES` / `MONTHS_SALARY` → `"Nombre de mois"` (ex : 3, 4, 6)
  - Mode `FIXED_AMOUNT` → `"Montant cible (€)"`
- Bouton "Enregistrer" → `PUT /api/profile/safety-net`
- Aperçu en temps réel du montant cible calculé (si données sources disponibles)

### 5.2 Tableau de bord — widget

Un widget **"Matelas de sécurité"** est ajouté dans la section **"Revenus & Dépenses"** du dashboard, affichant :
- Valeur actuelle LIVRET + LIQUIDITE
- Objectif calculé
- Barre de progression colorée (rouge / ambre / emerald)
- Message contextuel : `"X mois couverts"` ou `"X € manquants"`

Si le matelas n'est pas configuré : invitation à configurer depuis le profil.

### 5.3 Page Patrimoine — indicateur sur les cartes

Les cartes de catégorie `LIVRET` et `LIQUIDITE` dans `PatrimoinePage` affichent une mention supplémentaire sous la valeur :
- `"Matelas : X mois couverts"` ou `"Matelas : objectif atteint"` en vert
- `"Matelas : X € manquants"` en rouge

---

## 6. Structure des fichiers

```
backend/
├── domain/SafetyNetMode.java                     — NOUVEAU enum
├── domain/User.java                              — +3 champs nullable
├── dto/UserDto.java                              — +3 champs
├── dto/UpdateSafetyNetRequest.java               — NOUVEAU record de requête
├── service/ProfileService.java                   — NOUVEAU : updateSafetyNet(user, request)
├── controller/ProfileController.java             — NOUVEAU : PUT /api/profile/safety-net

frontend/src/
├── api/profile.js (ou auth.js)                   — +updateSafetyNet(data)
├── components/profile/ProfilPage.jsx             — +section matelas
├── components/dashboard/SafetyNetWidget.jsx      — NOUVEAU widget dashboard
└── components/patrimoine/PatrimoinePage.jsx      — indicateur sur cartes LIVRET/LIQUIDITE
```

---

## 7. Non-requis (hors périmètre)

- Pas d'historique des paramètres du matelas
- Pas de mode famille : le matelas est strictement personnel
- Pas de prise en compte de l'assurance chômage ou de l'épargne salariale dans le calcul du "risque couvert"
- Pas de recommandation automatique du nombre de mois (valeur fixe par défaut : non)
