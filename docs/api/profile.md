# API — Profil utilisateur

Base URL : `http://localhost:8080`

Swagger UI interactif disponible sur : `http://localhost:8080/swagger-ui.html`

Ces endpoints permettent à l'utilisateur connecté de gérer son propre profil sans passer par les endpoints d'administration (`/api/users`). Tous les endpoints retournent le `UserDto` complet après mise à jour.

---

## Vue d'ensemble

| Méthode | URL | Description |
|---------|-----|-------------|
| `PUT` | `/api/profile/safety-net` | Mettre à jour le matelas de sécurité |
| `PUT` | `/api/profile/fiscal` | Mettre à jour le profil fiscal (parts, abattement, frais réels) |
| `PUT` | `/api/profile/personal-info` | Mettre à jour les informations personnelles (déclaration de patrimoine) |
| `GET` | `/api/profile/data-summary` | Compteurs des données qui seraient supprimées |
| `DELETE` | `/api/profile/data` | Supprimer toutes ses données **et** son compte (mot de passe requis) |
| `DELETE` | `/api/profile/data-only` | Supprimer toutes ses données, compte conservé (mot de passe requis) |

**Accès** : authentifié (utilisateur connecté — ses propres données uniquement)

---

## PUT /api/profile/safety-net

Met à jour la configuration du matelas de sécurité de l'utilisateur connecté.

```http
PUT /api/profile/safety-net
Content-Type: application/json
```

### Modes disponibles

| `safetyNetMode` | Description | Champ associé |
|-----------------|-------------|---------------|
| `MONTHS_EXPENSES` | N mois de dépenses récurrentes | `safetyNetMonths` |
| `MONTHS_SALARY` | N mois de salaire net | `safetyNetMonths` |
| `FIXED_AMOUNT` | Montant fixe en euros | `safetyNetAmount` |

### Corps de la requête — mode MONTHS_EXPENSES / MONTHS_SALARY

```json
{
  "safetyNetMode": "MONTHS_EXPENSES",
  "safetyNetMonths": 3.0,
  "safetyNetAmount": null
}
```

### Corps de la requête — mode FIXED_AMOUNT

```json
{
  "safetyNetMode": "FIXED_AMOUNT",
  "safetyNetMonths": null,
  "safetyNetAmount": 10000.0
}
```

### Champs

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `safetyNetMode` | `string` | oui | `MONTHS_EXPENSES`, `MONTHS_SALARY` ou `FIXED_AMOUNT` |
| `safetyNetMonths` | `number` | si mode MONTHS_* | Nombre de mois (ex : 3.0) |
| `safetyNetAmount` | `number` | si mode FIXED_AMOUNT | Montant fixe en euros |

### Réponses

**200 OK** — Retourne le `UserDto` complet mis à jour.

**400 Bad Request** — Données invalides (ex : `safetyNetMonths` absent pour un mode MONTHS_*).

---

## PUT /api/profile/fiscal

Met à jour le profil fiscal de l'utilisateur connecté : quotient familial et modalités d'abattement professionnel (forfaitaire ou frais réels détaillés).

```http
PUT /api/profile/fiscal
Content-Type: application/json
```

### Corps de la requête — abattement forfaitaire 10 %

```json
{
  "fiscalParts": 1.0,
  "useFlatRateDeduction": true,
  "customProfessionalDeduction": null,
  "realExpensesTransportKm": null,
  "realExpensesTransportCv": null,
  "realExpensesTransportElectric": null,
  "realExpensesPublicTransport": null,
  "realExpensesMeals": null,
  "realExpensesClothing": null,
  "realExpensesTraining": null,
  "realExpensesEquipment": null,
  "realExpensesPhone": null,
  "realExpensesDoubleResidence": null,
  "realExpensesOther": null,
  "realExpensesTeleworkDays": null,
  "realExpensesTeleworkEmployerDaily": null
}
```

### Corps de la requête — frais réels détaillés

Quand `useFlatRateDeduction = false`, les champs `realExpenses*` sont utilisés pour calculer automatiquement `customProfessionalDeduction` via `ProfileService.computeTotalRealExpenses()`.

```json
{
  "fiscalParts": 2.5,
  "useFlatRateDeduction": false,
  "customProfessionalDeduction": null,
  "realExpensesTransportKm": 8000,
  "realExpensesTransportCv": 5,
  "realExpensesTransportElectric": false,
  "realExpensesPublicTransport": 960.0,
  "realExpensesMeals": 720.0,
  "realExpensesClothing": null,
  "realExpensesTraining": null,
  "realExpensesEquipment": 350.0,
  "realExpensesPhone": 240.0,
  "realExpensesDoubleResidence": null,
  "realExpensesOther": null,
  "realExpensesTeleworkDays": 80,
  "realExpensesTeleworkEmployerDaily": 2.5
}
```

### Champs

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `fiscalParts` | `number` | non | Quotient familial (ex : `1.0`, `2.5`). Min : `0.5` |
| `useFlatRateDeduction` | `boolean` | non | `true` = abattement 10% (min 504 €, max 13 522 €) ; `false` = frais réels |
| `customProfessionalDeduction` | `number` | non | Frais réels calculés (€) — renseigné automatiquement par le service |
| `realExpensesTransportKm` | `integer` | non | Kilométrage domicile-travail aller-retour annuel |
| `realExpensesTransportCv` | `integer` | non | Puissance fiscale : 3, 4, 5, 6, 7 (= 7 CV et plus) |
| `realExpensesTransportElectric` | `boolean` | non | Véhicule électrique (multiplicateur ×1.20 sur le barème) |
| `realExpensesPublicTransport` | `number` | non | Abonnements transport en commun (€/an) |
| `realExpensesMeals` | `number` | non | Frais de repas (€/an) |
| `realExpensesClothing` | `number` | non | Vêtements professionnels spécifiques (€/an) |
| `realExpensesTraining` | `number` | non | Formation professionnelle (€/an) |
| `realExpensesEquipment` | `number` | non | Matériel et fournitures professionnels (€/an) |
| `realExpensesPhone` | `number` | non | Téléphone/internet — part professionnelle (€/an) |
| `realExpensesDoubleResidence` | `number` | non | Double résidence (€/an) |
| `realExpensesOther` | `number` | non | Autres frais justifiés (€/an) |
| `realExpensesTeleworkDays` | `integer` | non | Jours de télétravail par an |
| `realExpensesTeleworkEmployerDaily` | `number` | non | Remboursement employeur télétravail (€/jour, déduit des frais) |

### Réponses

**200 OK** — Retourne le `UserDto` complet mis à jour. Le champ `customProfessionalDeduction` reflète le total des frais réels calculé si `useFlatRateDeduction = false`.

---

## PUT /api/profile/personal-info

Met à jour les informations personnelles utilisées dans la **déclaration de patrimoine** (lieu de naissance, code postal de naissance, intitulé de poste).

```http
PUT /api/profile/personal-info
Content-Type: application/json

{
  "birthPlace": "Paris",
  "birthPostalCode": "75001",
  "jobTitle": "Ingénieur logiciel"
}
```

### Champs

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `birthPlace` | `string` | non | Lieu de naissance |
| `birthPostalCode` | `string` | non | Code postal de naissance |
| `jobTitle` | `string` | non | Intitulé de poste actuel |

### Réponses

**200 OK** — Retourne le `UserDto` complet mis à jour.

---

## DELETE /api/profile/data

Supprime **toutes les données** de l'utilisateur connecté **et son compte**. Action irréversible. Re-authentification par mot de passe obligatoire pour neutraliser une exploitation via XSS.

```http
DELETE /api/profile/data
Content-Type: application/json

{
  "currentPassword": "MonMotDePasse1!"
}
```

### Réponses

| Code | Raison |
|------|--------|
| 204 | Compte et données supprimés |
| 400 | `currentPassword` manquant ou vide |
| 401 | Mot de passe incorrect ou non authentifié |

---

## DELETE /api/profile/data-only

Identique à `/api/profile/data` mais **conserve** le compte (l'utilisateur peut continuer à se connecter, les données reprennent à zéro).

```http
DELETE /api/profile/data-only
Content-Type: application/json

{
  "currentPassword": "MonMotDePasse1!"
}
```

### Réponses

| Code | Raison |
|------|--------|
| 204 | Données supprimées, compte conservé |
| 400 | `currentPassword` manquant ou vide |
| 401 | Mot de passe incorrect ou non authentifié |

---

## Codes d'erreur communs

| Code | Raison |
|------|--------|
| 400 | Données invalides (mode matelas manquant, fiscalParts < 0.5, etc.) |
| 401 | Non authentifié |
