# Historique des connexions — Architecture

Vue admin permettant de consulter l'historique des tentatives de connexion et connexions réussies,
dans le but de détecter les tentatives d'intrusion.

---

## Objectif

Tracer chaque événement d'authentification (succès, échec, blocage anti-brute-force) et exposer
cet historique à l'administrateur via une page dédiée avec filtres et indicateurs visuels.

---

## Entité JPA — `LoginEvent`

Table : `login_events`

| Colonne | Type SQL | Nullable | Description |
|---------|----------|----------|-------------|
| `id` | INTEGER (PK) | non | Identifiant auto-incrémenté |
| `login` | VARCHAR | non | Login tenté (même si inexistant) |
| `event_type` | VARCHAR | non | `SUCCESS`, `FAILURE`, `BLOCKED` |
| `ip_address` | VARCHAR | oui | Adresse IP du client |
| `user_agent` | VARCHAR(500) | oui | En-tête User-Agent du navigateur |
| `failure_count` | INTEGER | oui | Nombre d'échecs consécutifs au moment de l'événement (null pour SUCCESS) |
| `timestamp` | DATETIME | non | Horodatage UTC de l'événement |

**Remarque :** pas de FK vers `users` — le login tenté peut être inexistant (attaque par login inconnu).
L'IP et le User-Agent permettent de corréler des tentatives depuis une même source.

---

## Enum — `LoginEventType`

```
SUCCESS  — authentification réussie
FAILURE  — mot de passe incorrect ou login inexistant
BLOCKED  — requête bloquée par le filtre anti-brute-force (LoginRateLimitFilter)
```

---

## Service — `LoginHistoryService`

Méthodes exposées :

| Méthode | Description |
|---------|-------------|
| `logSuccess(login, ip, userAgent)` | Persiste un événement SUCCESS, remet `failureCount` à null |
| `logFailure(login, ip, userAgent, failureCount)` | Persiste un événement FAILURE avec le compteur courant |
| `logBlocked(login, ip, userAgent)` | Persiste un événement BLOCKED |
| `getHistory(login, type, from, to, page, size)` | Requête paginée avec filtres optionnels |

**Choix de conception :**
- Les méthodes de log sont appelées de façon **non-bloquante** (pas de transaction parente) — un échec de persistance de l'événement ne doit pas affecter la réponse d'authentification.
- Aucune logique de décision n'est dans ce service — il ne fait que persister et lire.

---

## Points d'intégration dans l'authentification existante

### `SecurityConfig` — success/failure handlers

Les handlers JSON existants sont étendus pour appeler `LoginHistoryService` :

```
Success handler  → logSuccess(login, ip, userAgent)
Failure handler  → logFailure(login, ip, userAgent, failureCount courant depuis LoginAttemptService)
```

L'IP est extraite via `HttpServletRequest.getRemoteAddr()`.
Le User-Agent provient du header `User-Agent`.

### `LoginRateLimitFilter`

Quand une requête est bloquée (avant même Spring Security), le filtre appelle :

```
logBlocked(login, ip, userAgent)
```

Le login est extrait du paramètre `username` du formulaire.

---

## Controller — `AdminLoginHistoryController`

Endpoint : `GET /api/admin/login-history`  
Rôle requis : `ADMIN`

**Paramètres de requête (tous optionnels) :**

| Paramètre | Type | Description |
|-----------|------|-------------|
| `login` | String | Filtre sur le login tenté (contient, insensible à la casse) |
| `type` | `LoginEventType` | Filtre sur le type d'événement |
| `from` | ISO datetime | Borne inférieure de la période |
| `to` | ISO datetime | Borne supérieure de la période |
| `page` | int (défaut 0) | Numéro de page |
| `size` | int (défaut 50) | Taille de page |

**Réponse :** `Page<LoginEventDto>`

---

## DTO — `LoginEventDto`

```
id           Long
login        String
eventType    LoginEventType
ipAddress    String (nullable)
userAgent    String (nullable)
failureCount Integer (nullable)
timestamp    LocalDateTime
```

---

## Frontend — `LoginHistoryPage`

Page accessible depuis la navigation (ADMIN uniquement), route : `admin-login-history`.

### Disposition

```
En-tête
├── Titre "Historique des connexions"
└── Filtres : login (texte), type (SELECT), plage de dates

Tableau paginé (50 lignes/page)
├── Horodatage
├── Login
├── Type  (badge coloré : vert SUCCESS / orange FAILURE / rouge BLOCKED)
├── Adresse IP
└── User-Agent (tronqué avec tooltip)

Indicateurs visuels
├── Ligne rouge    → BLOCKED
├── Ligne orange   → FAILURE
└── Ligne verte    → SUCCESS
```

### Détection d'intrusion — signaux à surveiller

L'interface met en évidence les situations suspectes :

| Signal | Critère | Affichage |
|--------|---------|-----------|
| Attaque ciblée | ≥ 5 FAILURE/BLOCKED sur le même login dans les 10 dernières minutes | Badge "⚠ Activité suspecte" en rouge dans le filtre login |
| Source unique | Plusieurs logins différents depuis la même IP | IP affichée en orange |
| Blocage actif | Dernier événement BLOCKED < `maxLockMinutes` | Badge "Compte verrouillé" sur la ligne |

Ces calculs sont effectués **en frontend** à partir des données déjà paginées — pas de endpoint dédié.

---

## Couche API frontend — `src/api/admin.js`

```js
export const getLoginHistory = (params) =>
  client.get('/api/admin/login-history', { params }).then(r => r.data)
```

`params` est un objet `{ login, type, from, to, page, size }` avec clés optionnelles.

---

## Rétention des données

Pas de purge automatique dans un premier temps — la base SQLite est mono-utilisateur locale,
le volume d'événements reste faible. Une tâche `@Scheduled` pourra être ajoutée si nécessaire
(supprimer les événements > 90 jours).

---

## Checklist d'implémentation

### Backend
- [ ] Enum `LoginEventType` dans `domain/`
- [ ] Entité `LoginEvent` dans `domain/`
- [ ] Repository `LoginEventRepository` dans `repository/`
- [ ] DTO `LoginEventDto` dans `dto/`
- [ ] Service `LoginHistoryService` dans `service/`
- [ ] Controller `AdminLoginHistoryController` dans `controller/`
- [ ] Intégration dans `SecurityConfig` (success + failure handlers)
- [ ] Intégration dans `LoginRateLimitFilter` (blocked)
- [ ] Test `LoginHistoryServiceTest` dans `test/`
- [ ] Test `AdminLoginHistoryControllerTest` dans `test/`

### Frontend
- [ ] `src/api/admin.js` — couche API
- [ ] `src/components/admin/LoginHistoryPage.jsx` — page principale
- [ ] Route `admin-login-history` dans `App.jsx`
- [ ] Bouton "Historique connexions" dans `Navigation.jsx` (ADMIN)

### Documentation
- [ ] `docs/api/login-history.md` — référence API
- [ ] Mise à jour `docs/architecture/diagram/class-diagram.mmd`
- [ ] Mise à jour `CLAUDE.md` (endpoints + statut)
