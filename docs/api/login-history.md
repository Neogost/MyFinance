# API — Historique des connexions

> Rôle requis : **ADMIN** sur tous les endpoints de ce module.

---

## Endpoints

### `GET /api/admin/login-history`

Retourne l'historique paginé des événements d'authentification.

**Paramètres de requête**

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `login` | String | non | Filtre sur le login (recherche partielle, insensible à la casse) |
| `type` | `LoginEventType` | non | Filtre sur le type : `SUCCESS`, `FAILURE`, `BLOCKED` |
| `from` | ISO-8601 datetime | non | Borne inférieure de la période (ex : `2026-04-01T00:00:00`) |
| `to` | ISO-8601 datetime | non | Borne supérieure de la période |
| `page` | Integer | non | Numéro de page (défaut : `0`) |
| `size` | Integer | non | Taille de page (défaut : `50`, max : `200`) |

**Réponse 200**

```json
{
  "content": [
    {
      "id": 1,
      "login": "kevin",
      "eventType": "SUCCESS",
      "ipAddress": "192.168.1.10",
      "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
      "failureCount": null,
      "timestamp": "2026-04-22T08:32:14"
    },
    {
      "id": 2,
      "login": "kevin",
      "eventType": "FAILURE",
      "ipAddress": "192.168.1.10",
      "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
      "failureCount": 2,
      "timestamp": "2026-04-22T08:31:50"
    },
    {
      "id": 3,
      "login": "admin",
      "eventType": "BLOCKED",
      "ipAddress": "10.0.0.5",
      "userAgent": "curl/8.1.0",
      "failureCount": null,
      "timestamp": "2026-04-22T07:15:03"
    }
  ],
  "totalElements": 312,
  "totalPages": 7,
  "number": 0,
  "size": 50
}
```

**Codes de retour**

| Code | Description |
|------|-------------|
| 200 | Liste retournée (peut être vide) |
| 401 | Non authentifié |
| 403 | Rôle insuffisant (non ADMIN) |

---

## Types de données

### `LoginEventType`

| Valeur | Signification |
|--------|---------------|
| `SUCCESS` | Authentification réussie — login + mot de passe corrects |
| `FAILURE` | Échec d'authentification — mot de passe incorrect ou login inconnu |
| `BLOCKED` | Requête rejetée par le filtre anti-brute-force avant même la vérification du mot de passe |

### `LoginEventDto`

| Champ | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | Long | non | Identifiant de l'événement |
| `login` | String | non | Login tenté |
| `eventType` | LoginEventType | non | Type d'événement |
| `ipAddress` | String | oui | Adresse IP source (null si non disponible) |
| `userAgent` | String | oui | En-tête User-Agent du navigateur |
| `failureCount` | Integer | oui | Nombre d'échecs consécutifs au moment de l'événement (null pour SUCCESS) |
| `timestamp` | LocalDateTime | non | Horodatage UTC de l'événement |

---

## Exemples de requêtes

**Tous les événements d'échec des 24 dernières heures :**
```
GET /api/admin/login-history?type=FAILURE&from=2026-04-21T00:00:00
```

**Historique d'un login spécifique :**
```
GET /api/admin/login-history?login=kevin&size=20
```

**Détection d'attaque — blocages récents :**
```
GET /api/admin/login-history?type=BLOCKED&from=2026-04-22T00:00:00
```

---

## Sources d'événements

Les événements sont générés automatiquement par le backend :

| Source | Événement généré |
|--------|-----------------|
| `SecurityConfig` — success handler | `SUCCESS` |
| `SecurityConfig` — failure handler | `FAILURE` |
| `LoginRateLimitFilter` — requête bloquée | `BLOCKED` |

Aucun endpoint d'écriture n'est exposé — l'historique est en lecture seule pour l'admin.
