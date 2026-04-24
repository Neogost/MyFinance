# ADR-003 — Stratégie de logging backend

| | |
|---|---|
| **Statut** | Accepté |
| **Date** | 2026-04-24 |
| **Auteur** | Neogost |

---

## Contexte

Le backend MyFinance (333 fichiers Java) ne produit actuellement que les logs automatiques de Spring Boot et Hibernate. Seuls **7 des 32 services** ont un logger déclaré, tous concentrés sur les clients externes (Boursorama, CoinGecko, ECB) et les opérations d'infrastructure (scheduler, snapshots groupés, historique connexions).

**Constats issus de l'analyse complète du backend :**

| Zone | Fichiers avec @Slf4j | Fichiers sans log |
|------|---------------------|--------------------|
| Services métier (income, wealth, expenses) | 3 / 21 | 18 / 21 |
| Services infrastructure (market data, auth) | 4 / 11 | 7 / 11 |
| Config / Security | 0 / 13 | 13 / 13 |
| Controllers | 0 / 24 | 24 / 24 |

**Problèmes actuels :**
- Impossible de tracer quel utilisateur a fait quelle opération sans requêter la base
- Aucun log sur les règles métier violées (404, 409, 401) — les erreurs arrivent dans le frontend sans trace backend
- Les calculs complexes (IRPP, amortissement, scoring patrimonial) sont des boîtes noires en cas de valeur inattendue
- Pas de gestion centralisée des exceptions → les erreurs 500 disparaissent sans log explicite
- Pas de configuration Logback → fichiers tournants absents en production

---

## Décision

### 1. Périmètre des logs par couche

| Couche | Logger | Justification |
|--------|--------|---------------|
| **Services** | ✅ `@Slf4j` sur tous les services | Logique métier — source principale d'information |
| **Controllers** | ❌ Pas de logger | Spring MVC trace déjà les requêtes HTTP; la logique est dans les services |
| **Repositories** | ❌ Pas de logger | Spring Data + Hibernate gèrent le SQL |
| **Config / Security** | ⚠️ Ciblé uniquement | `SecurityConfig` délègue à `LoginHistoryService` (DB); ajouter warn sur `LoginRateLimitFilter` |
| **Clients externes** | ✅ Déjà en place | BoursoramaClient, CoinGeckoClient, EcbRateClient — à conserver |
| **GlobalExceptionHandler** | ✅ Nouveau | `@ControllerAdvice` pour centraliser les 500 inattendus |

---

### 2. Niveaux de log et règles d'utilisation

#### `DEBUG` — Calculs internes (développement uniquement)

Utilisé pour tracer le détail des algorithmes. Activé uniquement en profil `dev` — **jamais persisté en fichier en production**.

**Quand :** calculs IRPP, projection salariale, amortissement, scoring patrimonial, construction d'un snapshot.

```java
log.debug("[user:{}] Calcul IRPP - revenu imposable: {} €, parts: {}", userId, revenuImposable, parts);
log.debug("[user:{}] Scoring axe Endettement - ratio: {}%", userId, ratioEndettement);
```

> **RGPD — Montants financiers en DEBUG :** les montants précis (revenus, soldes, valorisations) **peuvent** apparaître en DEBUG car ce niveau est structurellement désactivé en prod via Logback (`com.myfinance=INFO` en profil `prod`). Aucun montant ne transite donc par les fichiers de logs en production. Cette garantie est **architecturale**, pas disciplinaire.

#### `INFO` — Opérations CRUD réussies

Une ligne par création, modification, suppression ou action significative aboutie.

**Quand :** toute mutation de données réussie dans un service.

```java
log.info("[user:{}] Contrat salarial créé #{} [{}]", userId, id, companyName);
log.info("[user:{}] Position fermée #{} - {} {}", userId, id, category, label);
log.info("[system] Snapshot mensuel généré pour {} utilisateur(s)", count);
```

> **RGPD — INFO en production :** les messages INFO **ne doivent pas contenir** de montants financiers, d'adresses email, de noms/prénoms, ni d'adresses IP. Seuls les identifiants techniques (ID numérique, catégorie, type, compteur) sont autorisés.

#### `WARN` — Règles métier violées ou dégradation gracieuse

Log **avant** de lever une `ResponseStatusException`. Permet de voir les conflits, les refus d'accès et les limites métier sans attendre une analyse de base de données.

**Quand :** conflit (409), ressource non trouvée avec contexte (404 suspect), accès refusé (403), validation métier échouée, client externe retournant vide.

```java
log.warn("[user:{}] Création contrat refusée - contrat actif existant #{}", userId, existingId);
log.warn("[user:{}] Position #{} introuvable ou non autorisée", userId, id);
log.warn("Boursorama - prix non récupéré pour le symbole '{}'", symbol);
```

> **Règle :** Ne pas logger les 404 "normaux" d'une recherche par l'utilisateur (ex. instrument non trouvé en saisie libre). Uniquement les 404 sur des ressources censées exister (ownership check, id fourni par le système).

#### `ERROR` — Exceptions inattendues

Réservé aux situations anormales qui ne devraient pas se produire en exploitation normale.

**Quand :** exception inattendue dans un `try/catch` (clients externes), erreur dans la création de snapshot d'un utilisateur, `GlobalExceptionHandler` sur 5xx.

```java
log.error("[user:{}] Erreur inattendue lors du recalcul snapshot #{}", userId, id, e);
log.error("CoinGecko - échec de récupération des prix: {}", e.getMessage(), e);
```

---

### 3. Format des messages

**Pattern standardisé :**
```
[user:{id}] {Verbe passé} {entité} #{id} [{détail optionnel}]
```

> **RGPD — Identifiant utilisateur dans les logs :** le login applicatif de MyFinance est une adresse email (`kevin.desmay@gmail.com`), ce qui constitue une **donnée personnelle directement identifiante**. Il est **interdit** de l'inclure dans les messages de log. On utilise à la place l'**ID numérique** de l'utilisateur, qui est un pseudonyme technique.
>
> ```java
> // ❌ Interdit — login = email
> log.info("[{}] Contrat créé #{}", user.getUsername(), id);
>
> // ✅ Conforme RGPD
> log.info("[user:{}] Contrat créé #{}", user.getId(), id);
> ```

**Exemples concrets :**
```
[user:3]   Contrat salarial créé #42 [Acme Corp]
[user:3]   Révision salariale supprimée #7 [contrat #42]
[user:3]   Snapshot patrimonial déclenché [2026-04]
[user:1]   Mise à jour des cours - 12 instruments OK, 1 erreur [CW8.PA]
[system]   Snapshot mensuel généré pour 3 utilisateur(s) [1 erreur: userId=5]
[user:3]   WARN contrat actif existant #3 - création refusée
[system]   Scheduler market data démarré [cron: 1er du mois 2h]
```

**Pour les opérations sans utilisateur connecté** (scheduler, GlobalExceptionHandler) : utiliser `[system]` ou `[user:1]` (ID de l'admin) selon le contexte.

---

### 4. GlobalExceptionHandler (nouveau composant)

Créer `GlobalExceptionHandler.java` dans `config/` :

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // 4xx métier : PAS de log (comportement normal attendu)
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleResponseStatus(ResponseStatusException ex) {
        if (ex.getStatusCode().is5xxServerError()) {
            log.error("Erreur serveur inattendue - status: {}, message: {}", ex.getStatusCode(), ex.getReason(), ex);
        }
        return ResponseEntity.status(ex.getStatusCode())
            .body(Map.of("error", ex.getReason() != null ? ex.getReason() : ex.getMessage()));
    }

    // Exception non gérée : toujours ERROR avec stack trace
    // RGPD : getRequestURI() peut contenir des IDs mais pas de données personnelles — acceptable
    // Ne pas logger request.getQueryString() ni les headers (peuvent contenir des tokens)
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleUnexpected(Exception ex, HttpServletRequest request) {
        log.error("Exception non gérée sur {} {} - {}", request.getMethod(), request.getRequestURI(), ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(Map.of("error", "Erreur interne du serveur"));
    }
}
```

> **Note :** Spring retourne déjà du JSON pour les `ResponseStatusException` grâce aux handlers personnalisés de `SecurityConfig`. Le `GlobalExceptionHandler` complète en assurant le **logging** et en captant les exceptions non typées.

---

### 5. Configuration Logback

Créer `backend/src/main/resources/logback-spring.xml` :

```xml
<configuration>

  <!-- Profil DEV : console colorée uniquement -->
  <springProfile name="dev">
    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
      <encoder>
        <pattern>%d{HH:mm:ss.SSS} %highlight(%-5level) %cyan(%-40logger{40}) : %msg%n</pattern>
      </encoder>
    </appender>

    <root level="INFO">
      <appender-ref ref="CONSOLE"/>
    </root>
    <logger name="com.myfinance" level="DEBUG"/>
    <logger name="org.springframework.security" level="INFO"/>
    <logger name="org.hibernate.SQL" level="WARN"/>
  </springProfile>

  <!-- Profil PROD : console + fichier tournant -->
  <springProfile name="prod">
    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
      <encoder>
        <pattern>%d{yyyy-MM-dd HH:mm:ss} %-5level %-40logger{40} : %msg%n</pattern>
      </encoder>
    </appender>

    <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
      <file>logs/myfinance.log</file>
      <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
        <fileNamePattern>logs/myfinance.%d{yyyy-MM-dd}.log</fileNamePattern>
        <maxHistory>30</maxHistory>
        <totalSizeCap>100MB</totalSizeCap>
      </rollingPolicy>
      <encoder>
        <pattern>%d{yyyy-MM-dd HH:mm:ss} %-5level %-40logger{40} : %msg%n</pattern>
      </encoder>
    </appender>

    <root level="WARN">
      <appender-ref ref="CONSOLE"/>
      <appender-ref ref="FILE"/>
    </root>
    <logger name="com.myfinance" level="INFO"/>
    <logger name="org.springframework" level="WARN"/>
  </springProfile>

</configuration>
```

**Fichiers de logs en prod :** `backend/logs/myfinance.log` (rotation quotidienne, 30 jours, 100 MB max).

---

### 6. Services à équiper — inventaire complet

#### Déjà équipés (@Slf4j présent)
| Service | Logs existants | Action |
|---------|----------------|--------|
| `MarketDataService` | INFO/WARN détaillés | ✅ Conserver, enrichir si besoin |
| `MarketDataScheduler` | INFO trigger | ✅ OK |
| `BoursoramaClient` | DEBUG/INFO/WARN/ERROR | ✅ OK |
| `CoinGeckoClient` | INFO/WARN/ERROR | ✅ OK |
| `EcbRateClient` | INFO/WARN/ERROR | ✅ OK |
| `PortfolioSnapshotService` | ERROR sur bulk | ⚠️ Ajouter INFO CRUD |
| `AdminSnapshotService` | Partiel | ⚠️ Compléter |
| `DebtService` | Partiel | ⚠️ Compléter |
| `LoginHistoryService` | WARN sur échec persist | ✅ OK |

#### À équiper (25 services)

**Revenus**
| Service | Logs INFO à ajouter | Logs WARN à ajouter |
|---------|--------------------|--------------------|
| `SalaryContractService` | Contrat créé/modifié/supprimé + toDto (DEBUG projection) | Contrat actif existant au create |
| `SalaryRevisionService` | Révision créée/modifiée/supprimée | — |
| `MonthlyPaySlipService` | Bulletin créé/modifié/supprimé | Bulletin existant pour la période |
| `ContractBonusService` | Prime créée/modifiée/supprimée | — |
| `ContractBenefitService` | Avantage créé/modifié/supprimé | — |
| `OtherIncomeService` | Revenu complémentaire créé/modifié/supprimé | — |

**Patrimoine**
| Service | Logs INFO à ajouter | Logs WARN à ajouter |
|---------|--------------------|--------------------|
| `PositionService` | Position créée/modifiée/fermée/supprimée | — |
| `InstrumentService` | Instrument créé/modifié, prix mis à jour (bulk count) | Instrument non trouvé lors de la mise à jour de prix |
| `PatrimoineScoreService` | Score calculé (DEBUG axes, INFO résultat + profil) | — |
| `PatrimoineTargetService` | Objectifs mis à jour (nb cibles) | — |
| `ExchangeRateService` | Taux mis à jour (nb devises) | — |

**Dépenses**
| Service | Logs INFO à ajouter | Logs WARN à ajouter |
|---------|--------------------|--------------------|
| `RecurringExpenseService` | Dépense créée/modifiée/supprimée | — |
| `PossessionService` | Possession créée/modifiée/supprimée | — |

**Utilisateurs / Auth**
| Service | Logs INFO à ajouter | Logs WARN à ajouter |
|---------|--------------------|--------------------|
| `UserService` | Utilisateur créé/modifié/supprimé | Login dupliqué au create |
| `ProfileService` | Profil mis à jour | — |
| `UserRegistrationService` | Demande créée, statut changé | — |
| `LoginAttemptService` | — (base déjà en DB via LoginHistoryService) | WARN à partir de N-1 tentatives avant blocage |

**Outils / Infrastructure**
| Service | Logs INFO à ajouter | Logs WARN à ajouter |
|---------|--------------------|--------------------|
| `TaxSimulatorService` | DEBUG: barème détaillé avec montants; INFO: simulation terminée (sans montant) | Profil fiscal incomplet |
| `DashboardService` | DEBUG agrégation | Données manquantes (contrat absent, etc.) |
| `AllocationUpdateService` | Allocations mises à jour (nb instruments) | Allocation non trouvée pour un instrument |

---

### 7. Ce qu'on ne logge PAS

| Situation | Raison |
|-----------|--------|
| Requêtes HTTP entrantes | Spring MVC / Access Log suffisent |
| Requêtes SQL | Hibernate gère (activable via `logging.level.org.hibernate.SQL=DEBUG`) |
| Lectures simples (GET sans side effect) | Bruit sans valeur ajoutée pour une app mono-utilisateur |
| Validations `@Valid` échouées (400) | Gérées par Spring automatiquement |
| 401/403 d'authentification | Gérés par `SecurityConfig` + `LoginHistoryService` |
| **Adresses email / login** | Donnée personnelle directement identifiante (RGPD) |
| **Noms, prénoms** | Donnée personnelle (RGPD) |
| **Date de naissance** | Donnée personnelle (RGPD) |
| **Adresses IP** | Déjà stockées dans `login_events` — pas de duplication en fichier (RGPD) |
| **User-Agent** | Déjà stocké dans `login_events` (RGPD) |
| **Mots de passe, tokens de session** | Données d'authentification — jamais dans les logs |
| **Montants financiers précis en INFO/WARN/ERROR** | Données patrimoniales sensibles — acceptés uniquement en DEBUG (dev) |
| **Headers HTTP** (`Authorization`, `Cookie`) | Peuvent contenir des tokens de session |
| **Query strings complets** | Peuvent contenir des paramètres sensibles |

---

### 8. Conformité RGPD

**Principes RGPD applicables :** minimisation (Art. 5.1.c), limitation de conservation (Art. 5.1.e), intégrité et confidentialité (Art. 5.1.f), pseudonymisation (Art. 4.5).

#### Pseudonymisation des identifiants

Le login de MyFinance est une adresse email (`user@example.com`), classée **donnée personnelle directement identifiante** au sens du RGPD. Elle est **interdite** dans tout message de log (toute sévérité, tout profil).

**Règle unique :** utiliser `user.getId()` (Long numérique) dans tous les messages de log.

```java
// ❌ Interdit — email dans les logs
log.info("[{}] Position créée #{}", user.getUsername(), positionId);  // getUsername() → email

// ✅ Conforme
log.info("[user:{}] Position créée #{}", user.getId(), positionId);
```

L'ID numérique est un **pseudonyme technique** : il ne permet pas à lui seul d'identifier la personne physique sans accès à la base de données (Art. 4.5 RGPD).

#### Durée de conservation des fichiers de logs

| Profil | Durée | Justification |
|--------|-------|---------------|
| `dev` | Pas de fichier | Console uniquement — pas de persistance |
| `prod` | **30 jours** | Proportionné à la finalité (diagnostic technique) — Art. 5.1.e |

> Ne pas augmenter cette durée (paramètre `maxHistory` dans `logback-spring.xml`) sans réévaluation de la finalité. 30 jours couvrent tous les cas d'investigation réalistes pour une app personnelle.

#### Données financières

Les montants précis (revenus, soldes, valorisations, résultats fiscaux) sont des **données patrimoniales sensibles**. Leur présence en logs est encadrée :

| Niveau | Profil | Montants autorisés | Justification |
|--------|--------|-------------------|---------------|
| DEBUG | `dev` uniquement | ✅ Oui | Jamais persisté en fichier — garantie Logback |
| INFO/WARN/ERROR | `prod` | ❌ Non | Fichier tournant 30 jours → risque de fuite |
| INFO/WARN/ERROR | `dev` | ❌ Non | Discipline uniforme pour éviter les erreurs |

**Exemples :**
```java
// ❌ Interdit à INFO (montant en clair)
log.info("[user:{}] IRPP calculé: {} €", userId, montantImpot);

// ✅ Conforme à INFO
log.info("[user:{}] Simulation fiscale terminée", userId);

// ✅ Conforme à DEBUG (uniquement en dev)
log.debug("[user:{}] IRPP: {} € — barème {} tranches", userId, montantImpot, nbTranches);
```

#### Adresses IP dans les logs

Les adresses IP sont des **données personnelles** (CJUE, Breyer, 2016). Elles sont déjà persistées dans la table `login_events` avec une finalité déclarée (sécurité anti-brute-force). Les dupliquer dans les fichiers de logs créerait une **seconde base de traitement** sans justification.

**Règle :** ne jamais logger d'adresse IP dans les services applicatifs. `LoginHistoryService` gère déjà ce traçage de façon centralisée et contrôlée.

#### Sécurité des fichiers de logs (NAS QNAP)

- Répertoire `backend/logs/` : permissions restreintes au processus Java (pas d'accès web direct)
- Ne pas inclure `logs/` dans les synchronisations vers des services cloud tiers (Dropbox, Google Drive, etc.)
- La rotation automatique (`maxHistory=30`) assure la suppression effective des fichiers anciens sans intervention manuelle

#### Droit à l'effacement (Art. 17 RGPD)

Si un utilisateur exerce son droit à l'effacement :

1. **Fichiers de logs** : ne contiennent pas de données directement identifiantes si le format `[user:{id}]` est respecté. Aucune action requise sur les fichiers.
2. **Table `login_events`** : contient le login (email), l'IP et le User-Agent — à purger explicitement :
   ```sql
   DELETE FROM login_events WHERE login = 'user@example.com';
   ```
3. **Table `users`** et toutes les tables liées : suppression en cascade via `UserService.delete()`.

> Le respect du format `[user:{id}]` est la condition qui rend les fichiers de logs **hors périmètre** du droit à l'effacement. Si un email apparaissait dans les logs, les fichiers de 30 jours deviendraient concernés par la demande.

---

## Conséquences

### Bénéfices attendus

- **Traçabilité complète** : chaque mutation est identifiable (qui, quoi, quand, id)
- **Diagnostic rapide** : les WARN avant exception indiquent le contexte métier sans analyser la DB
- **Calculs transparents** : les projections IRPP, scoring, amortissement loggables en DEBUG
- **Fiabilité prod** : fichier tournant sur 30 jours permet de corréler incidents et opérations

### Contraintes

- **Volume** : en profil `dev` avec DEBUG, les logs de calcul peuvent être verbeux — acceptable localement
- **Performance** : négligeable (Logback async par défaut, messages de moins de 200 caractères)
- **Discipline RGPD** : l'interdiction des emails et montants en INFO/WARN/ERROR doit être respectée à chaque nouveau log ajouté — une revue de code doit inclure ce point

### Non inclus dans cette décision

- **MDC (Mapped Diagnostic Context)** : utile pour corréler les logs par requête dans un système multi-thread sous charge. Non retenu ici — usage mono-utilisateur, synchrone, overhead non justifié. À évaluer si l'app s'ouvre à plusieurs utilisateurs simultanés.
- **Structured logging (JSON)** : non nécessaire sans agrégateur de logs (ELK, Loki). Le format texte est suffisant pour consultation manuelle sur NAS.
- **Audit log en base** : `LoginEvent` couvre déjà l'authentification. Un audit complet des mutations métier (qui a créé quelle position) reste en dehors du périmètre.

---

## Implémentation

L'implémentation sera réalisée en suivant ce plan dans l'ordre :

1. **Logback** : créer `logback-spring.xml` + retirer les entrées `logging.level.*` des `application-{profil}.properties`
2. **GlobalExceptionHandler** : créer `config/GlobalExceptionHandler.java`
3. **Services par lot** : ajouter `@Slf4j` + messages selon le tableau ci-dessus, en commençant par les services les plus utilisés (Income → Wealth → Expenses → Users → Tools)
4. **Compléter les services déjà partiellement loggés** (PortfolioSnapshotService, AdminSnapshotService, DebtService)
