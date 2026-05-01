# Analytics & Suivi des erreurs — Architecture

Système d'observabilité unifié couvrant à la fois le **comportement utilisateur** (pages vues,
features utilisées, boutons cliqués) et la **santé technique** (erreurs backend / frontend).

L'objectif est de pouvoir répondre, depuis une seule page admin, à deux familles de questions :

1. **Produit** : quelles fonctionnalités sont les plus utilisées ? quel parcours emprunte un utilisateur ? sur quoi investir en priorité ?
2. **Technique** : quelles erreurs reviennent le plus souvent ? sont-elles corrélées à une action utilisateur précise ?

> **Statut :** livré en v1.6.0.

---

## Principes directeurs

- **100 % auto-hébergé** : aucune donnée envoyée à un tiers (Google Analytics, Mixpanel, PostHog cloud).
  Cohérent avec la nature financière des données et l'hébergement NAS.
- **Aucune donnée financière dans les events** : on track *quoi est utilisé*, jamais *combien vaut un actif* ni *quel montant est saisi*.
  Une whitelist explicite régit les clés de `metadata` autorisées.
- **Non-bloquant** : la persistance d'un event ne doit jamais affecter la latence d'une requête utilisateur (`@Async` côté backend).
- **Corrélation comportement ↔ erreur** : un `session_id` partagé permet de relier une erreur à la dernière action utilisateur.
- **Admin only** : la consultation des événements est réservée au rôle `ADMIN`. L'admin voit l'ensemble des données de tous les utilisateurs (incluant les membres des groupes familiaux), sans aucun filtrage.
- **Opt-out utilisateur** : chaque utilisateur peut désactiver le tracking de son propre usage depuis son profil. Les events ne sont alors plus persistés (mais les `ErrorLog` continuent — santé technique préservée).

---

## Modèle de données

### Entité — `AnalyticsEvent`

Table : `analytics_events`

| Colonne | Type SQL | Nullable | Description |
|---------|----------|----------|-------------|
| `id` | INTEGER (PK) | non | Identifiant auto-incrémenté |
| `user_id` | INTEGER (FK users) | oui | Utilisateur connecté (null si anonyme — page de login) |
| `session_id` | VARCHAR(36) | non | UUID de session frontend (cookie/localStorage, régénéré au login) |
| `event_type` | VARCHAR | non | `PAGE_VIEW`, `BUTTON_CLICK`, `FEATURE_USE`, `FORM_SUBMIT` |
| `event_name` | VARCHAR(100) | non | Identifiant hiérarchique `module.feature.action` (cf. *Convention de nommage*) |
| `page` | VARCHAR(100) | oui | Page courante (`patrimoine`, `tax-simulator`, …) |
| `metadata` | TEXT (JSON) | oui | Contexte additionnel (cf. whitelist) |
| `created_at` | DATETIME | non | Horodatage UTC |

**Index :**
- `(event_type, created_at)` — agrégations par type sur une période
- `(event_name, created_at)` — top features
- `(user_id, created_at)` — parcours par utilisateur
- `(session_id)` — reconstruction d'un parcours

### Entité — `ErrorLog`

Table : `error_logs`

| Colonne | Type SQL | Nullable | Description |
|---------|----------|----------|-------------|
| `id` | INTEGER (PK) | non | Identifiant auto-incrémenté |
| `user_id` | INTEGER (FK users) | oui | Utilisateur impacté (null si anonyme ou erreur infra) |
| `session_id` | VARCHAR(36) | oui | Pour corréler avec le dernier event analytics |
| `source` | VARCHAR | non | `BACKEND` ou `FRONTEND` |
| `level` | VARCHAR | non | `WARN`, `ERROR`, `FATAL` |
| `error_type` | VARCHAR(200) | non | Classe d'exception Java ou type d'erreur JS (`NullPointerException`, `TypeError`, `HTTP_500`) |
| `message` | TEXT | non | Message d'erreur lisible |
| `stack_trace` | TEXT | oui | Stack trace complète (tronquée à 4 ko) |
| `request_method` | VARCHAR(10) | oui | `GET`, `POST`, `PUT`, `DELETE`, `PATCH` |
| `request_path` | VARCHAR(500) | oui | Path HTTP appelé (sans query string) |
| `http_status` | INTEGER | oui | Code HTTP retourné (500, 404, etc.) |
| `metadata` | TEXT (JSON) | oui | Contexte additionnel (User-Agent, version frontend, …) |
| `fingerprint` | VARCHAR(64) | non | Hash SHA-256 de `(error_type + premier frame de stack normalisé)` — sert au regroupement |
| `created_at` | DATETIME | non | Horodatage UTC |

**Index :**
- `(fingerprint, created_at)` — regrouper les occurrences d'une même erreur
- `(source, level, created_at)` — vue santé globale
- `(user_id, created_at)` — erreurs vécues par un utilisateur

> **Note rétention :** ces deux tables peuvent grossir vite. Voir section *Rétention*.

---

## Enums

```
EventType  — PAGE_VIEW, BUTTON_CLICK, FEATURE_USE, FORM_SUBMIT
ErrorSource — BACKEND, FRONTEND
ErrorLevel  — WARN, ERROR, FATAL
```

---

## Convention de nommage des events

Les `event_name` suivent une **taxonomie hiérarchique en 3 segments séparés par des points** :

```
{module}.{feature}.{action}
```

| Segment | Description | Exemples |
|---------|-------------|----------|
| `module` | Grand domaine fonctionnel | `patrimoine`, `revenus`, `tools`, `dashboard`, `admin`, `auth` |
| `feature` | Fonctionnalité précise dans le module | `position`, `lombard`, `salary_contract`, `tax_simulator` |
| `action` | Verbe d'action | `view`, `create`, `edit`, `delete`, `simulate`, `export`, `submit` |

**Exemples concrets :**

```
tools.lombard.simulate          — lancement d'une simulation Lombard
tools.tax_simulator.run         — calcul fiscal exécuté
patrimoine.position.create      — création d'une position
patrimoine.position.edit        — édition d'une position
revenus.salary_contract.create  — création d'un contrat
admin.instrument.price_update   — mise à jour manuelle des cours
dashboard.fire_widget.view      — affichage du widget FIRE
```

**Règles :**
- Tout en `snake_case` à l'intérieur de chaque segment
- Toujours **3 segments** — jamais plus, jamais moins
- Le `module` doit correspondre à un grand domaine du menu de navigation
- Validation côté backend : regex `^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$` — un event qui ne respecte pas le format est rejeté (logué en WARN, pas persisté)

Cette taxonomie permet des agrégations naturelles côté admin :
- Top par module : `GROUP BY split_part(event_name, '.', 1)`
- Top par feature dans un module : filtrer `event_name LIKE 'tools.%'`
- Comparer les actions sur un objet : `event_name LIKE 'patrimoine.position.%'`

---

## Cycle de vie du `session_id`

- **Génération** : à chaque login réussi, le frontend génère un nouvel UUID v4 et le stocke en **`sessionStorage`** (et non `localStorage` — cohérent avec l'authentification par session).
- **Renouvellement** : un nouveau `sessionId` est généré à chaque login. Pas de réutilisation entre sessions de connexion.
- **Réinitialisation** : effacé du `sessionStorage` au logout (`/api/auth/logout`).
- **Multi-onglet** : `sessionStorage` est isolé par onglet — chaque onglet a donc son propre `sessionId`. Acceptable car la corrélation event ↔ erreur reste cohérente à l'intérieur d'un parcours.
- **Anonyme (avant login)** : aucun `sessionId` n'est généré tant que l'utilisateur n'est pas authentifié. Les events anonymes (page de login, erreur frontend pré-auth) ont `session_id = null`.
- **Transmission** : injecté dans toutes les requêtes via le header HTTP `X-Session-Id` par l'intercepteur axios.

---

## Whitelist metadata

Les clés autorisées dans `AnalyticsEvent.metadata` sont strictement listées dans
`AnalyticsService.ALLOWED_METADATA_KEYS` :

```
duration_ms        — temps passé (page view, simulation)
result_count       — nombre de résultats (recherches, listes)
filter_used        — nom du filtre appliqué (sans valeur)
category           — catégorie métier (BOURSE, IMMO_PHYSIQUE, …)
view_mode          — mode d'affichage (grouped, flat, monthly, annual)
contract_type      — PRIVATE / PUBLIC (pas de salaire)
envelope           — CTO, PEA, AV, PER (sans montant)
```

**Toute clé non whitelistée est silencieusement ignorée** côté backend. Cette règle
prévient les fuites accidentelles (un dev qui logge `{ amount: 50000 }`).

---

## Service backend — `AnalyticsService`

Méthodes exposées :

| Méthode | Description |
|---------|-------------|
| `trackEvent(userId, sessionId, type, name, page, metadata)` | Persiste un event (annoté `@Async`) |
| `logError(userId, sessionId, source, level, errorType, message, stack, requestCtx, metadata)` | Persiste une erreur, calcule le `fingerprint` |
| `getTopEvents(eventType, from, to, limit)` | Top N events sur la période |
| `getEventTimeline(eventName, from, to, granularity)` | Série temporelle d'un event (jour/semaine) |
| `getUserJourney(sessionId)` | Reconstitution du parcours d'une session |
| `getErrorGroups(source, level, from, to)` | Erreurs groupées par `fingerprint` (count, premier/dernier vu) |
| `getErrorOccurrences(fingerprint, page, size)` | Détail des occurrences d'une erreur |

**Choix de conception :**
- `@Async("analyticsExecutor")` — pool **single-thread** dédié (`corePoolSize=1`, `maxPoolSize=1`), queue 1000.
  Le single-thread sérialise les écritures et évite les `database is locked` propres à SQLite en cas
  d'accès concurrent. Si la queue déborde, l'event est ignoré (politique `DiscardPolicy`) — la dégradation
  est silencieuse, jamais bloquante.
- Validation centralisée des `metadata` (filtre whitelist).
- Validation du format `event_name` (regex hiérarchique en 3 segments) — event rejeté si invalide.
- Vérification de l'opt-out utilisateur en début de `trackEvent` : si `user.analyticsOptOut == true`,
  retour immédiat sans persistance. La règle ne s'applique pas à `logError` (la santé technique
  reste captée dans tous les cas).
- Calcul du `fingerprint` : `SHA-256(errorType + ":" + premier frame applicatif)` — normalisation
  qui ignore les numéros de ligne précis pour regrouper les variantes.

---

## Endpoint de tracking — `POST /api/analytics/track`

**Rôle requis :** Authentifié (et anonyme autorisé pour erreurs frontend pré-login)

**Request body** (`TrackEventRequest`) :

```json
{
  "type": "BUTTON_CLICK",
  "name": "lombard_simulate",
  "page": "tools-lombard",
  "metadata": { "category": "BOURSE", "view_mode": "grouped" }
}
```

**Réponse :** `204 No Content` — toujours (jamais d'erreur retournée pour ne pas casser l'UX).

**Rate limiting :** 100 events / minute / utilisateur (filtre Servlet dédié).
Au-delà, retour `204` mais event ignoré.

---

## Endpoint d'erreur frontend — `POST /api/analytics/error`

Permet au frontend de remonter ses propres erreurs (ErrorBoundary, axios interceptors).

**Request body** (`TrackErrorRequest`) :

```json
{
  "errorType": "TypeError",
  "message": "Cannot read property 'amount' of undefined",
  "stack": "...",
  "requestPath": "/patrimoine",
  "metadata": { "version": "1.6.0", "userAgent": "..." }
}
```

**Réponse :** `204 No Content`.

---

## Endpoints admin — `AnalyticsAdminController`

Tous protégés par `@PreAuthorize("hasRole('ADMIN')")`.

| Méthode | URL | Description |
|---------|-----|-------------|
| `GET` | `/api/admin/analytics/engagement-summary?from=&to=` | KPIs : events totaux, sessions uniques, events/session |
| `GET` | `/api/admin/analytics/retention?from=&to=` | Sessions uniques et events totaux par jour (`RetentionPointDto`) |
| `GET` | `/api/admin/analytics/top-events?type=&from=&to=&limit=` | Top features / boutons / pages |
| `GET` | `/api/admin/analytics/timeline?name=&from=&to=` | Série temporelle quotidienne d'un event_name |
| `GET` | `/api/admin/analytics/journey/{sessionId}` | Events du parcours d'une session |
| `GET` | `/api/admin/analytics/journey/{sessionId}/errors` | Erreurs survenues pendant une session |
| `GET` | `/api/admin/analytics/errors?source=&level=&from=&to=` | Erreurs groupées par fingerprint (count, firstSeen, lastSeen) |
| `GET` | `/api/admin/analytics/errors/{fingerprint}?page=&size=` | Occurrences d'une erreur (paginées, avec sessionId) |
| `GET` | `/api/admin/analytics/health?from=&to=` | KPIs erreurs + timeline erreurs/jour par source |
| `DELETE` | `/api/admin/analytics/purge?eventsDays=90&errorsDays=180` | Suppression des données antérieures aux seuils |

---

## Intégration backend — capture automatique des erreurs

### Global exception handler (`@RestControllerAdvice`)

Le `GlobalExceptionHandler` existant est étendu pour appeler `analyticsService.logError(...)`
avant de retourner la réponse HTTP, avec récupération du `userId` depuis le `SecurityContext`
et du `session_id` depuis un header `X-Session-Id` injecté par le frontend.

**Périmètre des codes HTTP capturés** (filtrage explicite dans le handler) :

| Code | Capturé ? | Niveau | Justification |
|------|-----------|--------|---------------|
| **5xx** | ✅ Oui | `ERROR` | Bug applicatif ou panne infra — toujours pertinent |
| **403** | ✅ Oui | `WARN` | Signale un problème UX (bouton accessible mais action interdite) |
| **404** sur `/api/*` | ✅ Oui | `WARN` | Signale une route manquante ou un appel frontend cassé |
| **404** hors `/api/*` | ❌ Non | — | Bruit (favicons, assets manquants, URLs tapées) |
| **401** | ❌ Non | — | Bruit (sessions expirées normales) |
| **400** (validation) | ❌ Non | — | Bruit (saisie utilisateur normale) |
| **429** (rate limit) | ❌ Non | — | Déjà tracé dans `login_events` |

### Logback appender custom (optionnel — phase 2)

Un appender `AnalyticsAppender` peut être configuré dans `logback-spring.xml` pour capturer
*tous* les logs de niveau `ERROR` (et pas seulement les exceptions controllers). À considérer
seulement si les exceptions handler-side ne suffisent pas.

---

## Intégration frontend

### Hook React — `useAnalytics()`

```js
import { useAnalytics } from '@/hooks/useAnalytics'

function LombardSimulatorPage() {
  const { trackEvent, trackPageView } = useAnalytics()

  useEffect(() => { trackPageView('tools.lombard') }, [])

  const handleSimulate = () => {
    trackEvent('FEATURE_USE', 'tools.lombard.simulate', { category: portfolio.category })
    // ... logique métier
  }
}
```

Implémentation :
- Le hook utilise un client axios dédié, **fire-and-forget** (pas d'`await`, pas de gestion d'erreur).
- Le `sessionId` est généré **à chaque login réussi** (UUID v4 stocké en `sessionStorage`) et effacé au logout. Cf. section *Cycle de vie du `session_id`*.
- Si le backend renvoie autre chose que `2xx`, l'erreur est silencieusement avalée (pas de log console pour éviter le bruit).
- Si l'utilisateur a activé l'opt-out (champ `analyticsOptOut` du profil renvoyé par `/api/auth/me`), le hook devient un no-op côté frontend — économise un aller-retour réseau.

### Capture des erreurs frontend

- **`ErrorBoundary`** existant → ajout d'un `componentDidCatch` qui appelle `POST /api/analytics/error`.
- **Intercepteur axios** (`api/client.js`) → toute réponse `5xx` déclenche un appel `logError` avec le path et le status.
- **`window.onerror`** + **`window.onunhandledrejection`** → capture des erreurs JS globales (handlers enregistrés au boot dans `App.jsx`).

---

## Page admin — `AnalyticsPage`

Route : `admin-analytics`. Accessible depuis le menu Administration.

### Disposition (3 onglets)

```
Onglet 1 : Engagement
├── Sélecteur période : 7j / 30j / 90j
├── KPIs : events totaux · sessions uniques · events/session moyen
├── Barre de recherche filtrante (event_name ET label français, temps réel)
├── 3 colonnes (avec indicateur tendance ↑/↓ vs période précédente) :
│   ├── Features les plus utilisées (FEATURE_USE)
│   ├── Boutons les plus cliqués (BUTTON_CLICK)
│   └── Pages les plus vues (PAGE_VIEW)
│       → clic sur une ligne : timeline quotidienne de cet event
├── Graphique rétention : sessions uniques/jour (barres) + events totaux (ligne)
│   Moyenne sessions/jour affichée en badge
├── Camembert Recharts : répartition des 10 pages les plus vues (donut)
├── Funnel open_form → create : taux de conversion par module
│   (vert ≥ 70 % · orange ≥ 40 % · rouge < 40 %)
└── Groupement par module : total FEATURE_USE par domaine, accordéon pour le détail

Onglet 2 : Parcours
├── Saisie du session ID (UUID) + bouton Charger
├── Compteur : N événements · N erreurs
└── Timeline verticale unifiée (events + erreurs triés chronologiquement)
    ├── Events : cercle indigo, badge type coloré, event_name + page
    └── Erreurs : cercle rouge, fond rouge pâle, source/level/type/path/message

Onglet 3 : Santé technique
├── 4 KPIs : events (période) · erreurs · erreurs backend · taux d'erreur %
├── Graphique barres empilées erreurs/jour (BACKEND indigo · FRONTEND amber)
├── Tableau des erreurs groupées (fingerprint, count, firstSeen/lastSeen, message)
│   ├── Badge "X nouvelles" en tête si des erreurs ont firstSeen < 24h
│   ├── Badge "Nouveau" inline par ligne concernée
│   └── Click → modal : session ID copiable (📋) + lien "Voir le parcours →"
│       (bascule directement sur l'onglet Parcours avec le session ID pré-rempli)
└── Bouton "🗑 Nettoyer" : modal de confirmation avec sélection des seuils
    de rétention indépendants (events / erreurs), affiche le résultat (lignes supprimées)
```

---

## Stratégie d'instrumentation par vagues

L'instrumentation des `trackEvent` est livrée **itérativement** plutôt que d'un bloc.
Démarche pragmatique : on récolte rapidement de la valeur sur les domaines les plus stratégiques,
on observe les premières données, on ajuste, puis on étend.

> **Exception** : tous les `trackPageView` sont posés dès la **V1** sur l'ensemble des pages — c'est trivial
> (1 ligne par page) et donne immédiatement une vue d'engagement complète sans attendre les vagues suivantes.

### V1 — MVP (livrée avec le système)

Périmètre prioritaire : **simulateurs et patrimoine**, qui constituent le cœur fonctionnel
et différenciant de l'application.

| Domaine | Actions à instrumenter | Préfixe `event_name` |
|---------|------------------------|----------------------|
| Tous les outils (Outils → …) | Lancement de simulation, sauvegarde de paramètres, export | `tools.lombard.*`, `tools.tax_simulator.*`, `tools.fiscal_envelope.*`, `tools.bilan.*`, `tools.crisis.*`, `tools.compound_interest.*`, `tools.loan.*`, `tools.retirement.*`, `tools.performance.*` |
| Patrimoine | CRUD positions, ordres, snapshots utilisateur, mise à jour de cours, gestion taux de change | `patrimoine.position.*`, `patrimoine.order.*`, `patrimoine.snapshot.*`, `patrimoine.exchange_rate.*` |
| Toutes les pages | Affichage (`trackPageView`) | — |

### V2 — Enrichissement (sprint suivant)

Périmètre : **données métier longitudinales** (revenus, dépenses, dettes) — parcours plus longs,
volume probablement plus régulier.

| Domaine | Actions à instrumenter | Préfixe `event_name` |
|---------|------------------------|----------------------|
| Revenus salariaux | CRUD contrats, bulletins, primes, avantages, astreintes, révisions | `revenus.salary_contract.*`, `revenus.pay_slip.*`, `revenus.bonus.*`, `revenus.benefit.*`, `revenus.on_call.*`, `revenus.revision.*` |
| Revenus complémentaires | CRUD revenus | `revenus.other_income.*` |
| Dépenses récurrentes | CRUD dépenses, consultation synthèse | `expenses.recurring.*` |
| Dettes | CRUD dettes, mises à jour manuelles de capital | `debts.debt.*`, `debts.balance_entry.*` |
| Possessions | CRUD possessions | `possessions.possession.*` |

### V3 — Couverture complète (sprint suivant)

Périmètre : **fonctions admin et actions secondaires** — volume faible mais utile pour
analyser l'UX admin et la consommation des fonctions périphériques.

| Domaine | Actions à instrumenter | Préfixe `event_name` |
|---------|------------------------|----------------------|
| Administration | CRUD utilisateurs, gestion instruments, snapshots admin, validation inscriptions, historique connexions | `admin.user.*`, `admin.instrument.*`, `admin.snapshot.*`, `admin.registration.*`, `admin.login_history.*` |
| Profil | Édition matelas sécurité, profil fiscal, infos perso, mot de passe, opt-out analytics | `auth.profile.*` |
| Famille | Création groupe, invitations, départ, modération admin | `family.group.*`, `family.invitation.*` |
| Stratégie patrimoniale | Édition objectifs par catégorie | `patrimoine.strategy.*` |
| Navigation transverse | Bascule mode sombre, masquage des valeurs, bascule mode foyer, ouverture des modals d'aide / notes de version | `app.ui.*` |

### Règle d'or pour les futures fonctionnalités

À partir de la livraison du MVP, **toute nouvelle page ou action métier doit être instrumentée
dans la même PR que la fonctionnalité elle-même**, en suivant la convention `module.feature.action`.
Référence : section *Analytics* de `docs/architecture/decisions/PATTERNS-frontend.md` + checklist
ajout de module.

Cette discipline évite de creuser une dette de tracking et garantit que la matrice d'usage reste
représentative au fil du temps.

---

## Vue unifiée — corrélation comportement ↔ erreur

L'intérêt de centraliser les deux flux apparaît dans deux scénarios :

1. **Erreur récurrente sur un parcours précis** : depuis la modal d'une erreur (onglet 3),
   un bouton "Voir le parcours utilisateur" charge l'onglet 2 préfiltré sur le `session_id`
   de la dernière occurrence — on visualise immédiatement les 5 dernières actions avant le crash.

2. **Feature qui génère beaucoup d'erreurs** : l'onglet 1 affiche pour chaque feature un badge
   rouge si `(erreurs avec session_id contenant un FEATURE_USE de cette feature) / (total uses) > 5 %`.
   Permet d'identifier les fonctionnalités fragiles.

---

## Rétention

Les deux tables peuvent grossir vite (estimation : ~10 000 events/mois pour 5 utilisateurs actifs).

**Politique par défaut :**
- `analytics_events` : conservation 180 jours, purge mensuelle
- `error_logs` : conservation 365 jours (utile pour repérer les régressions saisonnières), purge mensuelle

**Implémentation :** tâche `@Scheduled(cron = "0 0 3 1 * ?")` (3h du matin, le 1er du mois) dans
`AnalyticsRetentionService`. Désactivée en profil `dev` via `analytics.retention.enabled=false`.

---

## Considérations privacy / RGPD

- **Pas de financial data dans les events** : whitelist stricte des clés `metadata` (cf. plus haut).
- **Pas d'IP stockée par défaut** : la table `analytics_events` ne contient pas `ip_address` (à la différence de `login_events` où c'est nécessaire pour la détection d'intrusion).
- **Opt-out utilisateur** :
  - Champ `analyticsOptOut` (boolean, défaut `false`) ajouté à l'entité `User`.
  - Toggle "Suivi de mon usage" dans la page profil utilisateur (`UserProfilePage`).
  - Quand `true` : `AnalyticsService.trackEvent()` retourne immédiatement sans persistance ; le hook `useAnalytics()` devient no-op (économie réseau).
  - L'opt-out **ne s'applique pas** à `logError` — la santé technique reste captée pour permettre le debug.
- **Suppression d'un utilisateur** : la suppression d'un compte (`DELETE /api/users/{id}`) doit cascader vers `analytics_events.user_id` et `error_logs.user_id` (FK `ON DELETE SET NULL` — on garde l'event anonyme pour les agrégats globaux).
- **Mode Foyer** : aucune restriction côté admin — les analytics sont une fonction de gouvernance technique, pas un partage entre membres. L'admin voit tous les events de tous les utilisateurs, y compris ceux des membres de groupes familiaux. Le champ `family_group_id` n'intervient pas dans les requêtes d'agrégation.
- **Export utilisateur** (futur) : `GET /api/profile/data-export` devra inclure les events de l'utilisateur connecté.

---

## Configuration

Fichiers `application-{profil}.properties` :

| Propriété | Défaut | Description |
|-----------|--------|-------------|
| `analytics.enabled` | `true` (tous profils) | Active la persistance des events. **Volontairement activé en dev** pour pouvoir tester la chaîne complète localement |
| `analytics.rate-limit.events-per-minute` | 100 | Limite par utilisateur |
| `analytics.retention.events-days` | 180 | Rétention des events |
| `analytics.retention.errors-days` | 365 | Rétention des erreurs |
| `analytics.retention.enabled` | `true` (prod), `false` (dev) | Active la purge planifiée — désactivée en dev pour conserver les données de test |
| `analytics.async.pool-size` | 1 | Single-thread pour sérialiser les écritures SQLite |
| `analytics.async.queue-capacity` | 1000 | Taille de la queue |

Côté frontend (Vite) :

| Variable | Défaut | Description |
|----------|--------|-------------|
| `VITE_ANALYTICS_ENABLED` | `true` (tous environnements) | Active les appels `trackEvent` / `trackPageView`. À `false`, le hook `useAnalytics()` est un no-op total |

---

## Fonctionnalités supplémentaires livrées (hors spec initiale)

- **Nettoyage manuel des données** : endpoint `DELETE /api/admin/analytics/purge?eventsDays=90&errorsDays=180` avec résultat (nombre de lignes supprimées). Bouton "🗑 Nettoyer" dans la page admin avec modal de confirmation et sélecteurs de rétention indépendants.

- **Session ID copiable + navigation directe vers le parcours** : dans la modal de détail d'une erreur (onglet Santé), chaque occurrence affiche son `session_id` avec un bouton copier (📋) et un lien "Voir le parcours →" qui bascule sur l'onglet Parcours avec le session ID pré-rempli et le parcours chargé automatiquement.

- **Timeline unifiée Parcours** : l'onglet Parcours fusionne les events et les erreurs de la session (deux appels parallèles : `GET /journey/{id}` + `GET /journey/{id}/errors`) et les affiche dans une ligne de temps chronologique unique. Les erreurs sont visuellement distinguées (cercle rouge, fond coloré, message inline).

- **Onglet Engagement enrichi** :
  - Labels français : mapping complet `module.feature.action` → libellé lisible (ex : `patrimoine.position.create` → "Créer position")
  - KPIs globaux : events totaux, sessions uniques (COUNT DISTINCT session_id), events/session
  - Indicateurs de tendance : ↑/↓ % calculé par double appel API sur la période précédente de même durée
  - Barre de recherche filtrante sur les 3 colonnes (nom technique ET label)
  - Graphique de rétention : sessions uniques/jour + events totaux (BarChart + Line mixte, Recharts)
  - Camembert Recharts (donut) : répartition des 10 pages les plus vues
  - Funnel open_form → create : taux de conversion par module, code couleur vert/orange/rouge
  - Groupement par module : total FEATURE_USE par domaine fonctionnel, accordéon dépliable

- **Onglet Santé enrichi** :
  - Graphique barres empilées erreurs/jour (BACKEND vs FRONTEND), données issues de `health.errorTimeline`
  - Badge "X nouvelles" et badge "Nouveau" inline : erreurs dont `firstSeen` est dans les dernières 24h

- **Adaptation SQLite epoch ms** : toutes les requêtes d'agrégation natives utilisent des paramètres `long` (epoch ms) au lieu de `LocalDateTime`, conformément au comportement de stockage de Hibernate avec SQLite.

---

## Décisions actées

| Sujet | Décision |
|-------|----------|
| Périmètre du MVP | Livraison complète des **3 onglets** (Engagement + Parcours + Santé technique) |
| Convention de nommage | Hiérarchique 3 segments `module.feature.action` (cf. section dédiée) |
| Cycle de vie `session_id` | Régénéré à chaque login, stocké en `sessionStorage`, effacé au logout |
| Périmètre erreurs HTTP | 5xx (ERROR) + 403 (WARN) + 404 sur `/api/*` (WARN) — 401, 400, 429 ignorés |
| Pool async backend | **Single-thread** (corePoolSize=1, queue=1000) pour éviter les `database is locked` SQLite |
| Mode Foyer | Aucune restriction — l'admin voit tous les events de tous les utilisateurs |
| Opt-out utilisateur | Oui — champ `analyticsOptOut` sur `User` + toggle dans le profil |
| Activation en dev | **Activée** (`analytics.enabled=true` même en dev) pour permettre les tests locaux |

---

## Points ouverts à trancher (post-MVP)

- **Anonymisation des `user_id` après X jours** : utile RGPD, mais casse les analyses long-terme. Décision à prendre une fois les premières semaines de données collectées.
- **Granularité du `fingerprint` d'erreur** : trop fin → bruit, trop large → erreurs distinctes regroupées. À ajuster après observation des premiers regroupements en prod.
- **Sampling des `PAGE_VIEW`** : si volume trop élevé, échantillonner à 1/N pour les pages très consultées (dashboard). À évaluer après mesure du volume réel.
- **Ouverture aux non-admins** : exposer un mini-dashboard à chaque utilisateur ("vos features les plus utilisées") ? Pas dans la V1.
- **Alerting** : email admin automatique en cas de pic d'erreurs 5xx ? À étudier en V2.
- **Export utilisateur RGPD** : endpoint `GET /api/profile/data-export` incluant les events personnels.
