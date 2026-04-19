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
  "role": "ADMIN",
  "birthDate": "1990-05-14"
}
```

> `birthDate` peut être `null` si non renseigné sur le profil utilisateur.

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

## PUT /api/auth/password

Permet à l'utilisateur connecté de changer son propre mot de passe.

**Accès** : authentifié

```http
PUT /api/auth/password
Content-Type: application/json

{
  "currentPassword": "ancien_mdp",
  "newPassword": "nouveau_mdp"
}
```

### Champs

| Champ             | Type     | Obligatoire | Description              |
|-------------------|----------|-------------|--------------------------|
| `currentPassword` | `string` | oui         | Mot de passe actuel      |
| `newPassword`     | `string` | oui         | Nouveau mot de passe     |

### Réponses

**204 No Content** — Mot de passe modifié avec succès.

**401 Unauthorized** — Mot de passe actuel incorrect.

**400 Bad Request** — Champs manquants ou vides.

> Pour qu'un admin change le mot de passe d'un autre utilisateur, utiliser `PUT /api/users/{id}` avec le champ `password`.

---

## Modèle `UserDto`

| Champ       | Type     | Description              |
|-------------|----------|--------------------------|
| `id`        | `number` | Identifiant unique        |
| `login`     | `string` | Nom d'utilisateur         |
| `firstName` | `string` | Prénom                    |
| `lastName`  | `string` | Nom de famille            |
| `role`      | `string` | `USER` ou `ADMIN`         |
| `birthDate` | `string` | Date de naissance ISO (nullable), ex : `"1990-05-14"` |

> Le mot de passe n'est jamais retourné dans les réponses.

---

## Gestion de session

| Paramètre | Valeur | Note |
|-----------|--------|------|
| Durée de vie session | **12 heures** | Configuré via `server.servlet.session.timeout=12h` |
| Cookie | `JSESSIONID` | `HttpOnly=true`, `SameSite=Strict` |
| Restauration au refresh | **Oui** | Le frontend appelle `GET /api/auth/me` au démarrage et restaure la session si le cookie est encore valide |

Le frontend utilise le pattern suivant dans `App.jsx` au montage :

```js
useEffect(() => {
  getMe()
    .then(setUser)      // session valide → restaure l'utilisateur
    .catch(() => {})    // 401 → affiche le formulaire de connexion
    .finally(() => setAuthLoading(false))
}, [])
```
