# Statut détaillé du projet MyFinance

> Historique exhaustif des fonctionnalités livrées. Consulter ce fichier uniquement quand on a besoin du contexte historique précis sur une feature ; sinon, CLAUDE.md liste les modules à haut niveau.

---

## Vue d'ensemble
✅ V1.8 déployée — application en production sur NAS QNAP via Docker

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

- **PR2 performance — backfill historique (CoinGecko, Frankfurter, CSV)** :
  - **CoinGecko CRYPTO** : `CoinGeckoClient.getMarketChart(coinId)` via `market_chart?days=max` → historique complet d'une crypto en un appel
  - **Frankfurter devises** : `EcbRateClient.getRatesHistory(currency, from, to)` → taux daily depuis 1999 (ECB)
  - **CSV BOURSE** : `BoursePriceCsvParser` permissif — dates ISO `YYYY-MM-DD` ou FR `DD/MM/YYYY`, décimales `,` ou `.`, BOM toléré, lignes `#` ignorées, doublons écrasés silencieusement, lignes invalides → skip + rapport (max 50 erreurs gardées). Garde-fous : 10 Mo, 50 000 lignes max.
  - **`InstrumentBackfillService`** : `backfillCrypto(instrumentId)` + `importCsv(instrumentId, file)`. Refuse si catégorie incompatible.
  - **`ExchangeRateBackfillService`** : `backfill(currency, from?, to?)`. Date de début par défaut = premier ordre dans cette devise (ou -5 ans si aucun). Refuse EUR.
  - **`AdminBackfillController`** : 3 endpoints POST + 1 endpoint GET `/api/admin/instruments/price-history-summary` pour l'UI (Map<instrumentId, {dayCount, fromDate, toDate}> en une query)
  - **DTO unifié `BackfillReport`** : `{scope, targetId, targetLabel, fromDate, toDate, linesInserted, linesUpdated, linesSkipped, errors[], durationMs}`
  - **UI admin** : colonne « Historique » dans `AdminInstrumentPage` (jours + plage), bouton « ↻ Backfill » par instrument CRYPTO, bouton « 📤 Import CSV » par instrument BOURSE (input file caché), rapport inline. `ExchangeRateUpdateModal` enrichie avec une colonne « ↻ Histo » par devise.
  - Tests : 859 → 901 (+42 : ModifiedDietzCalculatorTest, XirrSolverTest, ValuationServiceTest, PerformanceServiceTest, PerformanceControllerTest)
  - Documentation API : `docs/api/patrimoine-performance-backfill.md`

- **PR3 performance — calcul TWR + MWR** (ADMIN only, en cours de validation) :
  - **`ModifiedDietzCalculator`** (stateless, `service/math`) : `subPeriodReturn()` + `chainReturns()` + `annualize()`. Convention CFA Institute : poids `(D-j)/D`.
  - **`XirrSolver`** (stateless, `service/math`) : Newton-Raphson (r₀=0.10, tol=1e-7, 100 iter) + fallback bissection `[-0.99, 10.0]`. Retourne null si non convergent.
  - **`ValuationService`** : valorise BOURSE/CRYPTO (quantité × cours / taux), LIVRET (capitalisation quotidienne `(1+r)^(1/365) - 1`), IMMO_PAPIER (interpolation linéaire entre snapshots). Prend les batch maps en paramètre (anti-N+1). Position fermée → 0 après `closedDate`.
  - **`PerformanceService`** : charge ordres/prix/taux en batch, chaîne TWR mois par mois (mois du premier versement exclu), calcule XIRR sur tous les cashflows + liquidation virtuelle. `totalInvested` et `totalDividends` calculés sur TOUS les ordres.
  - **`PerformanceController`** : `GET /api/patrimoine/performance` — ADMIN uniquement via `@PreAuthorize`.
  - **DTOs** : `PerformanceDto` (computedAt, from, to, TWR, MWR, totaux, warnings, monthlyBreakdown) + `MonthlyBreakdownDto` (breakdown mois par mois avec factory `included()`/`excluded()`).
  - **Frontend** : `PerformancePage.jsx` — bandeau orange validation, 2 KPIs (TWR + MWR) avec tooltips, synthèse (versé/valeur/PV/dividendes), warnings dépliables, tableau mensuel dépliable (debug validation). Menu Admin → « Performance (en travaux) ».
  - Tests : 901 (ModifiedDietzCalculatorTest 12, XirrSolverTest 9, ValuationServiceTest 9, PerformanceServiceTest 8, PerformanceControllerTest 4)

- **Pré-requis performance patrimoniale (TWR/MWR) — pré-requis 1, 2, 3** :
  - **Historique quotidien des prix** : table `instrument_price_history` (cours clôture par instrument, source BOURSORAMA/COINGECKO/MANUAL_CSV) — alimentée automatiquement par `MarketDataService.runFullUpdate()`
  - **Historique quotidien des taux de change** : table `exchange_rate_history` (convention identique à `exchange_rates`) — alimentée automatiquement par le scheduler ECB/Frankfurter. Script de backfill : `backend/migrations/016_backfill_usd_eur_exchange_rate_history.py`
  - **Fix `amountEur` sur `PositionOrder`** : `PositionService.createOrder()` / `updateOrder()` calculent désormais `amountEur = amount / exchange_rate_history(currency, orderDate)` avec fallback taux courant + log WARN. Migration one-shot des ordres existants : `POST /api/admin/orders/migrate-amount-eur?dryRun=true|false` (exécutée en dev — 39 ordres USD corrigés) ⚠ À supprimer après exécution prod.
  - **`closedDate` sur `Position`** : renseigné automatiquement à `LocalDate.now(Europe/Paris)` lors de `PositionService.close()`. Modifiable via le formulaire d'édition d'une position CLOSED. Migration `017` + backfill `MAX(orderDate)` sur les positions CLOSED existantes.
  - Tests : 819 (InstrumentPriceHistoryServiceTest +11, ExchangeRateHistoryServiceTest +10, MigrateAmountEurServiceTest +6, MarketDataServiceTest +2 mocks)
  - Documentation complète : `docs/architecture/patrimoine-performance.md`

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

- **Fiscalité crypto — formulaire 2086** (Outils → Fiscalité crypto) :
  - Méthode proportionnelle officielle (article 150 VH bis CGI) — investisseur occasionnel PFU 30 % ou barème
  - `CryptoOperationTypeEnum` : `BUY_FIAT`, `SELL_FIAT`, `SWAP_OUT`, `SWAP_IN`, `TRANSFER_IN`, `TRANSFER_OUT`
  - Trois champs ajoutés sur `PositionOrder` : `cryptoOperationType`, `swapCounterpartOrderId`, `portfolioValueAtDateEur`
  - `PositionService.createOrder` crée automatiquement l'ordre `SWAP_IN` jumeau quand `SWAP_OUT` + `swapCounterpartPositionId` fourni
  - `CryptoTaxService` : algorithme `runAlgorithm` en itération chronologique — PTA, VGP depuis `instrument_price_history`, override manuel, seuil 305 €
  - `User.cryptoHistoricalDataConfirmed` : flag de confirmation de la saisie rétroactive complète (bandeau brouillon si false)
  - Migration SQL `018_add_crypto_tax_fields.sql` (backfill BUY→BUY_FIAT, SELL→SELL_FIAT sur positions CRYPTO)
  - Tests : 947 tests BUILD SUCCESS (CryptoTaxServiceTest +10, CryptoTaxControllerTest +7)
  - Documentation : `docs/architecture/tools/crypto-tax-helper.md`, `docs/api/crypto-tax.md`

- **Hauts faits (gamification)** :
  - **67 badges** au catalogue : 25 V1 (patrimoine, comportement, déclenchement immédiat, easter eggs) + 36 V2 (Trivial, Faible, Moyen) + 6 V2 Plus lourd
  - 4 familles : 🟥 patrimoine (validation différée sur 3 snapshots consécutifs), 🟧 snapshot avec règles, 🟨 compteurs événementiels, 🟩 déclenchement immédiat, easter eggs secrets
  - V2 Plus lourd : `BULL_RUN` (perf YTD BOURSE), `DIAMOND_HANDS` (position détenue N ans), `LE_SANG_FROID` (no sell durant repli > 10 %), `LE_REBALANCER` (sell+buy catégories différentes en 7 j), `L_ASCENSION` (décile INSEE), `LE_DISCIPLE` (taux d'épargne 12 mois)
  - Évaluation hybride : batch nocturne (3 h) pour les badges sensibles + temps réel à l'ouverture de la page profil (transaction unique pour éviter `SQLITE_BUSY_SNAPSHOT`)
  - Badges secrets masqués tant que non débloqués (nom, emoji, description, seuils cachés)
  - `User.allTimeHighEur`, `User.initialNetWorthEur`, `User.lastAchievementSeenAt`, `User.lastKnownDecile` pour le suivi
  - Frontend : `AchievementsPanel` sur la page profil, badge 🆕 dans la navigation, compteur de nouveautés effacé sur ouverture
  - Endpoints : `GET /api/achievements/me`, `PUT /api/achievements/me/seen`
  - Migrations : `020_add_achievements.sql`, `021_add_last_known_decile.sql`
  - Documentation : `docs/architecture/achievements.md`, `docs/api/achievements.md`

- **Calendrier des abonnements (Dépenses ▾ → Calendrier)** :
  - Nouveau champ `paymentDay` (1–28) sur `RecurringExpense` pour les dépenses MONTHLY ; pour les ANNUAL, la date de prélèvement est déduite de `startDate` (jour + mois)
  - Page accessible via le menu déroulant **Dépenses ▾** (desktop uniquement — pas d'accès mobile)
  - **Vue grille mensuelle** : pastilles catégorie par jour, fond grisé sam/dim, légende contextuelle, bouton "Aujourd'hui", badge "annuel" en ambre, tooltip par dépense
  - **Vue timeline annuelle** : 12 blocs mensuels triés chronologiquement, badge "dans Xj" / "aujourd'hui" sur les échéances à 7 jours
  - Bandeau de synthèse : total annuel daté, coût moyen, mois le plus chargé, compteur de dépenses sans date avec lien "Compléter →"
  - Tout en frontend — pas de nouvel endpoint (`GET /api/recurring-expenses` retourne `paymentDay`)
  - Tests : validation `@Min(1) @Max(28)` sur `paymentDay`, `paymentDay` forcé à null si frequency = ANNUAL
  - Migration : `022_add_payment_day_to_recurring_expenses.sql`
  - Documentation : `docs/architecture/recurring-expenses.md` (section 10)

- **Widget "Prochains prélèvements" (tableau de bord)** :
  - Widget à droite du diagramme "Flux des revenus" (proportion 2/3 + 1/3)
  - Liste les 6 prochaines échéances triées chronologiquement
  - Fenêtres : MONTHLY dans les 14 jours · ANNUAL dans les 60 jours (focus sur les surprises annuelles)
  - **Fallback** : si aucune échéance dans les fenêtres, affiche la prochaine dépense annuelle quelle que soit sa date
  - Lignes urgentes (≤ 3 jours) en fond orange · badge "annuel" en ambre · lien "Voir tout →" vers le calendrier
  - Configurable via le panneau de personnalisation du tableau de bord (`upcomingExpenses`)
  - Composant : `frontend/src/components/dashboard/UpcomingExpensesWidget.jsx`
  - Documentation : `docs/architecture/dashboard.md`

- **Widget "Flux des revenus" (diagramme Sankey, tableau de bord)** :
  - Diagramme Sankey visualisant le flux complet revenus → dépenses récurrentes → épargne
  - Sources : salaire net, revenus complémentaires (locatif, dividendes, autres) → nœud central → catégories de dépenses + capacité d'épargne résiduelle
  - Largeur des liens proportionnelle aux montants mensuels
  - Configurable via `cashFlow` dans le panneau de personnalisation
  - Composant : `frontend/src/components/dashboard/CashFlowSankeyWidget.jsx`
  - Documentation : `docs/architecture/dashboard.md`

- **Décote IRPP pour les bas revenus (simulateur d'impôts)** :
  - Application de la décote (article 197 I-4 du CGI) sur l'impôt brut pour les contribuables juste au-dessus du seuil d'imposition
  - Seuils différenciés selon le statut matrimonial : célibataire (< 1 929 €) · couple en imposition commune (< 3 191 €)
  - Formule officielle : `décote = 0,4575 × (seuil − impôt brut)`
  - Nouveau champ `User.jointTaxation` (boolean) — saisi dans le profil fiscal, par défaut `false`
  - Le nombre de parts ne suffit pas (un célibataire avec 2 enfants a 2 parts mais reste "célibataire" pour la décote)
  - Migration : `019_add_joint_taxation.sql`
  - Documentation : `docs/architecture/tax-simulator.md`

- **Graphique évolution du cours par position BOURSE/CRYPTO** :
  - Bouton **📈 Évolution** sur chaque position BOURSE/CRYPTO ouvre une modale `max-w-4xl` avec graphique Recharts du cours historique
  - Sélection de la plage : 1 mois / 3 mois / 6 mois / 1 an / Tout l'historique
  - Tooltip avec valeur et date · affichage cours actuel, variation sur la période, date du dernier cours
  - Alimenté par `instrument_price_history` (cf. PR2 performance)
  - Documentation : `docs/architecture/patrimoine.md`

- **Filtre par type d'ordre dans le panneau d'ordres (Patrimoine → consultation d'une position)** :
  - Chips de filtrage au-dessus du tableau des ordres : Tous · Achat · Vente · Dividende · Dépôt
  - Utile sur les positions avec un historique long (ETF DCA, livrets multi-flux)
  - Filtrage purement frontend, aucun nouvel endpoint
  - Composant : `frontend/src/components/patrimoine/OrderPanel.jsx`

- **Bannières d'information** :
  - Système de communication admin → utilisateurs diffusé en haut de toutes les pages
  - 5 types : `ALERT` (rouge) · `WARNING` (orange) · `MAINTENANCE` (gris) · `INFO` (bleu) · `SUCCESS` (vert) — priorité décroissante en cas d'empilement
  - Filtrage par audience : `ALL` / `USERS_ONLY` / `ADMIN_ONLY` — appliqué côté backend
  - Plage temporelle avec heure de début/fin, fin optionnelle = sans expiration
  - Message en Markdown rendu via `react-markdown` (sans HTML brut, pas d'images)
  - Fermeture par l'utilisateur via croix → `sessionStorage["dismissedBannerIds"]` (réapparition à la prochaine connexion si toujours active)
  - Sticky sous la navigation (bloc `sticky top-0 z-50` englobant Nav + InfoBannerStack dans `App.jsx`)
  - Refetch à chaque navigation pour afficher les bannières créées en cours de session
  - Page admin en 3 sections : Actives / Programmées / Expirées — statut calculé à la volée (`SCHEDULED` / `ACTIVE` / `EXPIRED`)
  - Formulaire modal avec aperçu live du rendu Markdown avant publication
  - Entités : `InfoBanner` · Enums : `InfoBannerType`, `InfoBannerAudience`, `InfoBannerStatus`
  - Migration : `023_create_info_banners.sql`
  - Endpoints : `GET /api/info-banners/active` (authentifié) + CRUD `/api/admin/info-banners` (ADMIN)
  - Tests : 32 tests unitaires (service + 2 controllers) + 1 test d'intégration `@SpringBootTest` (15 étapes : auth, filtrage audience, validation, CRUD, 403/404)
  - Documentation : `docs/architecture/info-banners.md` · `docs/api/info-banners.md`

**À venir :**
- (aucune fonctionnalité en cours de développement — voir overview.md pour le statut complet)
