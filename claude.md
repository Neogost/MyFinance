# MyFinance — Contexte projet pour Claude

## ⚡ Lecture obligatoire en début de session

Avant d'implémenter quoi que ce soit, lire ces deux fichiers pour connaître les patterns de code du projet et ne pas avoir à inférer les conventions depuis le code existant :

- **Backend** (entité, service, controller, DTOs, tests) → [`docs/architecture/decisions/PATTERNS-backend.md`](docs/architecture/decisions/PATTERNS-backend.md)
- **Frontend** (page, formulaire modal, API layer, CSS, navigation) → [`docs/architecture/decisions/PATTERNS-frontend.md`](docs/architecture/decisions/PATTERNS-frontend.md)
- **Documentation** (architecture, API, mise à jour CLAUDE.md) → [`docs/architecture/decisions/PATTERNS-documentation.md`](docs/architecture/decisions/PATTERNS-documentation.md)

Ces fichiers contiennent les squelettes de code à suivre. Tout nouveau module doit respecter ces patterns.

---

## ✅ Checklist de fin de tâche — obligatoire

Avant de considérer une tâche comme terminée, vérifier chaque point applicable.

### Tests unitaires

- Nouvelle méthode de service → test ajouté dans `*ServiceTest` (`@ExtendWith(MockitoExtension.class)`)
- Nouveau endpoint controller → test ajouté dans `*ControllerTest` (`@WebMvcTest`)
- Comportement existant modifié → tests impactés mis à jour (pas de test cassé silencieux)
- Exécuter `./mvnw test` et vérifier BUILD SUCCESS
- Si le nombre total de tests a changé → mettre à jour le count dans `readme.md`

### Documentation

| Modification | Fichiers à mettre à jour |
|-------------|--------------------------|
| Nouveau champ sur une entité | `docs/architecture/<module>.md` (section modèle) · `er-diagram.mmd` · `class-diagram.mmd` |
| Nouvel endpoint ou endpoint modifié | `docs/api/<module>.md` · table "Endpoints backend existants" dans `CLAUDE.md` |
| Nouvelle fonctionnalité livrée | `docs/architecture/overview.md` · section "Statut du projet" dans `CLAUDE.md` |
| Nouvelle règle de gestion | `docs/architecture/<module>.md` (section règles métier) |
| Nouveau flux complexe | Envisager un diagramme `.mmd` dans `docs/architecture/diagram/` |
| Module entièrement nouveau | Créer `docs/architecture/<module>.md` + `docs/api/<module>.md` · référencer dans `CLAUDE.md` + `readme.md` |

> Ces deux points (tests + docs) sont **non négociables** : une fonctionnalité sans test ni documentation n'est pas terminée.

### Responsive mobile

- Tout nouveau composant frontend → vérifier en **375 px** (iPhone SE) dans Chrome DevTools avant commit
- Modals : `flex items-end sm:items-center` + `z-60` + `max-h-[90vh] overflow-y-auto` + `rounded-t-2xl sm:rounded-xl`
- Grilles : jamais `grid-cols-N` sans fallback `grid-cols-1 md:grid-cols-N`
- Tableaux : toujours `<div className="overflow-x-auto">` autour de `<table>`
- Layouts 2 panneaux : `flex flex-col lg:flex-row gap-N lg:items-start` (pas `items-start` sans `lg:`)
- Script de détection : `./scripts/check-mobile-patterns.sh --staged`
- Référence complète : `docs/audits/MOBILE-AUDIT-2026-04-29.md` · Patterns détaillés : `docs/architecture/decisions/ADR-004-responsive-mobile.md`

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
- **Mise à jour des cours** : Boursorama (BOURSE, scraping Jsoup) + CoinGecko API (CRYPTO) + Frankfurter/ECB (taux de change) via tâches `@Scheduled` Spring
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
│       ├── TaxSimulatorPage.jsx               Simulateur des impôts
│       ├── FiscalEnvelopeComparatorPage.jsx    Comparateur d'enveloppes fiscales
│       └── … (BilanFinancier, Lombard, Crise, Emprunt, Intérêts composés, Performance)
├── data/
│   └── fiscal-envelopes.js   Barèmes fiscaux PEA/CTO/AV/PER (PFU, abattements, plafonds)
├── utils/
│   └── fiscalEnvelopes.js    Fonctions de calcul par enveloppe + orchestrateur compareEnvelopes
├── App.jsx           Routage par état (currentPage : dashboard | salary | other-incomes | expenses | tax-simulator | fiscal-envelopes | users | profile)
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
- Gestion des utilisateurs, inscription, matelas de sécurité : `docs/architecture/user-management.md`
- Gestion des revenus (entités, formules, accès) : `docs/architecture/salary.md`
- Contrats fonction publique (indice, cotisations, migration) : `docs/architecture/salary-public-sector.md`
- Simulateur des impôts (algorithme, barème, config) : `docs/architecture/tax-simulator.md`
- Schéma de base de données (ER diagram complet) : `docs/architecture/diagram/er-diagram.mmd`
- Modèle de données (diagramme de classes) : `docs/architecture/diagram/class-diagram.mmd`
- Calcul salarial complet (superGross → net d'impôt) : `docs/architecture/diagram/flowchart-salary-calculation.mmd`
- Simulation fiscale IRPP (barème, déductions, taux séparés) : `docs/architecture/diagram/flowchart-fiscal-simulation.mmd`
- Scheduler marché (Boursorama + CoinGecko + ECB + snapshot) : `docs/architecture/diagram/sequence-market-data-scheduler.mmd`
- Gestion des dettes (projection auto vs override manuel) : `docs/architecture/diagram/activity-debt-management.mmd`
- Ajout d'une position (wizard 6 catégories) : `docs/architecture/diagram/activity-asset-management-add-diagram.mmd`
- Décisions d'architecture (ADR) : `docs/architecture/decisions/`
- Audit responsive mobile et plan de mise en conformité : `docs/audits/MOBILE-AUDIT-2026-04-29.md`
- Tableau de bord (graphiques) : `docs/architecture/dashboard.md`
- API authentification : `docs/api/authentication.md`
- API tableau de bord : `docs/api/dashboard.md`
- API utilisateurs : `docs/api/users.md`
- API profil (safety-net, fiscal, personal-info) : `docs/api/profile.md`
- API contrats salariaux et bulletins : `docs/api/salary-contracts.md`
- API revenus complémentaires : `docs/api/other-incomes.md`
- API simulateur des impôts : `docs/api/tax-simulator.md`
- API référentiel fiscal (barème kilométrique) : `docs/api/fiscal-referentiel.md`
- API version de l'application : `docs/api/app-info.md`
- Gestion du patrimoine (architecture) : `docs/architecture/patrimoine.md`
- Instruments, cours, taux de change et scheduler (architecture) : `docs/architecture/instruments.md`
- API patrimoine — instruments, positions, ordres : `docs/api/patrimoine-positions.md`
- API patrimoine — snapshots et données marché : `docs/api/patrimoine-snapshots.md`
- API patrimoine — outils (score, objectifs, référentiel INSEE) : `docs/api/patrimoine-outils.md`
- Performance patrimoniale (TWR / MWR — *spécifié, non implémenté*) : `docs/architecture/patrimoine-performance.md`
- Gestion des dépenses récurrentes (architecture) : `docs/architecture/recurring-expenses.md`
- Bilan financier personnel (architecture) : `docs/architecture/tools/bilan-financier.md`
- Simulateur d'intérêts composés (architecture) : `docs/architecture/tools/compound-interest-simulator.md`
- Simulateur de crédit Lombard (architecture) : `docs/architecture/tools/lombard-credit-simulator.md`
- Comparateur d'enveloppes fiscales (architecture) : `docs/architecture/tools/fiscal-envelope-comparator.md`
- Simulateur retraite (architecture, spécifié) : `docs/architecture/tools/retirement-simulator.md`
- API dépenses récurrentes : `docs/api/recurring-expenses.md`
- Historique des connexions (architecture) : `docs/architecture/login-history.md`
- API historique des connexions : `docs/api/login-history.md`
- Regroupement familial (architecture) : `docs/architecture/family-group.md`
- API regroupement familial : `docs/api/family-group.md`
- API demandes d'inscription : `docs/api/registration-requests.md`
- API échange-rates : `docs/api/exchange-rates.md`
- Gestion des dettes (architecture) : `docs/architecture/dettes.md`
- API dettes : `docs/api/debts.md`

## Endpoints backend existants

### Authentification
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `POST` | `/api/auth/login` | Public | Login (form-urlencoded) → cookie JSESSIONID |
| `POST` | `/api/auth/logout` | Authentifié | Déconnexion |
| `GET` | `/api/auth/me` | Authentifié | Utilisateur courant |
| `PUT` | `/api/auth/password` | Authentifié | Changement de son propre mot de passe |
| `POST` | `/api/auth/register` | Public | Soumettre une demande d'inscription |

### Inscriptions (admin)
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/admin/registrations` | ADMIN | Lister les demandes (filtrable par `?status=`) |
| `POST` | `/api/admin/registrations/{id}/approve` | ADMIN | Approuver une demande (crée le compte) |
| `POST` | `/api/admin/registrations/{id}/reject` | ADMIN | Rejeter une demande |

### Profil utilisateur (self-service)
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `PUT` | `/api/profile/safety-net` | Authentifié | Mettre à jour le matelas de sécurité |
| `PUT` | `/api/profile/fiscal` | Authentifié | Mettre à jour le profil fiscal (parts, abattement, frais réels) |
| `PUT` | `/api/profile/personal-info` | Authentifié | Mettre à jour les infos personnelles (déclaration patrimoine) |

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
| `POST` | `/api/salary-contracts` | Authentifié | Créer un contrat PRIVATE ou PUBLIC (1 seul actif à la fois) |
| `PUT` | `/api/salary-contracts/{id}` | Authentifié | Modifier un contrat |
| `DELETE` | `/api/salary-contracts/{id}` | Authentifié | Supprimer un contrat (cascade bulletins) |
| `GET` | `/api/salary-contracts/public/point-value?date=` | Authentifié | Valeur annuelle du point d'indice fonction publique à une date |

### Révisions salariales
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/salary-contracts/{id}/revisions` | Authentifié | Liste des révisions d'un contrat |
| `POST` | `/api/salary-contracts/{id}/revisions` | Authentifié | Ajouter une révision (brut ou indiceMajore selon type de contrat) |
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

### Astreintes (ContractOnCall)
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/salary-contracts/{id}/on-calls` | Authentifié | Liste des astreintes d'un contrat |
| `POST` | `/api/salary-contracts/{id}/on-calls` | Authentifié | Ajouter une astreinte (forfait hebdomadaire × semaines/an) |
| `PUT` | `/api/salary-contracts/{id}/on-calls/{onCallId}` | Authentifié | Modifier une astreinte |
| `DELETE` | `/api/salary-contracts/{id}/on-calls/{onCallId}` | Authentifié | Supprimer une astreinte |

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
| `PUT` | `/api/instruments/{id}` | ADMIN | Modifier un instrument |
| `GET` | `/api/instruments/active` | ADMIN | Liste les instruments liés à au moins une position ACTIVE |
| `PUT` | `/api/instruments/prices` | ADMIN | Mise à jour groupée des cours (lastPrice + lastPriceUpdatedAt) |
| `PATCH` | `/api/instruments/{id}/stable-price` | ADMIN | Activer / désactiver le prix fixe d'un instrument |
| `PUT` | `/api/instruments/{id}/allocations` | ADMIN | Remplacer l'allocation géographique (replace complet) |
| `PUT` | `/api/instruments/{id}/sector-allocations` | ADMIN | Remplacer l'allocation sectorielle (replace complet) |
| `DELETE` | `/api/instruments/{id}` | ADMIN | Supprimer un instrument et ses positions |
| `POST` | `/api/admin/allocations/run` | ADMIN | Déclencher la mise à jour automatique des allocations géographiques |

### Patrimoine — Positions
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/positions` | Authentifié | Liste ses positions (filtrable par `category`, `status`) |
| `GET` | `/api/positions/{id}` | Authentifié | Détail + ordres d'une position |
| `POST` | `/api/positions` | Authentifié | Créer une position (LIVRET, LIQUIDITE, …) |
| `PUT` | `/api/positions/{id}` | Authentifié | Modifier une position |
| `PUT` | `/api/positions/{id}/balance` | Authentifié | Mettre à jour le solde (LIQUIDITE uniquement) |
| `PUT` | `/api/positions/{id}/estimated-value` | Authentifié | Mettre à jour la valeur estimée (IMMO_PHYSIQUE uniquement) |
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

### Historique des connexions (admin)
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/admin/login-history` | ADMIN | Liste paginée des événements de connexion (filtres : login, type, from, to, page, size) |

### Regroupement familial
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/family-groups/my` | Authentifié | Groupe de l'utilisateur connecté (null si aucun) |
| `GET` | `/api/family-groups/my/members` | Authentifié | Membres du groupe hors soi-même (pour co-emprunteur) |
| `POST` | `/api/family-groups` | Authentifié | Créer un groupe (l'appelant devient owner) |
| `PUT` | `/api/family-groups/my` | Authentifié (owner) | Renommer son groupe |
| `DELETE` | `/api/family-groups/my` | Authentifié (owner) | Dissoudre son groupe |
| `DELETE` | `/api/family-groups/my/leave` | Authentifié (non-owner) | Quitter son groupe |
| `DELETE` | `/api/family-groups/my/members/{userId}` | Authentifié (owner) | Retirer un membre |
| `POST` | `/api/family-groups/my/invitations` | Authentifié (owner) | Inviter un utilisateur par login |
| `GET` | `/api/family-groups/invitations/pending` | Authentifié | Invitations reçues en attente |
| `POST` | `/api/family-groups/invitations/{id}/accept` | Authentifié | Accepter une invitation |
| `POST` | `/api/family-groups/invitations/{id}/refuse` | Authentifié | Refuser une invitation |
| `GET` | `/api/admin/family-groups` | ADMIN | Liste tous les groupes avec membres |
| `GET` | `/api/admin/family-groups/{id}` | ADMIN | Détail d'un groupe (membres + invitations) |
| `DELETE` | `/api/admin/family-groups/{id}` | ADMIN | Supprimer un groupe (modération) |
| `DELETE` | `/api/admin/family-groups/{id}/members/{userId}` | ADMIN | Retirer un membre (modération) |

### Stratégie & Objectifs patrimoniaux
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/patrimoine/targets` | Authentifié | Objectifs cibles + sous-objectifs (`PatrimoineTargetsDto` : `targets` map + `breakdowns` par catégorie) |
| `PUT` | `/api/patrimoine/targets` | Authentifié | Remplace l'intégralité des objectifs et sous-objectifs (upsert) |
| `GET` | `/api/patrimoine/breakdown/{dimension}` | Authentifié | Répartition réelle BOURSE par dimension (`sector`, `country`, `currency`, `asset-subtype`) avec ratio de couverture |

### Scoring patrimonial
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/patrimoine/score` | Authentifié | Score patrimonial 0-105 avec détail par axe (`PatrimoineScoreDto`) |

### Positionnement INSEE
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/patrimoine/referentiel` | Authentifié | Référentiel seuils par décile et tranche d'âge (INSEE 2021-2022) |

### Budgets par catégorie
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/expense-budgets` | Authentifié | Plafonds mensuels par catégorie de dépense |
| `PUT` | `/api/expense-budgets` | Authentifié | Enregistrer tous les budgets (remplacement complet) |

### Référentiel fiscal
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/fiscal/bareme-kilometrique` | Authentifié | Barème kilométrique fiscal en vigueur (voitures) |

### Tableau de bord
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/dashboard/salary-evolution` | Authentifié | Évolution salariale (tous bulletins triés par période) |

### Données de marché (admin)
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `POST` | `/api/admin/market-data/run` | ADMIN | Déclencher manuellement la mise à jour des cours + snapshot mensuel |

### Analytics — Tracking (public)
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `POST` | `/api/analytics/track` | Authentifié | Enregistrer un event comportemental (PAGE_VIEW, FEATURE_USE, BUTTON_CLICK, FORM_SUBMIT) |
| `POST` | `/api/analytics/error` | Authentifié | Remonter une erreur frontend |
| `PUT` | `/api/profile/analytics-opt-out` | Authentifié | Activer/désactiver le suivi de son usage |

### Analytics — Administration (admin)
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/admin/analytics/engagement-summary` | ADMIN | KPIs : events totaux, sessions uniques, events/session |
| `GET` | `/api/admin/analytics/retention` | ADMIN | Sessions uniques et events par jour |
| `GET` | `/api/admin/analytics/top-events` | ADMIN | Top events sur une période (filtrable par type) |
| `GET` | `/api/admin/analytics/timeline` | ADMIN | Série temporelle d'un event_name |
| `GET` | `/api/admin/analytics/journey/{sessionId}` | ADMIN | Events du parcours d'une session |
| `GET` | `/api/admin/analytics/journey/{sessionId}/errors` | ADMIN | Erreurs survenues pendant une session |
| `GET` | `/api/admin/analytics/errors` | ADMIN | Erreurs groupées par fingerprint |
| `GET` | `/api/admin/analytics/errors/{fingerprint}` | ADMIN | Occurrences d'une erreur (paginées, avec sessionId) |
| `GET` | `/api/admin/analytics/health` | ADMIN | Synthèse santé : KPIs + timeline erreurs/jour |
| `DELETE` | `/api/admin/analytics/purge` | ADMIN | Supprimer les données antérieures à N jours |

### Version de l'application
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/version` | Authentifié | Version déployée de l'application |

### Simulations d'emprunt
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/loan-simulations` | Authentifié | Liste les simulations sauvegardées (triées par date desc) |
| `POST` | `/api/loan-simulations` | Authentifié | Sauvegarder une simulation (nom + paramètres JSON) |
| `DELETE` | `/api/loan-simulations/{id}` | Authentifié | Supprimer une simulation (ownership vérifié) |

### Passifs (grandes possessions)
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/possessions` | Authentifié | Liste ses possessions (avec valeurs calculées) |
| `GET` | `/api/possessions/{id}` | Authentifié | Détail d'une possession |
| `GET` | `/api/possessions/summary` | Authentifié | Synthèse : totaux + répartition par catégorie |
| `POST` | `/api/possessions` | Authentifié | Créer une possession |
| `PUT` | `/api/possessions/{id}` | Authentifié | Modifier une possession (ownership vérifié) |
| `DELETE` | `/api/possessions/{id}` | Authentifié | Supprimer une possession (ownership vérifié) |

### Dettes
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/debts` | Authentifié | Liste ses dettes (avec capital restant et tableau d'amortissement) |
| `GET` | `/api/debts/{id}` | Authentifié | Détail d'une dette + nextMonthsSchedule |
| `GET` | `/api/debts/summary` | Authentifié | Synthèse : totaux + répartition par type |
| `POST` | `/api/debts` | Authentifié | Créer une dette |
| `PUT` | `/api/debts/{id}` | Authentifié | Modifier une dette (ownership vérifié) |
| `DELETE` | `/api/debts/{id}` | Authentifié | Supprimer une dette (ownership vérifié) |
| `GET` | `/api/debts/{id}/balance-entries` | Authentifié | Historique des mises à jour manuelles du capital |
| `POST` | `/api/debts/{id}/balance-entries` | Authentifié | Ajouter une mise à jour manuelle (met à jour remainingCapitalOverride) |
| `DELETE` | `/api/debts/{id}/balance-entries/{entryId}` | Authentifié | Supprimer une entrée (recalcule le dernier override actif) |

### Patrimoine — Snapshots (admin — gestion manuelle)
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/admin/snapshots?userId={id}` | ADMIN | Liste les snapshots d'un utilisateur |
| `GET` | `/api/admin/snapshots/{id}` | ADMIN | Détail complet d'un snapshot admin |
| `POST` | `/api/admin/snapshots` | ADMIN | Créer manuellement un snapshot pour un utilisateur |
| `PUT` | `/api/admin/snapshots/{id}` | ADMIN | Modifier un snapshot existant |
| `DELETE` | `/api/admin/snapshots/{id}` | ADMIN | Supprimer un snapshot |
| `GET` | `/api/admin/users/{userId}/positions` | ADMIN | Positions actives d'un utilisateur (pour le formulaire) |

### Performance patrimoniale (TWR / MWR) — *en travaux, ADMIN only*
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/patrimoine/performance` | ADMIN | Performance globale (TWR + MWR) sur la période — params optionnels : `from`, `to`, `benchmarkRate` |
| `GET` | `/api/patrimoine/performance/positions` | ADMIN | Performance de toutes les positions éligibles, triées par TWR décroissant |
| `GET` | `/api/patrimoine/performance/positions/{id}` | ADMIN | Performance d'une position individuelle (ownership vérifié) |

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

## Gestion des versions

Le projet suit le **versionnage sémantique** (`MAJOR.MINOR.PATCH`).

**Convention :**
| Type | Quand |
|------|-------|
| PATCH (`1.2.X`) | Correction de bug, amélioration mineure, tests |
| MINOR (`1.X.0`) | Nouvelle fonctionnalité, nouvel écran, nouvel endpoint |
| MAJOR (`X.0.0`) | Refonte, migration de base non triviale, rupture d'API |

**Checklist avant chaque release :**
```bash
# 1. Mettre à jour backend/pom.xml : <version>1.2.1</version> → <version>1.3.0</version>

# 2. Ajouter la nouvelle entrée au sommet de CHANGELOG.md (cf. docs/contributing/changelog-template.md)
#    Le contenu est affiché aux utilisateurs via la modal "Notes de version" du pied de page.

# 3. Commiter
git add backend/pom.xml CHANGELOG.md
git commit -m "chore(release): bump version to 1.3.0"

# 4. Tagger et pousser
git tag v1.3.0
git push origin main && git push origin v1.3.0

# 5. Déployer
./scripts/deploy.sh
```

**Comment la version circule :**
- `backend/pom.xml` → `mvn package` → `META-INF/build-info.properties` (via goal `build-info` du `spring-boot-maven-plugin`)
- `BuildProperties` bean Spring → `GET /api/version` → frontend
- Affichage : footer desktop (toutes les pages) + bas du menu mobile
- Bouton "Notes de version" à côté du numéro → ouvre la modal `ReleaseNotesModal` qui rend `CHANGELOG.md` (chargé via `?raw` Vite)

**Règle :** le tag git et `<version>` dans `pom.xml` doivent toujours correspondre.
Procédure complète : `docs/deployment/docker-deployment.md`

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

# Lancer le frontend en développement
cd frontend
npm run dev

# Déployer en production (après bump de version et tag)
./scripts/deploy.sh
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
- Se référer à `docs/architecture/diagram/er-diagram.mmd` pour toute modification des entités JPA (schéma DB complet)
- Ne pas inventer de structure de données non documentée

## Statut du projet
✅ V1 livrée — application déployée en production sur NAS QNAP via Docker

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
  - **Documentation** : `docs/architecture/patrimoine.md`, `docs/api/patrimoine-positions.md`
- **Patrimoine — Mise à jour manuelle des cours** (ADMIN) :
  - `GET /api/instruments/active` + `PUT /api/instruments/prices` + `PATCH /api/instruments/{id}/stable-price` protégés `ADMIN`
  - Modal `InstrumentPriceUpdateModal` : instruments groupés par catégorie (BOURSE / CRYPTO séparés), cours obsolètes (> 30 j) en orange, compteur global d'obsolètes, variation % temps réel lors de la saisie
  - Toggle 🔒/🔓 par instrument pour activer le prix fixe (`stablePrice`) — ligne grisée, saisie désactivée, pas d'indicateur d'obsolescence
  - `stablePrice` saisissable aussi à la création d'un instrument dans `PositionForm` (checkbox "Prix fixe")
  - Mise à jour optimiste du toggle avec revert sur erreur API
  - Fix CORS : `PATCH` ajouté dans `setAllowedMethods` de `SecurityConfig`
  - Bouton "Mettre à jour les cours" visible uniquement pour le rôle ADMIN
  - Documentation : `docs/architecture/instruments.md`
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
  - Δ R-D en vert/rouge + **taux d'épargne** en sous-titre
  - **Ratio de couverture patrimoniale** : `totalActif / (dépenses annuelles)` affiché en années (bloc indigo)
  - **Projection FIRE** : objectif × 25 dépenses, barre de progression, années restantes, rendement pondéré (bloc violet)
  - Toggle Mensuel / Annuel (× 12) ; TOTAL Actif et Passif toujours alignés en bas (`mt-auto`)
  - Aucun endpoint backend nouveau — 6 appels parallèles vers endpoints existants
  - Documentation : `docs/architecture/tools/bilan-financier.md`

- **Patrimoine — Relevé optionnel du montant investi** :
  - `investedAmountEur` n'est plus obligatoire dans la saisie d'un relevé manuel
  - Colonnes `investedAmountEur` et `capitalGainEur` devenues nullable dans `PositionSnapshot` et `PortfolioSnapshot`
  - La logique de calcul des totaux ignore les positions sans données d'investissement

- **Patrimoine — Positionnement INSEE par décile** :
  - Référentiel INSEE Enquête Patrimoine 2021-2022 chargé depuis `patrimoine-referentiel.yml` via `@ConfigurationProperties`
  - Endpoint `GET /api/patrimoine/referentiel` retournant les seuils D1–D9 par tranche d'âge (7 tranches : 18-29, 30-39, …, 80+)
  - `birthDate` ajouté dans la réponse du login (`SecurityConfig`) pour permettre le calcul côté frontend
  - `PatrimoinePage` affiche `D{rang}/10 · {label tranche}` sous la valeur du patrimoine brut
  - Documentation : `docs/api/patrimoine-outils.md`

- **Tableau de bord — Évolution du patrimoine** (`PatrimoineEvolutionChart`) :
  - Graphique en aires empilées par catégorie (IMMO_PHYSIQUE → BOURSE) basé sur les snapshots saisis
  - Axe X proportionnel au temps (timestamps Unix, Recharts `scale="time"`)
  - Point live "Aujourd'hui" depuis les positions actives, avec ReferenceLine pointillée
  - Toggle valeur absolue (€) / répartition (%)
  - Documentation : `docs/architecture/dashboard.md`

- **Tableau de bord — Widget FIRE** (`FireProjectionWidget`) :
  - Projection FIRE (règle des 4 %) : années restantes, barre de progression jalonnée 25/50/75 %
  - Autonomie passive actuelle : revenus passifs vs dépenses mensuelles, barre de couverture
  - Hypothèses : taux d'épargne, épargne mensuelle, rendement pondéré, dépenses annuelles
  - Documentation : `docs/architecture/dashboard.md`

- **Authentification — Restauration de session au refresh** :
  - `App.jsx` appelle `GET /api/auth/me` au démarrage pour restaurer la session sans passer par le login
  - Timeout de session passé de 30 min à **12 heures** (`server.servlet.session.timeout=12h`)
  - Cookie renforcé : `HttpOnly=true`, `SameSite=Strict`
  - Documentation : `docs/api/authentication.md`

- **Protection brute-force (anti brute-force login)** :
  - `LoginAttemptService` : tracking en mémoire des échecs par login (`ConcurrentHashMap`), durée de blocage exponentielle (5→10→20→40→80 min)
  - `LoginRateLimitFilter` : filtre Servlet `@Order(HIGHEST_PRECEDENCE)` exécuté avant Spring Security — bloque même si le mot de passe est correct pendant le verrouillage
  - `SecurityConfig` : failure handler retourne `429` avec `secondesRestantes`, success handler réinitialise le compteur
  - `LoginRateLimitProperties` : paramètres externalisés dans les fichiers `application-{profil}.properties` (`security.login.max-attempts`, `base-lock-minutes`, `max-lock-minutes`)
  - Frontend (`LoginForm.jsx`) : affiche un compte à rebours orange, désactive le formulaire pendant le blocage
  - Valeurs dev : 3 tentatives / 1 min / 10 min max — valeurs prod : 5 / 5 min / 80 min
  - Documentation : `docs/api/authentication.md` (section "Protection brute-force")

- **Pages d'erreurs HTTP** :
  - `ErrorPage.jsx` : composant polyvalent couvrant toutes les familles HTTP (3xx bleu, 4xx ambre, 5xx rouge) — utilisable plein écran (`fullPage`) ou inline, props `onRetry` et `onHome`
  - `ErrorBoundary.jsx` : React Error Boundary (classe) qui capture les erreurs JS non gérées pendant le rendu et affiche une page 500 avec bouton "Réessayer"
  - `api/client.js` : instance Axios partagée avec intercepteurs globaux — `401` redirige vers le login, `5xx` affiche la page d'erreur
  - Tous les fichiers `api/*.js` migrés vers l'instance partagée (`client.js`)
  - `App.jsx` : intègre `ErrorBoundary`, état `appError` pour les 5xx, enregistrement des callbacks d'intercepteur au démarrage

- **Historique des connexions** (admin) :
  - Entité `LoginEvent` (table `login_events`) : login tenté, type (`SUCCESS`/`FAILURE`/`BLOCKED`), IP, User-Agent, compteur d'échecs, horodatage
  - `LoginHistoryService` : `logSuccess`, `logFailure`, `logBlocked`, `getHistory` (paginé + filtres)
  - Intégration dans `SecurityConfig` (success/failure handlers) et `LoginRateLimitFilter` (blocked)
  - `GET /api/admin/login-history` (ADMIN) : liste paginée avec filtres `login`, `type`, `from`, `to`, `page`, `size`
  - Frontend : `LoginHistoryPage` (tableau coloré SUCCESS/FAILURE/BLOCKED, filtres, pagination) — bouton "Historique connexions" visible ADMIN
  - Tests : (LoginHistoryServiceTest +9, AdminLoginHistoryControllerTest +5)
  - Documentation : `docs/architecture/login-history.md`, `docs/api/login-history.md`

- **Regroupement familial** (`FamilyGroup`) : spécification complète documentée — entités `FamilyGroup` + `FamilyGroupInvitation`, système d'invitation owner→membre (PENDING/ACCEPTED/REFUSED), toggle "Mode Foyer" de session dans la navigation, agrégation Patrimoine (sous-lignes dépliables par membre) et Tableau de bord, restriction co-emprunteur aux membres du groupe, gestion self-service via Mon Profil, modération ADMIN. Documentation : `docs/architecture/family-group.md`, `docs/api/family-group.md`

- **Stratégie & Objectifs patrimoniaux** : objectifs cibles par catégorie persistés en base — entité `PatrimoineTarget` (`patrimoine_targets`, unicité `user_id + category`), `GET/PUT /api/patrimoine/targets` (upsert complet). Frontend : bouton "Stratégie & Objectifs" dans `PatrimoinePage`, modal `PatrimoineStrategyModal` (saisie par catégorie), `CategoryStrategyBar` sur chaque carte de résumé (indigo si en cours, emerald si atteint, rouge si dépassé). Tests : `PatrimoineTargetServiceTest` + `PatrimoineTargetControllerTest`. Documentation : `docs/architecture/patrimoine-strategy.md`

- **Stratégie V2 — Diversification BOURSE multi-dimensions** : extension de `PatrimoineTarget` avec sous-objectifs par dimension. Nouvelle entité `PatrimoineTargetBreakdown` (`patrimoine_target_breakdowns`, unicité `target_id + dimension + key`, cascade `ON DELETE`) + enum `BreakdownDimension` (SECTOR / COUNTRY / CURRENCY / ASSET_SUBTYPE / CRYPTO_TYPE). DTO `PatrimoineTargetsDto` = `targets` map + `breakdowns` par catégorie. Validation service : somme ≤ 100 % par dimension, dimension autorisée par catégorie (les 4 sont autorisées sur BOURSE), clé en doublon refusée. Nouveau service `PatrimoineBreakdownService` avec dispatcher `getBreakdown(user, dimension)` :
  - **SECTOR** : agrège `valueEur × InstrumentSectorAllocation.percentage` (résidu en "Non classé")
  - **COUNTRY** : agrège `valueEur × InstrumentAllocation.percentage` (résidu en "Non classé")
  - **CURRENCY** : agrège par `Instrument.currency` (couverture 100 %)
  - **ASSET_SUBTYPE** : agrège par `Position.assetSubType` (positions sans sous-type → "Non classé")

  Endpoint unifié `GET /api/patrimoine/breakdown/{dimension}` (`sector` / `country` / `currency` / `asset-subtype`) retournant `PortfolioBreakdownDto` (`totalEur`, `coverageRatio`, `unclassifiedEur`, `breakdown[]`). Frontend : 4 sections repliables dans `PatrimoineStrategyModal` (sous-composant `BreakdownDimensionEditor` réutilisable, suggestions depuis le portefeuille réel, total live, dépassement bloqué par dimension), composant `BreakdownPanel` générique paramétré par dimension, affiché 4× sur la carte BOURSE (barres réel vs cible, écart en points colorisé ±2/5/10 pts, bandeau d'alerte couverture < 80 % uniquement pour SECTOR/COUNTRY). Migration : `010_add_patrimoine_target_breakdowns.sql` (CHECK constraint inclut les 5 dimensions). Tests : 821 tests backend BUILD SUCCESS (+10 PatrimoineBreakdownServiceTest couvrant les 4 dimensions, +6 PatrimoineBreakdownControllerTest, +1 PatrimoineTargetServiceTest pour COUNTRY/CURRENCY/ASSET_SUBTYPE), 220 tests frontend patrimoine + dashboard. Documentation : `docs/architecture/patrimoine-strategy.md` (section V2)

- **Dettes** :
  - Entité `Debt` (table `debts`) + `DebtBalanceEntry` (table `debt_balance_entries`) avec `DebtTypeEnum` (IMMOBILIER, ETUDIANT, VEHICULE, CONSOMMATION, AUTRE)
  - Deux modes de suivi du capital : projection automatique (formule d'amortissement `B(n) = P*(1+r)^n − M*((1+r)^n − 1)/r`) ou override manuel via `remainingCapitalOverride`
  - `DebtDto` calcule à la volée : `remainingCapital`, `isManualOverride`, `monthlyInsurance`, `monthlyTotal`, `progressPercent`, `nextMonthsSchedule` (tableau 12 mois)
  - `DebtBalanceEntry` : historique des mises à jour manuelles — chaque ajout/suppression recalcule `debt.remainingCapitalOverride` depuis la valeur la plus récente
  - `GET /api/debts/summary` : totaux + répartition par type (`DebtSummaryDto`)
  - **`DebtForm`** : champ "Lier à un bien immobilier" avec autocomplétion sur les positions `IMMO_PHYSIQUE` actives (filtrage temps réel, surlignage des caractères, item pré-sélectionné en édition) — remplace l'ancien champ ID numérique
  - **`PositionCard`** (IMMO_PHYSIQUE liée à un crédit) : bloc rouge "Crédit lié — capital restant dû" + calcul de la **valeur nette** = valeur estimée − capital restant ; données chargées en parallèle dans `PatrimoinePage` via `GET /api/debts`
  - **Bilan financier** : section Passif enrichie — dettes regroupées par type avec capital restant dû en rouge ; `totalPassif` inclut désormais `totalRemainingCapital` des dettes
  - **Déclaration de patrimoine** : synthèse "Passifs & dettes" avec sous-lignes par type ; tableau "Dettes" en section dédiée (libellé, établissement, capital restant, mensualité par crédit)
  - **Simulateur de crise** : `patrimoineNet = patrimoineBrut − (possessions + dettes)` — les dettes ne baissent pas en crise, amplifiant l'impact sur le patrimoine net
  - Frontend : `DettePage` (4 KPIs, barres de répartition, liste groupée par type avec accordéon amortissement et historique manuel), bouton **Dettes** dans la navigation
  - **`DetteWidget`** (tableau de bord) : widget placé en 2/3 de la ligne basse Patrimoine, aux côtés du radar Stratégie & Objectifs (1/3) — KPIs avec ratio dette/patrimoine et ratio d'endettement mensuel (règle des 33 %), date de libération ("Libre en AAAA"), bandeau intérêts restants estimés, barre d'avancement global, barres de progression par type de crédit (tous types), lien "Voir mes dettes →" via prop `onNavigate` (chaîne App.jsx → DashboardPage → DetteWidget)
  - Tests : 533 tests (DebtServiceTest +15, DebtControllerTest +15 ; corrections de régressions : PositionControllerTest, PositionServiceTest, AdminSnapshotServiceTest, FamilyGroupServiceTest)
  - Documentation : `docs/architecture/dettes.md`, `docs/api/debts.md`, `docs/architecture/dashboard.md` (sections 10–11)

- **Scoring patrimonial** (`PatrimoineScoreWidget`) :
  - Endpoint `GET /api/patrimoine/score` : calcul en 6 axes (Diversification 20 pts, Matelas 15 pts, Endettement 20 pts, Épargne 20 pts, Âge/risque 15 pts, Progression 10 pts) + bonus objectifs 5 pts = 105 pts max
  - `PatrimoineScoreService` agrège PositionService, PatrimoineTargetService, DebtService, RecurringExpenseService, PortfolioSnapshotService
  - Profils : FRAGILE / PRUDENT / EQUILIBRE / DYNAMIQUE / OPTIMISE
  - Frontend : `PatrimoineScoreWidget` dans le tableau de bord (grille `grid-cols-4` avec Radar + DetteWidget)
  - Tests : 561 tests (PatrimoineScoreServiceTest +8, PatrimoineScoreControllerTest +2)
  - Documentation : `docs/architecture/patrimoine-scoring.md`

- **Mise à jour automatique des cours + snapshot mensuel** :
  - Scheduler Spring cron mensuel (1er du mois 2h), désactivé en dev (`scheduler.enabled=false`)
  - BOURSE via **Boursorama** (scraping HTML Jsoup) — symbole saisi manuellement par l'admin (`boursoramaSymbol`)
  - CRYPTO via **CoinGecko** — `coinGeckoId` résolu automatiquement depuis le ticker
  - Taux de change via **ECB / Frankfurter**
  - Snapshot mensuel pour tous les utilisateurs après mise à jour des cours
  - Endpoint de déclenchement manuel : `POST /api/admin/market-data/run` (ADMIN)
  - Frontend : bouton "⟳ Mettre à jour les cours" dans `AdminInstrumentPage` avec rapport inline
  - Tests : `MarketDataServiceTest` (571 tests au total)
  - Documentation : `docs/architecture/instruments.md`

- **Page admin "Gestion des instruments"** (`AdminInstrumentPage`) :
  - Tableau BOURSE / CRYPTO avec prix actuel, date de mise à jour (orange si > 30 j), symbole Boursorama / CoinGecko ID, prix fixe
  - Création et édition d'instruments via `AdminInstrumentForm` (modal)
  - Champ `boursoramaSymbol` saisi manuellement par l'admin
  - Accessible depuis le menu Administration → "Instruments financiers"

- **Déploiement Docker** :
  - `Dockerfile` multi-stage (node → JDK → JRE Alpine, image ~140 MB, ciblage `linux/amd64`)
  - `docker-compose.yml` avec volume SQLite persisté sur le NAS
  - Profil Spring `docker` : HTTP port 8080, SQLite `/data/myfinance.db`, scheduler activé
  - `.dockerignore` optimisé
  - Script `scripts/deploy.sh` pour les mises à jour (build → export → transfer → reload) — voir `docs/deployment/docker-deployment.md` pour la checklist de release avec gestion de version
  - Documentation : `docs/deployment/docker-deployment.md`
  - Accès internet via proxy inverse QNAP + myQNAPcloud (HTTPS port 4443, SSL Let's Encrypt auto)

- **Simulations d'emprunt persistées en base** :
  - Entité `LoanSimulation` (table `loan_simulations`) : user, name, savedAt, parametersJson (TEXT — blob JSON des ~40 paramètres)
  - `GET/POST/DELETE /api/loan-simulations` — ownership vérifié, admin peut supprimer toutes
  - Frontend : migration `localStorage` → API dans `LoanSimulatorPage.jsx` ; chargement au montage, sauvegarde async avec état `saving`, suppression optimiste
  - Paramètres regroupés dans `sim.parameters` (vs ancienne structure plate)
  - Tests : `LoanSimulationServiceTest` (6 tests) + `LoanSimulationControllerTest` (8 tests) + `LoanSimulatorPage.test.jsx` (9 tests frontend)
  - Documentation : `docs/api/loan-simulations.md`, `docs/architecture/tools/loan-simulator.md` mis à jour

- **Mode nuit (dark mode)** :
  - Classe `dark` sur `<html>` activée via `localStorage` ou `prefers-color-scheme` au démarrage
  - Script inline dans `index.html` appliqué avant le premier rendu React (anti-flash)
  - Variables CSS Tailwind v4 (`--color-*`) surchargées dans `html.dark` — aucun composant modifié
  - Neutre : gris inversés (`--color-white` → fond carte sombre, `--color-gray-100` → fond page, `--color-gray-900` → texte clair)
  - Teintes colorées adoucies en dark (indigo, violet, red, green, teal, orange, blue, emerald, amber, pink, purple)
  - Toggle lune/soleil dans la barre de navigation (desktop et mobile), à côté du bouton masquage des valeurs
  - État géré dans `App.jsx` (`useState` + `useEffect`), persisté en `localStorage`

- **Simulateur de crédit Lombard** (`LombardSimulatorPage`) :
  - Outil entièrement frontend — utilise `GET /api/positions?status=ACTIVE` pour pré-remplir le portefeuille collatéral
  - 4 scénarios LTV : Prudent / Réaliste / Optimiste (par catégorie) + Personnalisé éditable via sliders
  - Modes Capacité maximale ou Montant précis ; remboursement In fine ou Amortissable
  - Effet de levier (réinvestissement) : gain net après PFU vs coût des intérêts, calcul du `breakEvenRate`
  - Sensibilité aux variations EURIBOR (deltas −1 / 0 / +1 / +2 / +3 pts)
  - Comparaison parallèle des 3 scénarios LTV (capacité, mensualité, marge avant margin call, faisabilité)
  - Stress test couplé au levier : applique le drawdown BOURSE au capital réinvesti (effet boule de neige révélé en cas de margin call simultané) ; réutilise `crisisScenarios.js`
  - Comparaison vente vs Lombard avec calcul d'impôt PFU et manque à gagner sur rendement attendu
  - Graphiques : donut capacité par catégorie, ligne évolution du capital restant (tooltip enrichi), barres empilées intérêts/capital annuel
  - Tooltips pédagogiques (`InfoTooltip` interne) sur tous les concepts : LTV, margin call, in fine/amortissable, PFU, effet de levier, stress test
  - Pas de persistance V1 (entièrement en mémoire React)
  - Documentation : `docs/architecture/tools/lombard-credit-simulator.md`

- **Couverture de tests JaCoCo** :
  - Plugin `jacoco-maven-plugin` 0.8.12 dans `backend/pom.xml`
  - Exclusions : `dto/**`, `config/**`, `domain/**`, `MyFinanceApplication.class`
  - Seuils : 70 % lignes / 60 % branches → build échoue si non atteint (couverture actuelle 80 % / 62 %)
  - Rapport HTML : `target/site/jacoco/index.html` (généré automatiquement à `./mvnw test`)
  - Plugin `maven-surefire-report-plugin` pour le rapport HTML d'exécution : `target/reports/surefire.html` (généré via `./mvnw surefire-report:report-only`)

- **Performance patrimoniale (TWR / MWR)** — *en travaux, ADMIN only* :
  - **Statut** : fonctionnalité accessible uniquement aux administrateurs (menu Admin → "Performance (en travaux)") tant que les limites structurelles ne sont pas levées. Bandeau orange "🚧 Fonctionnalité en cours de développement" affiché en permanence.
  - **Backend** : `@PreAuthorize("hasRole('ADMIN')")` sur `PerformanceController` (toutes les routes)
  - **Frontend** : route `currentPage === 'performance'` gardée par `user.role === 'ADMIN'` dans `App.jsx`
  - Calcul du rendement annualisé sur les catégories BOURSE, CRYPTO, IMMO_PAPIER, LIVRET (LIQUIDITE et IMMO_PHYSIQUE exclus)
  - **TWR** (Time-Weighted Return) via Modified Dietz entre snapshots + chaînage — neutralise l'effet des versements
  - **MWR** (Money-Weighted Return) via XIRR Newton-Raphson + bissection — rendement réellement vécu
  - Classes utilitaires stateless : `XirrSolver` et `TwrChainer` (package `service/math`)
  - Série temporelle (timeSeries) pour le graphique TWR cumulé vs benchmark configurable (% annuel constant)
  - Détail par catégorie (TWR + MWR + investi + valeur + gain + dividendes)
  - Détail par position triées par TWR décroissant
  - Endpoints : `GET /api/patrimoine/performance`, `/positions`, `/positions/{id}`
  - Frontend : `PerformancePage` dans Outils → Performance (TWR / MWR), Recharts LineChart
  - Tests : `XirrSolverTest` (6 cas), `TwrChainerTest` (7 cas), `PerformanceServiceTest` (9 cas), `PerformanceControllerTest` (10 cas) — total : 738 tests
  - Documentation : `docs/architecture/patrimoine-performance.md`

- **Contrats fonction publique** :
  - **2 nouveaux enums** : `ContractTypeEnum` (PRIVATE / PUBLIC), `PublicSubTypeEnum` (TITULAIRE / CONTRACTUEL)
  - **Entité `SalaryContract`** : 3 champs ajoutés (`contractType`, `publicSubType`, `indiceMajore`), `annualGrossSalary` rendu nullable (calculé pour PUBLIC)
  - **Entité `SalaryRevision`** : champ `indiceMajore` ajouté — pour les révisions PUBLIC, le brut est recalculé depuis l'IM × valeur du point à la date d'entrée en vigueur
  - **Configuration** : `tax-parameters.yml` enrichi avec historique complet de la valeur du point (18 paliers depuis 2002) et taux de cotisations titulaire (CNRACL 11,1 %, CSG 6,68 %, CRDS 0,49 %) — classe `PublicSectorParameters`
  - **Services** : `PointValueService` (lookup par date), `PublicNetImposableCalculator` (titulaire → CNRACL + CSG ; contractuel → délègue au privé)
  - **Aiguillage dans `SalaryContractService`** : résolution du brut et calcul du net imposable conditionnels sur `contractType`. Super brut `null` pour PUBLIC, `isCadre` forcé `false`, `paidMonthsPerYear` forcé 12.
  - **Endpoint utilitaire** : `GET /api/salary-contracts/public/point-value?date=` — valeur du point pour l'aperçu temps réel dans les formulaires
  - **Frontend** : formulaire en 2 steps (`SalaryContractTypeStep` → `SalaryContractFormPrivate` ou `SalaryContractFormPublic`), aperçu brut temps réel sur l'IM, `RevisionForm` conditionnel (indice ou brut selon type)
  - **Migration** : `backend/migrations/006_backfill_contract_type_public_sector.sql` (Phase 2 — à exécuter après déploiement)
  - **Documentation** : `docs/architecture/salary-public-sector.md`, `docs/api/salary-contracts.md` mis à jour
  - Tests : 746 tests BUILD SUCCESS (758 après ajout temps partiel)

- **Comparateur d'enveloppes fiscales** (`FiscalEnvelopeComparatorPage`) :
  - Outil purement frontend — aucun endpoint backend nouveau, pré-remplissage TMI via `GET /api/tax-simulator`
  - 4 enveloppes comparées : CTO, PEA, Assurance-vie, PER — chacune avec fiscalité propre
  - Rendements différenciés par enveloppe (sliders individuels) ou mode « même taux partout » (toggle)
  - Valeurs par défaut réalistes : CTO 7 %, PEA 6,5 %, AV 3,5 %, PER 4,5 %
  - Simulation AV : abattement annuel (4 600 € / 9 200 €) après 8 ans, taux réduit 24,7 % ou PFU, prise en compte du seuil 150 000 €
  - Simulation PER : déduction TMI à l'entrée, réinvestissement éco. fiscale au rendement PER, taxation barème (TMI retraite) + PFU 30 % à la sortie
  - Frais d'enveloppe paramétrables par enveloppe (déduits mensuellement du rendement)
  - Référentiel externalisé : `frontend/src/data/fiscal-envelopes.js` (barèmes révisables sans recompilation backend)
  - Fonctions de calcul : `frontend/src/utils/fiscalEnvelopes.js` (`simulateCTO`, `simulatePEA`, `simulateAV`, `simulatePER`, `compareEnvelopes`)
  - Navigation : Outils → « Enveloppes fiscales » (desktop + mobile)
  - Tests `SalaryContractForm.test.jsx` mis à jour pour le wizard 2 étapes (contrats publics)
  - Documentation : `docs/architecture/tools/fiscal-envelope-comparator.md`

- **Simulateur retraite** (`RetirementSimulatorPage`) :
  - Backend : `retirement-parameters.yml` (PASS 2010–2024, Agirc-Arrco, RAFP, trimestres/génération, âges légaux réforme 2023) + `RetirementParameters.java` (`@Component @ConfigurationProperties`) + `GET /api/retirement/parameters` (authentifié, lecture seule — retourne le YAML désérialisé)
  - ⚠ `RetirementParameters` utilise `@Component` (pas `@Configuration`) pour éviter que le proxy CGLIB Spring expose des champs internes non-sérialisables à Jackson
  - Calculs frontend : `frontend/src/utils/retirement.js` — `projectCareer`, `computeRegimeGeneral` (SAM 25 meilleures années × PASS), `computeAgircArrco` (points T1+T2), `computeRegimePublic` (IM × 75 %), `computeRAFP` (forfait), `applySocialCharges`, `simulateAtAge`, `computeRequiredPERCapital`, `computeRequiredPERContribution` (bisect)
  - Pré-remplissage : date de naissance (`/api/auth/me`), contrat salarial actif (type, salaire/IM), TMI (`/api/tax-simulator`)
  - Prise en charge privé (CNAV + Agirc-Arrco) et public (CNRACL + RAFP forfaitaire)
  - Comparaison 4 âges de départ (60/62/64/67), graphique salaire→pension, bloc PER (capital + versement mensuel)
  - Tooltips pédagogiques via **portal** `createPortal` — ne peuvent pas être coupés par les conteneurs `overflow`
  - Tests : `RetirementControllerTest` (2 tests) — total backend 748 tests BUILD SUCCESS
  - Documentation : `docs/architecture/tools/retirement-simulator.md`

- **Temps partiel (quotité de travail)** : champ `partTimePercentage` (Float, défaut `100.0`) sur `SalaryContract`. Le salaire saisi est l'ETP ; la quotité réduit `effectiveSalary` avant tout calcul dans `SalaryContractService.toDto()` et `TaxSimulatorService.salaryIncomeFromContract()`. Impacts : projections (brut, net imposable, net d'impôt), simulateur d'impôts, graphique d'évolution salariale, VS théorique bulletins, badge dans l'en-tête contrat. Migration : `008_add_part_time_percentage.sql`. Spec : `docs/architecture/salary.md` (section *1ter. Temps partiel*).

- **Analytics d'usage et santé technique** :
  - Tables `analytics_events` et `error_logs` (epoch ms, 7 index) + colonne `users.analytics_opt_out`. Migration : `009_add_analytics_tables.sql`.
  - `AnalyticsService` : tracking `@Async` single-thread, whitelist metadata, fingerprint SHA-256, conversion LocalDateTime→epoch ms pour toutes les requêtes SQLite natives
  - `AnalyticsRetentionService` : purge planifiée (`@Scheduled`) + manuelle via `DELETE /api/admin/analytics/purge`
  - `AnalyticsController` (POST track/error) + rate-limit filter + `GlobalExceptionHandler` étendu (5xx + 403 + 404 `/api/*`)
  - Page admin Analytics (3 onglets : Engagement, Parcours, Santé) avec session ID copiable et navigation directe vers le parcours depuis une erreur
  - Opt-out utilisateur : `User.analyticsOptOut` + toggle dans Mon Profil
  - Instrumentation complète : 26 pages (`PAGE_VIEW`), CRUD complet de tous les modules (`FEATURE_USE`), formulaires profil (`FORM_SUBMIT`), toggles UI (`BUTTON_CLICK`)
  - Convention de nommage : `module.feature.action` (3 segments snake_case) — validée côté backend
  - Tests : 793 tests BUILD SUCCESS
  - Documentation : `docs/architecture/analytics.md` + section Analytics dans `docs/architecture/decisions/PATTERNS-frontend.md`

**À venir :**
- (aucune fonctionnalité en cours de développement — voir overview.md pour le statut complet)
