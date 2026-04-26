# API — Utilisateurs

Base URL : `http://localhost:8080`

Swagger UI interactif disponible sur : `http://localhost:8080/swagger-ui.html`

Tous les endpoints de ce fichier sont réservés aux utilisateurs avec le rôle **ADMIN**.

Pour la gestion du profil de l'utilisateur connecté (matelas de sécurité, profil fiscal, informations personnelles), voir [`docs/api/profile.md`](profile.md).

---

## GET /api/users

Retourne la liste de tous les utilisateurs.

**Accès** : ADMIN

```http
GET /api/users
```

### Réponses

**200 OK**

```json
[
  {
    "id": 1,
    "login": "jean.dupont",
    "firstName": "Jean",
    "lastName": "Dupont",
    "birthDate": "1990-05-14",
    "role": "ADMIN",
    "fiscalParts": 1.0,
    "useFlatRateDeduction": true,
    "customProfessionalDeduction": null,
    "familyGroupId": null,
    "safetyNetMode": "MONTHS_EXPENSES",
    "safetyNetMonths": 3.0,
    "safetyNetAmount": null,
    "birthPlace": null,
    "birthPostalCode": null,
    "jobTitle": null,
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
]
```

**401 Unauthorized** — Non authentifié.

**403 Forbidden** — Rôle insuffisant.

---

## GET /api/users/{id}

Retourne le détail d'un utilisateur.

**Accès** : ADMIN

```http
GET /api/users/1
```

### Réponses

**200 OK** — Même format que la liste.

**404 Not Found**

```json
{ "message": "Utilisateur introuvable : 1" }
```

---

## POST /api/users

Crée un nouvel utilisateur. Le mot de passe est hashé automatiquement (BCrypt).

**Accès** : ADMIN

```http
POST /api/users
Content-Type: application/json

{
  "firstName": "Marie",
  "lastName": "Dupont",
  "birthDate": "1990-05-14",
  "login": "marie.dupont",
  "password": "MonMotDePasse1",
  "role": "USER"
}
```

### Champs

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `firstName` | `string` | oui | Prénom |
| `lastName` | `string` | oui | Nom de famille |
| `birthDate` | `date` | non | Date de naissance (ISO 8601), ex : `"1990-05-14"` |
| `login` | `string` | oui | Identifiant unique |
| `password` | `string` | oui | Mot de passe en clair (min 8 car., 1 maj., 1 min., 1 chiffre) |
| `role` | `string` | oui | `USER` ou `ADMIN` |

### Réponses

**201 Created** — Retourne l'utilisateur créé (`UserDto`).

**409 Conflict** — Login déjà utilisé.

---

## PUT /api/users/{id}

Modifie un utilisateur existant. Si `password` est absent ou vide, le mot de passe est inchangé.

**Accès** : ADMIN

```http
PUT /api/users/2
Content-Type: application/json

{
  "firstName": "Marie",
  "lastName": "Martin",
  "birthDate": "1990-05-14",
  "login": "marie.martin",
  "password": "",
  "role": "USER"
}
```

Champs identiques à POST.

### Réponses

**200 OK** — Retourne l'utilisateur mis à jour (`UserDto`).

**404 Not Found** — Utilisateur introuvable.

**409 Conflict** — Login déjà utilisé par un autre utilisateur.

---

## DELETE /api/users/{id}

Supprime un utilisateur.

**Accès** : ADMIN

```http
DELETE /api/users/2
```

### Réponses

**204 No Content** — Suppression réussie.

**404 Not Found** — Utilisateur introuvable.

---

## Modèle `UserDto`

Retourné par tous les endpoints utilisateurs ainsi que par `/api/auth/me` et `/api/profile/*`.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `number` | Identifiant unique |
| `login` | `string` | Nom d'utilisateur |
| `firstName` | `string` | Prénom |
| `lastName` | `string` | Nom de famille |
| `birthDate` | `date\|null` | Date de naissance ISO 8601 (nullable) |
| `role` | `string` | `USER` ou `ADMIN` |
| `familyGroupId` | `number\|null` | Identifiant du groupe familial (nullable) |
| `fiscalParts` | `number\|null` | Parts fiscales — quotient familial (ex : `1.0`, `2.5`) |
| `useFlatRateDeduction` | `boolean\|null` | `true` = abattement forfaitaire 10% ; `false` = frais réels |
| `customProfessionalDeduction` | `number\|null` | Montant total des frais réels calculé (€) — renseigné par `ProfileService` |
| `safetyNetMode` | `string\|null` | `MONTHS_EXPENSES`, `MONTHS_SALARY` ou `FIXED_AMOUNT` |
| `safetyNetMonths` | `number\|null` | Nombre de mois — utilisé pour `MONTHS_EXPENSES` et `MONTHS_SALARY` |
| `safetyNetAmount` | `number\|null` | Montant fixe (€) — utilisé pour `FIXED_AMOUNT` |
| `birthPlace` | `string\|null` | Lieu de naissance — déclaration de patrimoine |
| `birthPostalCode` | `string\|null` | Code postal de naissance — déclaration de patrimoine |
| `jobTitle` | `string\|null` | Intitulé de poste — déclaration de patrimoine |
| `realExpensesTransportKm` | `number\|null` | Kilométrage domicile-travail aller-retour annuel |
| `realExpensesTransportCv` | `number\|null` | Puissance fiscale : 3, 4, 5, 6 ou 7 (= 7 CV et plus) |
| `realExpensesTransportElectric` | `boolean\|null` | Véhicule électrique (multiplicateur ×1.20 sur le barème) |
| `realExpensesPublicTransport` | `number\|null` | Abonnements transport en commun (€/an) |
| `realExpensesMeals` | `number\|null` | Frais de repas (€/an) |
| `realExpensesClothing` | `number\|null` | Vêtements professionnels spécifiques (€/an) |
| `realExpensesTraining` | `number\|null` | Formation professionnelle (€/an) |
| `realExpensesEquipment` | `number\|null` | Matériel et fournitures professionnels (€/an) |
| `realExpensesPhone` | `number\|null` | Téléphone/internet — part professionnelle (€/an) |
| `realExpensesDoubleResidence` | `number\|null` | Double résidence (€/an) |
| `realExpensesOther` | `number\|null` | Autres frais justifiés (€/an) |
| `realExpensesTeleworkDays` | `number\|null` | Jours de télétravail par an |
| `realExpensesTeleworkEmployerDaily` | `number\|null` | Remboursement employeur télétravail (€/jour) |

> Le mot de passe n'est jamais retourné dans les réponses.

> `customProfessionalDeduction` est calculé automatiquement par `ProfileService.computeTotalRealExpenses()` à partir des champs `realExpenses*` quand `useFlatRateDeduction = false`. Il peut aussi être saisi directement.
