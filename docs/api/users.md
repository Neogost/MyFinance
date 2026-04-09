# API — Utilisateurs

Base URL : `http://localhost:8080`

Swagger UI interactif disponible sur : `http://localhost:8080/swagger-ui.html`

Tous les endpoints sont réservés aux utilisateurs avec le rôle **ADMIN**.

---

## GET /api/users

Retourne la liste de tous les utilisateurs.

**Accès** : Admin

```http
GET /api/users
```

### Réponses

**200 OK**

```json
[
  {
    "id": 1,
    "login": "John",
    "firstName": "John",
    "lastName": "Doe",
    "role": "ADMIN"
  }
]
```

**401 Unauthorized** — Non authentifié.

**403 Forbidden** — Rôle insuffisant.

---

## GET /api/users/{id}

Retourne le détail d'un utilisateur.

**Accès** : Admin

```http
GET /api/users/1
```

### Réponses

**200 OK**

```json
{
  "id": 1,
  "login": "John",
  "firstName": "John",
  "lastName": "Doe",
  "role": "ADMIN"
}
```

**404 Not Found**

```json
{
  "message": "Utilisateur introuvable : 1"
}
```

---

## POST /api/users

Crée un nouvel utilisateur. Le mot de passe est hashé automatiquement (BCrypt).

**Accès** : Admin

```http
POST /api/users
Content-Type: application/json

{
  "firstName": "Marie",
  "lastName": "Dupont",
  "birthDate": "1990-05-14",
  "login": "marie.dupont",
  "password": "motdepasse",
  "role": "USER",
  "fiscalParts": 1.0,
  "useFlatRateDeduction": true,
  "customProfessionalDeduction": null
}
```

### Champs

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `firstName` | `string` | oui | Prénom |
| `lastName` | `string` | oui | Nom de famille |
| `birthDate` | `date` | non | Date de naissance (ISO 8601) |
| `login` | `string` | oui | Identifiant unique |
| `password` | `string` | oui | Mot de passe en clair |
| `role` | `string` | oui | `USER` ou `ADMIN` |
| `fiscalParts` | `number` | non | Parts fiscales (quotient familial). Défaut : `1.0`. Minimum : `0.5` |
| `useFlatRateDeduction` | `boolean` | non | `true` = abattement 10% ; `false` = frais réels. Défaut : `true` |
| `customProfessionalDeduction` | `number` | conditionnel | Obligatoire si `useFlatRateDeduction = false`. Montant en € (≥ 0) |

### Réponses

**201 Created**

```json
{
  "id": 2,
  "login": "marie.dupont",
  "firstName": "Marie",
  "lastName": "Dupont",
  "role": "USER",
  "fiscalParts": 1.0,
  "useFlatRateDeduction": true,
  "customProfessionalDeduction": null
}
```

**409 Conflict** — Login déjà utilisé.

---

## PUT /api/users/{id}

Modifie un utilisateur existant. Si `password` est absent ou vide, le mot de passe est inchangé.

**Accès** : Admin

```http
PUT /api/users/2
Content-Type: application/json

{
  "firstName": "Marie",
  "lastName": "Martin",
  "birthDate": "1990-05-14",
  "login": "marie.martin",
  "password": "",
  "role": "USER",
  "fiscalParts": 2.5,
  "useFlatRateDeduction": false,
  "customProfessionalDeduction": 3200.0
}
```

Champs identiques à POST — voir tableau ci-dessus.

### Réponses

**200 OK** — Retourne l'utilisateur mis à jour (même format que POST).

**404 Not Found** — Utilisateur introuvable.

**409 Conflict** — Login déjà utilisé par un autre utilisateur.

---

## DELETE /api/users/{id}

Supprime un utilisateur.

**Accès** : Admin

```http
DELETE /api/users/2
```

### Réponses

**204 No Content** — Suppression réussie.

**404 Not Found** — Utilisateur introuvable.

---

## Modèle `UserDto`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `number` | Identifiant unique |
| `login` | `string` | Nom d'utilisateur |
| `firstName` | `string` | Prénom |
| `lastName` | `string` | Nom de famille |
| `birthDate` | `date` | Date de naissance (nullable) |
| `role` | `string` | `USER` ou `ADMIN` |
| `fiscalParts` | `number` | Parts fiscales (quotient familial) |
| `useFlatRateDeduction` | `boolean` | Abattement forfaitaire 10% activé |
| `customProfessionalDeduction` | `number` | Frais réels déclarés en € (nullable) |

> Le mot de passe n'est jamais retourné dans les réponses.
