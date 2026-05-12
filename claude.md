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
│       └── … (BilanFinancier, Lombard, Crise, Emprunt, Intérêts composés)
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
- Performance patrimoniale (TWR / MWR — ADMIN only, en travaux) : `docs/architecture/patrimoine-performance.md`
- Gestion des dépenses récurrentes (architecture) : `docs/architecture/recurring-expenses.md`
- Optimisation fiscale fin d'année (architecture) : `docs/architecture/tools/tax-loss-harvesting.md`
- API optimisation fiscale : `docs/api/tax-loss-harvesting.md`
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
- Hauts faits (gamification, 67 badges) : `docs/architecture/achievements.md`
- API hauts faits : `docs/api/achievements.md`

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

### Optimisation fiscale fin d'année (Tax-Loss Harvesting)
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/tax-loss-harvesting?year={year}` | Authentifié | Synthèse + candidats CTO + crypto pour l'année (défaut : année courante). Retourne `TaxLossSummaryDto`. |

### Fiscalité crypto (formulaire 2086)
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/crypto-tax/state` | Authentifié | État courant (PTA, valorisation portefeuille, confirmation historique) |
| `GET` | `/api/crypto-tax/summary?year=&taxOption=&tmi=` | Authentifié | Synthèse annuelle (cessions, PV nette, impôt PFU ou barème) |
| `GET` | `/api/crypto-tax/cessions?year=` | Authentifié | Détail des cessions au format 2086 (ligne par SELL_FIAT) |
| `GET` | `/api/crypto-tax/form-2086.csv?year=` | Authentifié | Export CSV du formulaire 2086 |
| `PUT` | `/api/crypto-tax/historical-data-confirmation` | Authentifié | Confirmer/infirmer la complétude de l'historique crypto |

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

### Hauts faits (Achievements)
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/achievements/me` | Authentifié | Catalogue complet avec état de déblocage par badge (niveau, date, flag `isNew`, badges secrets masqués si non débloqués) ; évalue les nouveaux badges et persiste en une transaction (fallback silencieux sur lock SQLite) |
| `PUT` | `/api/achievements/me/seen` | Authentifié | Marque tous les badges comme "vus" (met à jour `lastAchievementSeenAt` — efface le compteur de nouveautés affiché dans la navigation) |

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

### Migration one-shot — conversion devise (⚠ à supprimer après exécution prod)
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `POST` | `/api/admin/orders/migrate-amount-eur?dryRun=true\|false` | ADMIN | Recalcule `amountEur` sur tous les ordres en devise non-EUR. Dry-run par défaut. Retourne `MigrateAmountEurReport`. |

### Backfill historique pour la performance patrimoniale
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `POST` | `/api/admin/instruments/{id}/backfill-prices` | ADMIN | Backfill CRYPTO automatique via CoinGecko (`market_chart?days=max`). Retourne `BackfillReport`. |
| `POST` | `/api/admin/instruments/{id}/import-prices` (multipart CSV) | ADMIN | Import CSV BOURSE — format `date;price`, dates ISO ou FR, décimales `,` ou `.`. Retourne `BackfillReport`. |
| `POST` | `/api/admin/exchange-rates/{currency}/backfill?from=&to=` | ADMIN | Backfill devise via Frankfurter (BCE). `from`/`to` optionnels. Retourne `BackfillReport`. |
| `GET` | `/api/admin/instruments/price-history-summary` | ADMIN | Résumé d'historique par instrument (dayCount + plage) pour l'UI admin. Map<instrumentId, {dayCount, fromDate, toDate}>. |

### Performance patrimoniale (TWR + MWR)
| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/patrimoine/performance` | ADMIN | Performance globale TWR + MWR depuis le premier ordre. Retourne `PerformanceDto` avec `monthlyBreakdown`. |

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

✅ **V1.8.0 en production** — application déployée sur NAS QNAP via Docker.

Modules livrés (vue à 10 000 m, sans détails) :

| Catégorie | Modules |
|---|---|
| **Authentification** | session cookie BCrypt · brute-force protection · historique connexions · auto-restauration session 12h |
| **Utilisateurs** | CRUD admin · profil self-service · regroupements familiaux · demandes d'inscription · suppression compte |
| **Revenus** | contrats privé + fonction publique · révisions · bulletins · primes (annuelles/mensuelles/exceptionnelles) · avantages en nature · astreintes · temps partiel · complémentaires (locatif, dividendes, aides…) |
| **Dépenses** | dépenses récurrentes · budgets par catégorie · calendrier des abonnements (paymentDay) |
| **Patrimoine** | positions (BOURSE/CRYPTO/IMMO/LIVRET/LIQUIDITE) · ordres · snapshots · taux de change · graphique évolution cours par position · positionnement INSEE · plus-value YTD · export CSV |
| **Dettes & passifs** | dettes avec amortissement · grandes possessions avec décote |
| **Outils** | simulateur impôts · fiscalité crypto (2086) · **optimisation fiscale fin d'année (tax-loss harvesting)** · bilan financier · intérêts composés · emprunt · Lombard · enveloppes fiscales · retraite · crise · déclaration patrimoine |
| **Stratégie** | objectifs par catégorie · diversification multi-dimensions BOURSE/CRYPTO/IMMO · KPI immo · scoring patrimonial · performance TWR/MWR |
| **Dashboard** | personnalisable · cash flow Sankey · prochains prélèvements · FIRE · TWR YTD · widgets patrimoine · dette · score |
| **Gamification** | 67 hauts faits (V1 + V2 Trivial/Faible/Moyen + Plus lourd) · easter eggs secrets |
| **Admin** | instruments · taux de change · snapshots manuels · backfill historique · analytics |
| **Plateforme** | dark mode · responsive mobile · PWA · pages d'erreur · simulateurs publics sans connexion |

> **Détail exhaustif par feature** (architecture, migrations, tests, dates) : [`docs/PROJECT-STATUS.md`](docs/PROJECT-STATUS.md)
