# MyFinance — Contexte projet pour Claude

## ⚡ Lecture obligatoire en début de session

Avant d'implémenter quoi que ce soit, lire ces deux fichiers pour connaître les patterns de code du projet et ne pas avoir à inférer les conventions depuis le code existant :

- **Backend** (entité, service, controller, DTOs, tests) → [`docs/architecture/decisions/PATTERNS-backend.md`](docs/architecture/decisions/PATTERNS-backend.md)
- **Frontend** (page, formulaire modal, API layer, CSS, navigation) → [`docs/architecture/decisions/PATTERNS-frontend.md`](docs/architecture/decisions/PATTERNS-frontend.md)

Ces fichiers contiennent les squelettes de code à suivre. Tout nouveau module doit respecter ces patterns.

---

## Description
Application web personnelle de gestion d'investissements financiers,
hébergée sur NAS QNAP en réseau local (pas d'accès utilisateur depuis l'extérieur).
Permet de suivre un portefeuille, enregistrer des transactions,
visualiser l'évolution dans le temps et mettre à jour les cours automatiquement.

## Stack technique
- **Backend** : Java 17, Spring Boot 3.5, Maven
- **Base de données** : SQLite (fichier local `backend/data/myfinance-dev.db`)
- **Frontend** : React + Vite, Tailwind CSS v4 (styles), Recharts (graphiques), Axios (appels API)
- **Mise à jour des cours** : Yahoo Finance API via tâches @Scheduled Spring
- **Documentation API** : Swagger UI via springdoc-openapi (`/swagger-ui.html`)

## Structure du projet (monorepo)
```
MyFinance/
├── backend/      Java / Spring Boot (pom.xml, mvnw, src/)
├── frontend/     React / Vite
├── docs/         Documentation architecture et API
├── .gitignore
└── readme.md
```

## Architecture
- Pattern REST : le backend expose une API `/api/**`, le frontend l'appelle via HTTP
- Séparation stricte backend (port 8080) / frontend (port 3000)
- Profils Spring : `dev` (local) et `prod` (NAS)
- Authentification : session cookie Spring Security + BCrypt

## Structure des packages Java
```
com.myfinance
├── config/       Configuration Spring (Security, CORS, OpenAPI, DataInitializer)
├── domain/       Entités JPA (@Entity) mappées sur SQLite
├── repository/   Interfaces Spring Data JPA (pas d'implémentation manuelle)
├── service/      Logique métier, jamais appelée directement depuis un controller
├── controller/   @RestController exposant les endpoints /api/**
└── dto/          Records Java immuables échangés avec le frontend
```

## Structure frontend
```
frontend/src/
├── api/
│   ├── auth.js       Login, logout, me
│   ├── users.js      CRUD utilisateurs
│   ├── income.js     CRUD salary-contracts, pay-slips, bonuses, benefits, other-incomes
│   └── tools.js      Appels simulateur des impôts
├── components/
│   ├── LoginForm.jsx
│   ├── Navigation.jsx        Menu principal avec dropdowns Revenus et Outils
│   ├── users/        UserList, UserForm (+ profil fiscal), ChangePasswordForm
│   ├── income/
│   │   ├── SalaryContractPage.jsx   Page principale revenus salariaux
│   │   ├── SalaryContractForm.jsx   Modal création/édition contrat
│   │   ├── ProjectionGrid.jsx       Grille de projections calculées (brut+primes, net+TR+avantages)
│   │   ├── PaySlipPanel.jsx         Panel bulletins de paie réels
│   │   ├── BonusPanel.jsx           Panel primes annuelles/exceptionnelles
│   │   ├── BonusForm.jsx            Modal création/édition prime
│   │   ├── BenefitPanel.jsx         Panel avantages en nature
│   │   ├── BenefitForm.jsx          Modal création/édition avantage
│   │   ├── OtherIncomePage.jsx      Page revenus complémentaires (badges fiscaux)
│   │   └── OtherIncomeForm.jsx      Modal création/édition revenu (+ champs fiscaux)
│   ├── expenses/
│   │   ├── RecurringExpensePage.jsx  Page dépenses récurrentes (KPIs, répartition, liste groupée)
│   │   └── RecurringExpenseForm.jsx  Modal création/édition dépense (aperçu projection, colocation)
│   └── tools/
│       └── TaxSimulatorPage.jsx     Simulateur des impôts
├── App.jsx           Routage par état (currentPage : dashboard | salary | other-incomes | expenses | tax-simulator | users | profile)
├── App.css           Fichier vide (styles migrés vers Tailwind)
└── index.css         Point d'entrée CSS — @import "tailwindcss"
```

## Styles et thème
- **Tailwind CSS v4** via plugin `@tailwindcss/vite` — pas de `tailwind.config.js` requis
- Toutes les classes sont des utilitaires Tailwind inline dans les JSX
- Palette : indigo-600 (primaire), gray-100 (fond), violet-100/800 (badges rôle)
- `App.css` est conservé vide pour compatibilité — ne pas y remettre de styles

## Documentation associée
- Fonctionnalités détaillées : `docs/architecture/overview.md`
- Gestion des utilisateurs et droits : `docs/architecture/userManagement.md`
- Gestion des revenus (entités, formules, accès) : `docs/architecture/salary.md`
- Simulateur des impôts (algorithme, barème, config) : `docs/architecture/tax-simulator.md`
- Modèle de données (diagramme de classes) : `docs/architecture/diagram/class-diagram.mmd`
- Décisions d'architecture (ADR) : `docs/architecture/decisions/`
- Tableau de bord (graphiques) : `docs/architecture/dashboard.md`
- API authentification : `docs/api/authentication.md`
- API tableau de bord : `docs/api/dashboard.md`
- API utilisateurs : `docs/api/users.md`
- API contrats salariaux et bulletins : `docs/api/salary-contracts.md`
- API revenus complémentaires : `docs/api/other-incomes.md`
- API simulateur des impôts : `docs/api/tax-simulator.md`
- Gestion du patrimoine (architecture) : `docs/architecture/patrimoine.md`
- Mise à jour manuelle des cours d'instruments : `docs/architecture/instrument-price-update.md`
- API patrimoine (positions, ordres, snapshots) : `docs/api/patrimoine.md`
- Gestion des dépenses récurrentes (architecture) : `docs/architecture/recurring-expenses.md`
- Bilan financier personnel (architecture) : `docs/architecture/bilan-financier.md`
- Simulateur d'intérêts composés (architecture) : `docs/architecture/compound-interest-simulator.md`
- API dépenses récurrentes : `docs/api/recurring-expenses.md`

## Endpoints backend existants

### Authentification
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `POST` | `/api/auth/login` | Public | Login (form-urlencoded) → cookie JSESSIONID |
| `POST` | `/api/auth/logout` | Authentifié | Déconnexion |
| `GET` | `/api/auth/me` | Authentifié | Utilisateur courant |
| `PUT` | `/api/auth/password` | Authentifié | Changement de son propre mot de passe |

### Utilisateurs
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/users` | ADMIN | Liste tous les utilisateurs |
| `GET` | `/api/users/{id}` | ADMIN | Détail d'un utilisateur |
| `POST` | `/api/users` | ADMIN | Créer un utilisateur |
| `PUT` | `/api/users/{id}` | ADMIN | Modifier un utilisateur (password optionnel) |
| `DELETE` | `/api/users/{id}` | ADMIN | Supprimer un utilisateur |

### Contrats salariaux
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/salary-contracts` | Authentifié | Liste ses contrats (avec projections calculées) |
| `GET` | `/api/salary-contracts/{id}` | Authentifié | Détail + projections d'un contrat |
| `POST` | `/api/salary-contracts` | Authentifié | Créer un contrat (1 seul actif à la fois) |
| `PUT` | `/api/salary-contracts/{id}` | Authentifié | Modifier un contrat |
| `DELETE` | `/api/salary-contracts/{id}` | Authentifié | Supprimer un contrat (cascade bulletins) |

### Révisions salariales
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/salary-contracts/{id}/revisions` | Authentifié | Liste des révisions d'un contrat |
| `POST` | `/api/salary-contracts/{id}/revisions` | Authentifié | Ajouter une révision salariale |
| `PUT` | `/api/salary-contracts/{id}/revisions/{revId}` | Authentifié | Modifier une révision |
| `DELETE` | `/api/salary-contracts/{id}/revisions/{revId}` | Authentifié | Supprimer une révision |

### Bulletins de paie mensuels
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/salary-contracts/{id}/pay-slips` | Authentifié | Liste des bulletins d'un contrat |
| `POST` | `/api/salary-contracts/{id}/pay-slips` | Authentifié | Ajouter un bulletin (1 par période) |
| `PUT` | `/api/salary-contracts/{id}/pay-slips/{slipId}` | Authentifié | Modifier un bulletin |
| `DELETE` | `/api/salary-contracts/{id}/pay-slips/{slipId}` | Authentifié | Supprimer un bulletin |

### Primes (ContractBonus)
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/salary-contracts/{id}/bonuses` | Authentifié | Liste des primes d'un contrat |
| `POST` | `/api/salary-contracts/{id}/bonuses` | Authentifié | Ajouter une prime (EXCEPTIONNELLE ou ANNUELLE) |
| `PUT` | `/api/salary-contracts/{id}/bonuses/{bonusId}` | Authentifié | Modifier une prime |
| `DELETE` | `/api/salary-contracts/{id}/bonuses/{bonusId}` | Authentifié | Supprimer une prime |

### Avantages en nature (ContractBenefit)
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/salary-contracts/{id}/benefits` | Authentifié | Liste des avantages d'un contrat |
| `POST` | `/api/salary-contracts/{id}/benefits` | Authentifié | Ajouter un avantage (label + montant mensuel) |
| `PUT` | `/api/salary-contracts/{id}/benefits/{benefitId}` | Authentifié | Modifier un avantage |
| `DELETE` | `/api/salary-contracts/{id}/benefits/{benefitId}` | Authentifié | Supprimer un avantage |

### Revenus complémentaires
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/other-incomes` | Authentifié | Liste ses revenus complémentaires |
| `POST` | `/api/other-incomes` | Authentifié | Ajouter un revenu (LOCATIF, DIVIDENDE, AIDE_SOCIALE, AUTRE) |
| `PUT` | `/api/other-incomes/{id}` | Authentifié | Modifier un revenu |
| `DELETE` | `/api/other-incomes/{id}` | Authentifié | Supprimer un revenu |

### Simulateur des impôts
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/tax-simulator` | Authentifié | Simulation IRPP pour l'utilisateur connecté |
| `GET` | `/api/tax-simulator/users/{userId}` | ADMIN | Simulation IRPP pour un autre utilisateur |

### Patrimoine — Instruments
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/instruments` | Authentifié | Liste les instruments (recherche par ISIN, ticker ou nom) |
| `GET` | `/api/instruments/{id}` | Authentifié | Détail d'un instrument + dernier prix |
| `POST` | `/api/instruments` | Authentifié | Créer un instrument manuellement |
| `PUT` | `/api/instruments/{id}` | Authentifié | Modifier un instrument |
| `GET` | `/api/instruments/active` | ADMIN | Liste les instruments liés à au moins une position ACTIVE |
| `PUT` | `/api/instruments/prices` | ADMIN | Mise à jour groupée des cours (lastPrice + lastPriceUpdatedAt) |
| `PATCH` | `/api/instruments/{id}/stable-price` | ADMIN | Activer / désactiver le prix fixe d'un instrument |

### Patrimoine — Positions
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/positions` | Authentifié | Liste ses positions (filtrable par `category`, `status`) |
| `GET` | `/api/positions/{id}` | Authentifié | Détail + ordres d'une position |
| `POST` | `/api/positions` | Authentifié | Créer une position (LIVRET, LIQUIDITE, …) |
| `PUT` | `/api/positions/{id}` | Authentifié | Modifier une position |
| `PUT` | `/api/positions/{id}/balance` | Authentifié | Mettre à jour le solde (LIQUIDITE uniquement) |
| `PUT` | `/api/positions/{id}/close` | Authentifié | Fermer une position |
| `DELETE` | `/api/positions/{id}` | Authentifié | Supprimer une position (cascade ordres) |

### Patrimoine — Ordres
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/positions/{id}/orders` | Authentifié | Liste des ordres d'une position |
| `POST` | `/api/positions/{id}/orders` | Authentifié | Ajouter un ordre (interdit sur LIQUIDITE) |
| `PUT` | `/api/positions/{id}/orders/{orderId}` | Authentifié | Modifier un ordre |
| `DELETE` | `/api/positions/{id}/orders/{orderId}` | Authentifié | Supprimer un ordre |

### Patrimoine — Taux de change
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/exchange-rates` | ADMIN | Liste tous les taux de change configurés |
| `PUT` | `/api/exchange-rates` | ADMIN | Mise à jour groupée des taux (upsert par devise) |

### Patrimoine — Snapshots (utilisateur)
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/portfolio/snapshots` | Authentifié | Liste ses snapshots (résumé, sans positions) |
| `GET` | `/api/portfolio/snapshots/{id}` | Authentifié | Détail d'un snapshot (avec positions) |
| `POST` | `/api/portfolio/snapshots` | Authentifié | Déclencher un snapshot pour la date indiquée |
| `PUT` | `/api/portfolio/snapshots/{id}/recalculate` | Authentifié | Recalculer un snapshot avec les prix actuels |
| `POST` | `/api/portfolio/snapshots/all` | ADMIN | Générer un snapshot pour tous les utilisateurs |

### Dépenses récurrentes
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/recurring-expenses` | Authentifié | Liste ses dépenses (avec montants projetés) |
| `GET` | `/api/recurring-expenses/summary` | Authentifié | Synthèse : total par catégorie + capacité d'épargne |
| `POST` | `/api/recurring-expenses` | Authentifié | Créer une dépense |
| `PUT` | `/api/recurring-expenses/{id}` | Authentifié | Modifier une dépense (ownership vérifié) |
| `DELETE` | `/api/recurring-expenses/{id}` | Authentifié | Supprimer une dépense (ownership vérifié) |

### Passifs (grandes possessions)
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/possessions` | Authentifié | Liste ses possessions (avec valeurs calculées) |
| `GET` | `/api/possessions/{id}` | Authentifié | Détail d'une possession |
| `GET` | `/api/possessions/summary` | Authentifié | Synthèse : totaux + répartition par catégorie |
| `POST` | `/api/possessions` | Authentifié | Créer une possession |
| `PUT` | `/api/possessions/{id}` | Authentifié | Modifier une possession (ownership vérifié) |
| `DELETE` | `/api/possessions/{id}` | Authentifié | Supprimer une possession (ownership vérifié) |

### Patrimoine — Snapshots (admin — gestion manuelle)
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/admin/snapshots?userId={id}` | ADMIN | Liste les snapshots d'un utilisateur |
| `GET` | `/api/admin/snapshots/{id}` | ADMIN | Détail complet d'un snapshot admin |
| `POST` | `/api/admin/snapshots` | ADMIN | Créer manuellement un snapshot pour un utilisateur |
| `PUT` | `/api/admin/snapshots/{id}` | ADMIN | Modifier un snapshot existant |
| `DELETE` | `/api/admin/snapshots/{id}` | ADMIN | Supprimer un snapshot |
| `GET` | `/api/admin/users/{userId}/positions` | ADMIN | Positions actives d'un utilisateur (pour le formulaire) |

## Gestion des erreurs
- Les services lèvent des `ResponseStatusException` (404, 409, 401) — jamais depuis les controllers
- Les controllers ne font que déléguer et retourner le `ResponseEntity` approprié
- Spring Security retourne du JSON (pas de redirect HTML) grâce aux handlers personnalisés dans `SecurityConfig`

## Conventions de tests
- Tests unitaires service : `@ExtendWith(MockitoExtension.class)` + `@Mock` / `@InjectMocks`
- Tests controller : `@WebMvcTest(XController.class)` + `@Import({SecurityConfig.class, PasswordEncoderConfig.class})`
  + `@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")`
  + `@MockitoBean XService`
  + `@WithMockUser(roles = "ADMIN")` pour les controllers qui n'utilisent pas `@AuthenticationPrincipal`
  + `@WithMockCustomUser` (annotation custom dans `support/`) pour les controllers income qui injectent `@AuthenticationPrincipal User` — `@WithMockUser` standard est incompatible avec notre entité `User`
- `SecurityConfig` et `PasswordEncoderConfig` doivent rester `public` pour être importables dans les tests

## Conventions de code
- Utiliser **Lombok** : `@Data`, `@Builder`, `@RequiredArgsConstructor` sur les entités et services
- Utiliser **Records Java** pour les DTOs (immuables par nature)
- Les controllers ne contiennent **aucune logique métier** — ils délèguent aux services
- Les entités JPA ne sont **jamais** retournées directement dans les réponses HTTP (toujours un DTO)
- Nommage : `camelCase` pour les variables/méthodes, `PascalCase` pour les classes
- Commentaires en **français**
- Endpoints admin protégés par `@PreAuthorize("hasRole('ADMIN')")`
- Les controleurs ou services doivent être couvert par des Tests unitaires

## Commandes utiles
```bash
# Lancer le backend en développement
cd backend
mkdir -p data  # première fois uniquement
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

# Compiler le JAR pour le NAS
cd backend
./mvnw clean package -DskipTests

# Lancer les tests
cd backend
./mvnw test

# Lancer sur le NAS
java -jar -Dspring.profiles.active=prod backend/target/myFinance-0.0.1-SNAPSHOT.jar

# Lancer le frontend en développement
cd frontend
npm run dev
```

## Points d'attention
- Ne jamais retourner une entité JPA directement depuis un @RestController
- Le profil `prod` désactive les logs SQL et valide le schéma sans le modifier
- Le scheduler Yahoo Finance est désactivé en profil `dev` (évite de spammer l'API)
- Le fichier `application-prod.properties` est dans le `.gitignore`
- SQLite ne supporte pas les connexions concurrentes massives — c'est acceptable ici (usage mono-utilisateur)
- Le Swagger UI est accessible en dev sur `http://localhost:8080/swagger-ui.html`
- En cas de changement d'une information importante, la documentation doit être produite ou mise à jour

## Utilisation de la documentation
- Toujours consulter `docs/api/` avant de modifier un controller
- Se référer à `docs/architecture/diagram/class-diagram.mmd` pour toute modification des entités JPA
- Ne pas inventer de structure de données non documentée

## Statut du projet
🚧 En cours de développement

**Implémenté :**
- Authentification (session cookie, BCrypt, login/logout/me)
- Gestion des utilisateurs CRUD (admin) + changement de mot de passe self-service
- Gestion des revenus salariaux : contrats (avec nom d'entreprise), projections **Super brut / Brut / Net imposable / Net d'impôt** (annuel, mensuel, journalier, horaire), bulletins de paie réels
- Primes sur contrat (EXCEPTIONNELLE avec date de versement, ANNUELLE avec mois de versement)
- Avantages en nature (`ContractBenefit`) intégrés dans le **net d'impôt** (modèle exonéré — hors assiette fiscale)
- Revenus complémentaires (LOCATIF, DIVIDENDE, AIDE_SOCIALE, AUTRE) avec totaux par catégorie
- Frontend : navigation avec menu Revenus, pages Salariat et Complémentaires, formulaires modaux
- Tests unitaires : (UserService, UserController, SalaryContractService, SalaryContractController, MonthlyPaySlipService, MonthlyPaySlipController, ContractBonusService, ContractBonusController, ContractBenefitService, ContractBenefitController, OtherIncomeService, OtherIncomeController, SalaryContractDto, TaxSimulatorService, TaxSimulatorController)
- Documentation API : `docs/api/` | ADR : `docs/architecture/decisions/`
- **Simulateur des impôts** : profil fiscal utilisateur (parts, abattement), simulation IRPP avec choix de source salariale et sélection des revenus complémentaires. En mode "Projection contrat", utilise la révision salariale active si elle existe — doc : `docs/architecture/tax-simulator.md`
- **Chaîne fiscale contrat** : `TaxSimulatorService.estimerImpotSurSalaire()` réutilisée par `SalaryContractService` (qui injecte aussi `ContractBenefitRepository`) pour calculer le net d'impôt dans les projections — `SalaryContractDto` expose `annualNetImposable` et `annualNetAfterTax` (+ dérivés mensuel/journalier/horaire, null si profil fiscal incomplet)
- **Fix `monthlyNetAfterTax`** : diviseur corrigé `/12` → `/paidMonthsPerYear` dans `SalaryContractDto.from()` + tooltip frontend (`estimatedTax / paidMonths`). Bug visible sur contrats 13 mois : net d'impôt mensuel dépassait le net imposable.
- **Historique salarial** (`SalaryRevision`) : entity, repo, service, controller, tests, frontend (`RevisionPanel`, `RevisionForm`). Révision active = MAX(effectiveDate ≤ today), utilisée dans les projections contrat et le simulateur d'impôts.
- **Nom d'entreprise** (`companyName`) sur `SalaryContract` : champ nullable, affiché dans les onglets et l'en-tête du contrat.
- **Super brut** : coût employeur estimé (taux forfaitaire 45 %) calculé dans `SalaryContractDto`, affiché dans le tooltip "Brut" de la grille de projections. Taux externalisé dans `tax-parameters.yml`.
- Tests unitaires : (SalaryRevisionService, SalaryRevisionController ajoutés — total 199 tests)
- **Patrimoine — Gestion complète** : 
  - **Entités JPA** : `Position` + `PositionOrder` + `PortfolioSnapshot` + `PositionSnapshot` + `Instrument`
  - **Enums** : `AssetCategory`, `AssetSubType`, `FiscalEnvelope`, `OrderType`, `OwnershipType`, `PositionStatus`
  - **Backend** : `PositionService`, `InstrumentService`, `PortfolioSnapshotService` + 3 controllers
  - **DTOs** : `PositionDto`, `PositionComputedDto`, `PositionOrderDto`, `InstrumentDto`, `PortfolioSnapshotDto`, `PositionSnapshotDto` + 9 request classes
  - **Tests** : 283 tests (InstrumentServiceTest +5, InstrumentControllerTest créé +8)
  - **Frontend** : `PatrimoinePage`, `PositionForm` (wizard 2 étapes), `OrderPanel` + API layer `patrimoine.js`
  - **Navigation** : intégration menu Patrimoine + routing App.jsx
  - **Endpoints API** : `/api/positions`, `/api/instruments`, `/api/portfolio-snapshots` (CRUD complet)
  - **Documentation** : `docs/architecture/patrimoine.md`, `docs/api/patrimoine.md`
- **Patrimoine — Mise à jour manuelle des cours** (ADMIN) :
  - `GET /api/instruments/active` + `PUT /api/instruments/prices` + `PATCH /api/instruments/{id}/stable-price` protégés `ADMIN`
  - Modal `InstrumentPriceUpdateModal` : instruments groupés par catégorie (BOURSE / CRYPTO séparés), cours obsolètes (> 30 j) en orange, compteur global d'obsolètes, variation % temps réel lors de la saisie
  - Toggle 🔒/🔓 par instrument pour activer le prix fixe (`stablePrice`) — ligne grisée, saisie désactivée, pas d'indicateur d'obsolescence
  - `stablePrice` saisissable aussi à la création d'un instrument dans `PositionForm` (checkbox "Prix fixe")
  - Mise à jour optimiste du toggle avec revert sur erreur API
  - Fix CORS : `PATCH` ajouté dans `setAllowedMethods` de `SecurityConfig`
  - Bouton "Mettre à jour les cours" visible uniquement pour le rôle ADMIN
  - Documentation : `docs/architecture/instrument-price-update.md`
- **Patrimoine — Création d'instrument à la volée** :
  - Dans `PositionForm`, si la recherche BOURSE (ISIN) ou CRYPTO (ticker) ne retourne aucun résultat, proposition de créer l'instrument directement avec nom + devise
  - L'instrument créé est automatiquement sélectionné dans le formulaire
- **Patrimoine — Gestion des taux de change** (ADMIN) :
  - Entité `ExchangeRate` (table `exchange_rates`) : devise ISO, taux (nombre d'unités pour 1 EUR), date de mise à jour
  - `GET /api/exchange-rates` + `PUT /api/exchange-rates` (upsert par devise) protégés `ADMIN`
  - Convention taux : `amountEur = amountNatif / rate` — cohérent avec `PositionOrder.exchangeRate`
  - `PositionDto.computeBourseCrypto()` et `PortfolioSnapshotService.computeUnitPriceEur()` appliquent désormais la conversion devise→EUR
  - Modal `ExchangeRateUpdateModal` : tableau des taux existants + formulaire d'ajout de nouvelle devise, taux obsolètes (>7 j) en orange
  - Bouton "Taux de change" visible uniquement pour le rôle ADMIN
  - Documentation : `docs/architecture/exchange-rates.md`, `docs/api/exchange-rates.md`
  - Tests : 299 tests (ExchangeRateServiceTest +7, ExchangeRateControllerTest +5)
- **Patrimoine — Relevés de patrimoine (SnapshotPanel)** :
  - Modal `SnapshotPanel` accessible depuis le bouton "Relevés de patrimoine" (ADMIN uniquement)
  - Génération d'un snapshot pour l'utilisateur courant (`POST /api/portfolio/snapshots`) ou pour tous les utilisateurs (`POST /api/portfolio/snapshots/all`)
  - Historique des snapshots en tableau (date, investi, valeur, plus-value)
  - Recalcul d'un snapshot existant (`PUT /api/portfolio/snapshots/{id}/recalculate`)
- **Patrimoine — Date d'acquisition (IMMO_PHYSIQUE)** :
  - Champ `acquisitionDate` (`LocalDate`, nullable) ajouté sur l'entité `Position`
  - Propagé dans `CreatePositionRequest`, `UpdatePositionRequest`, `PositionDto`, `PositionService`
  - Frontend : saisie dans `PositionForm` (wizard étape 2, section IMMO_PHYSIQUE), affichage « Acquis le … » dans la `PositionCard`
- **Patrimoine — Plus-value YTD** :
  - Bloc « Plus-value YTD » dans la synthèse globale de `PatrimoinePage`
  - Calculé en frontend : `totalPlusValue` actuel − `totalCapitalGainEur` du dernier snapshot antérieur au 1er janvier de l'année en cours
  - Visible uniquement si un snapshot de l'année précédente existe ; tooltip indiquant la date du snapshot de référence
- **Patrimoine — Gestion admin des relevés** (page "Gestion des relevés") :
  - `AdminSnapshotService` + `AdminSnapshotController` : CRUD complet sur les snapshots de n'importe quel utilisateur
  - Endpoints : `GET/POST/PUT/DELETE /api/admin/snapshots` + `GET /api/admin/users/{userId}/positions`
  - Vérification d'appartenance des positions à l'utilisateur cible avant persistance
  - Frontend : `AdminSnapshotPage` (sélecteur utilisateur + tableau des relevés) + `ManualSnapshotModal` (saisie par position avec totaux temps réel)
  - Menu "Gestion des relevés" visible uniquement pour le rôle ADMIN
  - Tests : 318 tests (AdminSnapshotServiceTest +9, AdminSnapshotControllerTest +10)
  - Documentation : `docs/architecture/admin-snapshot-management.md`, `docs/api/admin-snapshots.md`
- **Dépenses récurrentes** :
  - Entité `RecurringExpense` (table `recurring_expenses`) avec `ExpenseCategoryEnum` (9 catégories) et `FrequencyEnum` (MONTHLY / ANNUAL)
  - Champ `sharePercentage` pour modéliser la répartition en colocation (ex : 50 % d'un loyer partagé)
  - `RecurringExpenseDto` calcule `monthlyAmount` et `annualAmount` à la volée (projection inverse selon fréquence)
  - `GET /api/recurring-expenses/summary` : capacité d'épargne = revenu net mensuel actif − total dépenses actives ; fallback `NET_IMPOSABLE` si profil fiscal incomplet
  - Frontend : `RecurringExpensePage` (4 KPIs, barres de répartition par catégorie, liste groupée), `RecurringExpenseForm` (aperçu projection temps réel, indicateur colocation), bouton **Dépenses** dans la navigation
  - Tests : 347 tests (RecurringExpenseServiceTest +16, RecurringExpenseControllerTest +13)
  - Documentation : `docs/architecture/recurring-expenses.md`, `docs/api/recurring-expenses.md`
  - ⚠ Migration SQLite requise sur la base prod (ajout de `ALIMENTATION` à la CHECK constraint de `recurring_expenses.category`)
- **Passifs (grandes possessions)** :
  - Entité `Possession` (table `possessions`) avec `PossessionCategoryEnum` (7 catégories : VEHICULE, INFORMATIQUE, ELECTROMENAGER, MOBILIER, COLLECTION, LOISIRS, AUTRE)
  - Modèle de décote exponentielle par catégorie (taux 0 %–30 %/an) avec valeur résiduelle minimale — calcul dans `PossessionDto.from()` via factory statique
  - Override manuel : si `estimatedCurrentValue` est renseigné, il prend le pas sur la projection automatique
  - `GET /api/possessions/summary` : totaux globaux (prix achat, valeur actuelle, décote €/%) + répartition par catégorie
  - Frontend : `PossessionPage` (4 KPIs, barres de répartition, liste groupée par catégorie avec badge « Manuel »), `PossessionForm` (aperçu projection temps réel, indicateur override), bouton **Passifs** dans la navigation
  - Tests : 380 tests (PossessionServiceTest +18, PossessionControllerTest +15)
  - Documentation : `docs/architecture/passifs.md`, `docs/api/possessions.md`

- **Bilan financier personnel** (Outils → Bilan financier) :
  - Vue synthétique calquée sur le compte de résultat d'entreprise
  - Revenus : salaire actif, revenus complémentaires (LOCATIF, DIVIDENDE, AIDE_SOCIALE), gains mensuels moyens par catégorie d'actif (`capitalGainEur / 12`)
  - Dépenses : dépenses récurrentes par catégorie + impôt estimé (`totalEstimatedTax / 12`)
  - Actif / Passif côte à côte : positions actives (hors IMMO_PHYSIQUE) / possessions + IMMO_PHYSIQUE
  - `IMMO_PHYSIQUE` classé en Passif (résidence principale non locative)
  - Type `AUTRE` des revenus complémentaires exclu (non récurrent)
  - Toggle Mensuel / Annuel (× 12) ; TOTAL Actif et Passif toujours alignés en bas (`mt-auto`)
  - Δ R-D en vert/rouge selon la capacité d'épargne
  - Aucun endpoint backend nouveau — 6 appels parallèles vers endpoints existants
  - Documentation : `docs/architecture/bilan-financier.md`

**À venir :**
- Regroupements familiaux (`FamilyGroup`)
- Patrimoine — autres catégories (Bourse, Crypto, Immo Papier, Immo Physique)
- Scheduler Yahoo Finance / CoinGecko (mise à jour des prix marché)
- **Tableau de bord** :
  - Graphique d'évolution salariale (`SalaryEvolutionChart`) — 4 courbes (brut, net fiscal, net versé, PAS) basées sur `MonthlyPaySlip` — doc : `docs/architecture/dashboard.md`, API : `docs/api/dashboard.md`
  - Graphique plus-values par catégorie (`CapitalGainsByCategoryChart`) — camembert (donut) Recharts, agrège `computed.capitalGainEur` par catégorie depuis `GET /api/positions?status=ACTIVE`, couleurs cohérentes avec `PatrimoinePage`, catégories en perte affichées en opacité réduite — occupes `w-1/4` du dashboard — doc : `docs/architecture/dashboard.md`
  - Graphiques patrimoine et diversification (à définir)
