# API — Authentification

Base URL : `http://localhost:8080`

Swagger UI interactif disponible sur : `http://localhost:8080/swagger-ui.html`

Tous les endpoints retournent du JSON (`Content-Type: application/json`).
La session est maintenue via un cookie `JSESSIONID` géré automatiquement par le navigateur.

---

## POST /api/auth/login

Authentifie un utilisateur et ouvre une session.

**Accès** : public

### Requête

Corps en `application/x-www-form-urlencoded` (form login Spring Security).

| Champ      | Type     | Obligatoire | Description            |
|------------|----------|-------------|------------------------|
| `username` | `string` | oui         | Login de l'utilisateur |
| `password` | `string` | oui         | Mot de passe en clair  |

```http
POST /api/auth/login
Content-Type: application/x-www-form-urlencoded

username=admin&password=motdepasse
```

### Réponses

**200 OK** — Le cookie `JSESSIONID` est positionné dans les headers de réponse.

```json
{
  "id": 1,
  "login": "admin",
  "firstName": "Jean",
  "lastName": "Dupont",
  "role": "ADMIN"
}
```

**401 Unauthorized**

```json
{
  "message": "Identifiants incorrects"
}
```

---

## POST /api/auth/logout

Invalide la session courante.

**Accès** : authentifié

```http
POST /api/auth/logout
```

### Réponses

**200 OK**

```json
{
  "message": "Déconnexion réussie"
}
```

**401 Unauthorized**

```json
{
  "message": "Non authentifié"
}
```

---

## GET /api/auth/me

Retourne l'utilisateur associé à la session courante.

**Accès** : authentifié

```http
GET /api/auth/me
```

### Réponses

**200 OK**

```json
{
  "id": 1,
  "login": "admin",
  "firstName": "Jean",
  "lastName": "Dupont",
  "role": "ADMIN"
}
```

**401 Unauthorized**

```json
{
  "message": "Non authentifié"
}
```

---

## Modèle `UserDto`

| Champ       | Type     | Description              |
|-------------|----------|--------------------------|
| `id`        | `number` | Identifiant unique        |
| `login`     | `string` | Nom d'utilisateur         |
| `firstName` | `string` | Prénom                    |
| `lastName`  | `string` | Nom de famille            |
| `role`      | `string` | `USER` ou `ADMIN`         |

> Le mot de passe n'est jamais retourné dans les réponses.
