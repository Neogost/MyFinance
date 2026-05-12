# Architecture MyFinance

Vue d'ensemble de l'application **MyFinance** et index de la documentation.

---

## 1. Description générale

Application web personnelle de gestion financière, hébergée sur NAS QNAP via Docker (accès HTTPS via proxy inverse myQNAPcloud).

| Composant | Technologie |
|-----------|-------------|
| Frontend | React 19 + Vite + Tailwind CSS v4 + Recharts |
| Backend | Spring Boot 3.5 / Java 17 + Spring Security |
| Base de données | SQLite (fichier local — profils `dev` et `docker`) |
| Documentation API | Springdoc OpenAPI — Swagger UI : `/swagger-ui.html` |
| Authentification | Session cookie HTTP (BCrypt, pas de JWT) |
| Déploiement | Docker multi-stage, profil `docker`, HTTPS via reverse proxy QNAP |

---

## 2. Carte fonctionnelle

```mermaid
mindmap
  root((MyFinance))
    Authentification
        Login / Logout
        Changement de mot de passe
        Demande d'inscription
        Historique des connexions
        Protection brute-force
    Profil
        Informations personnelles
        Profil fiscal (parts, frais réels)
        Matelas de sécurité
        Regroupement familial
    Tableau de bord
        Évolution salariale
        Évolution du patrimoine
        Widget FIRE
        Widget Dettes
        Widget Scoring patrimonial
    Revenus
        Contrats salariaux
            Super brut / Brut / Net imposable / Net d'impôt
            Bulletins de paie réels
            Révisions salariales
            Primes (EXCEPTIONNELLE / ANNUELLE)
            Avantages en nature
            Astreintes
        Revenus complémentaires
            Locatif
            Dividendes
            Aides sociales
            Autre
    Dépenses récurrentes
        Saisie mensuelle ou annuelle
        Répartition colocation (sharePercentage)
        Budgets par catégorie
        Capacité d'épargne
        Calendrier des abonnements (vue grille + timeline mois)
        Jour de prélèvement (paymentDay)
    Passifs
        Véhicule
        Informatique
        Électroménager
        Mobilier
        Collection
        Loisirs
        Autre
    Dettes
        Emprunt immobilier (lié à un bien IMMO_PHYSIQUE)
        Prêt étudiant
        Crédit véhicule
        Crédit consommation
        Autre
        Taux assurance emprunteur
        Historique des mises à jour manuelles
    Patrimoine
        Bourse (ETF, Actions, Obligations, FOREX, Warrants, Trackers, SCPI, Fonds euros)
        Crypto-monnaie
        Immobilier papier
        Immobilier physique
        Livrets
        Liquidités
        Allocations géographiques et sectorielles
        Relevés mensuels (snapshots)
        Stratégie et objectifs par catégorie
        Scoring patrimonial
        Positionnement INSEE par décile
        Fiscalité crypto (formulaire 2086)
    Outils
        Simulateur d'impôts IRPP
        Bilan financier personnel
        Simulateur d'intérêts composés
        Simulateur d'emprunt immobilier
        Simulateur de crédit Lombard
        Comparateur d'enveloppes fiscales (PEA / CTO / AV / PER)
        Simulateur retraite (CNAV · Agirc-Arrco · CNRACL)
        Déclaration de patrimoine
        Simulateur de crise
        Référentiel fiscal (barème kilométrique)
    Hauts faits (gamification)
        67 badges (V1 + V2 Trivial / Faible / Moyen / Plus lourd)
        Évaluation déclenchée + batch nocturne
        Badges secrets (easter eggs)
        Indicateur "nouveaux" dans la navigation
    Administration
        Gestion des utilisateurs
        Demandes d'inscription
        Mise à jour des cours instruments
        Allocations géographiques ETF
        Gestion des taux de change
        Gestion manuelle des relevés
        Historique des connexions
        Gestion des groupes familiaux
        Mise à jour automatique des cours (scheduler)
        Version de l'application
        Analytics (engagement, parcours, erreurs frontend)
    Plateforme
        Mode nuit (dark mode)
        Masquage des valeurs
        PWA (manifest, installation mobile)
        Pages d'erreur HTTP (3xx / 4xx / 5xx + ErrorBoundary)
        Tracking analytics (opt-out utilisateur)
```

---

## 3. Modules

### 3.1 Authentification & gestion des utilisateurs

Authentification par session cookie. Deux rôles : `USER` (accès à ses propres données) et `ADMIN` (accès global + fonctionnalités d'administration). Protection brute-force avec durée de blocage exponentielle. Système de demandes d'inscription soumis à validation admin.

| Documentation | Lien |
|---------------|------|
| Architecture | [`docs/architecture/user-management.md`](user-management.md) |
| Architecture sécurité | [`docs/architecture/security.md`](security.md) |
| API authentification | [`docs/api/authentication.md`](../api/authentication.md) |
| API utilisateurs | [`docs/api/users.md`](../api/users.md) |
| API inscriptions | [`docs/api/registration-requests.md`](../api/registration-requests.md) |

---

### 3.2 Profil utilisateur

#### Matelas de sécurité

Réserve de liquidités configurée selon trois modes : montant fixe (`FIXED_AMOUNT`), N mois de dépenses (`MONTHS_EXPENSES`), ou N mois de salaire (`MONTHS_SALARY`). Visualisé via un widget tableau de bord et un indicateur sur les cartes LIVRET/LIQUIDITE du patrimoine.

→ [`docs/architecture/user-management.md`](user-management.md) (section Matelas de sécurité)

#### Regroupement familial

Permet à plusieurs utilisateurs de former un foyer pour visualiser leur patrimoine de manière agrégée. Système d'invitations owner → membre, toggle "Mode Foyer" dans la navigation.

→ [`docs/architecture/family-group.md`](family-group.md) — API : [`docs/api/family-group.md`](../api/family-group.md)

---

### 3.3 Tableau de bord

Page d'accueil après connexion. Synthèse visuelle : évolution salariale, évolution du patrimoine en aires empilées par catégorie (avec point "Aujourd'hui"), widget FIRE (règle des 4 %), widget Dettes (KPIs + ratio endettement), widget Scoring patrimonial (6 axes).

| Documentation | Lien |
|---------------|------|
| Architecture | [`docs/architecture/dashboard.md`](dashboard.md) |
| API | [`docs/api/dashboard.md`](../api/dashboard.md) |

---

### 3.4 Revenus

Deux sous-modules accessibles depuis le menu **Revenus**.

#### Revenus salariaux

Un contrat salarial génère des **projections automatiques** sur quatre niveaux : super brut → brut → net imposable → net d'impôt. Des bulletins de paie réels permettent de comparer réel et théorique. L'historique salarial est suivi via les révisions de contrat. Les primes, avantages en nature et astreintes sont modélisés comme des éléments rattachés au contrat.

#### Revenus complémentaires

Tout revenu hors salariat (locatif, dividendes, aides sociales, autre), utilisé dans le simulateur d'impôts et la capacité d'épargne.

| Documentation | Lien |
|---------------|------|
| Architecture | [`docs/architecture/salary.md`](salary.md) |
| API contrats & bulletins | [`docs/api/salary-contracts.md`](../api/salary-contracts.md) |
| API revenus complémentaires | [`docs/api/other-incomes.md`](../api/other-incomes.md) |

---

### 3.5 Dépenses récurrentes

Saisie des charges fixes ou périodiques en fréquence mensuelle ou annuelle. Répartition en pourcentage pour les dépenses partagées (colocation). Budgets mensuels cibles par catégorie (`/api/expense-budgets`). Champ optionnel `paymentDay` (1–28) pour situer la dépense dans le mois. La synthèse calcule la **capacité d'épargne mensuelle** (revenus nets − total dépenses).

#### Calendrier des abonnements

Visualisation dédiée des dépenses ayant un `paymentDay` renseigné, sous deux formes :
- **Vue grille** : matrice jour × catégorie pour repérer les pics de prélèvement
- **Vue timeline** : chronologie du mois avec montants cumulés par jour
Aussi affichée comme widget compact "Prochains prélèvements" sur le tableau de bord.

| Documentation | Lien |
|---------------|------|
| Architecture | [`docs/architecture/recurring-expenses.md`](recurring-expenses.md) |
| API | [`docs/api/recurring-expenses.md`](../api/recurring-expenses.md) |

---

### 3.6 Passifs (Grandes possessions)

Recensement des biens matériels (voiture, informatique, mobilier…). Décote exponentielle automatique par catégorie ou valeur saisie manuellement (`estimatedCurrentValue` non nul → mode override). Contribue au **patrimoine net** dans le bilan et la déclaration.

| Documentation | Lien |
|---------------|------|
| Architecture | [`docs/architecture/passifs.md`](passifs.md) |
| API | [`docs/api/possessions.md`](../api/possessions.md) |

---

### 3.6b Dettes

Recensement des dettes financières (emprunt immobilier, prêt étudiant, crédit véhicule, crédit consommation). Deux modes de suivi du capital : projection automatique par formule d'amortissement, ou override manuel via l'historique des mises à jour (`DebtBalanceEntry`). Un emprunt immobilier peut être **lié à une position `IMMO_PHYSIQUE`** pour afficher la valeur nette du bien. Le total des dettes entre dans le patrimoine net, le bilan financier et le simulateur de crise.

| Documentation | Lien |
|---------------|------|
| Architecture | [`docs/architecture/dettes.md`](dettes.md) |
| API | [`docs/api/debts.md`](../api/debts.md) |

---

### 3.7 Patrimoine

Suivi de l'ensemble des actifs financiers en six catégories. Modèle **Position → Ordres** avec valorisation en temps réel. Allocations géographiques et sectorielles par instrument. Relevés mensuels pour historiser l'évolution. Positionnement par décile INSEE (Enquête Patrimoine 2021-2022).

| Catégorie | Mécanisme de valorisation |
|-----------|--------------------------|
| Bourse, Crypto | Quantité × prix marché (converti en EUR via taux de change) |
| Livret, Immo papier | Montant investi + intérêts/dividendes cumulés |
| Immo physique | Valeur estimée saisie manuellement |
| Liquidités | Solde saisi manuellement |

#### Stratégie & objectifs patrimoniaux

Objectifs cibles par catégorie persistés en base (`PatrimoineTarget`). Barres de progression sur chaque carte de résumé.

#### Scoring patrimonial

Score de cohérence calculé en 6 axes (Diversification, Matelas, Endettement, Épargne, Âge/risque, Progression) + bonus objectifs. Maximum 105 points. Profils : FRAGILE / PRUDENT / EQUILIBRE / DYNAMIQUE / OPTIMISE.

#### Fiscalité crypto (formulaire 2086)

Génération du formulaire fiscal annuel pour les cessions de crypto-actifs en France. Calcul automatique du **PTA** (prix total d'acquisition) et de la **valorisation portefeuille à la cession** ligne par ligne (méthode du formulaire 2086). Synthèse annuelle (cessions, plus-value nette, impôt PFU 30 % ou barème selon TMI). Confirmation par l'utilisateur de la complétude de l'historique crypto avant export. Export CSV téléchargeable. Endpoints : `GET /api/crypto-tax/{state,summary,cessions,form-2086.csv}` + `PUT /historical-data-confirmation`.

| Documentation | Lien |
|---------------|------|
| Architecture patrimoine | [`docs/architecture/patrimoine.md`](patrimoine.md) |
| Architecture instruments | [`docs/architecture/instruments.md`](instruments.md) |
| Architecture scoring | [`docs/architecture/patrimoine-scoring.md`](patrimoine-scoring.md) |
| Architecture stratégie | [`docs/architecture/patrimoine-strategy.md`](patrimoine-strategy.md) |
| API positions et ordres | [`docs/api/patrimoine-positions.md`](../api/patrimoine-positions.md) |
| API snapshots et marché | [`docs/api/patrimoine-snapshots.md`](../api/patrimoine-snapshots.md) |
| API outils (score, objectifs) | [`docs/api/patrimoine-outils.md`](../api/patrimoine-outils.md) |

---

### 3.8 Outils

#### Simulateur d'impôts (IRPP)

Estimation de l'impôt sur le revenu à partir du profil fiscal. Choix de la source salariale (`PROJECTION_CONTRAT` ou `BULLETINS_REELS`) et sélection des revenus complémentaires.

→ [`docs/architecture/tax-simulator.md`](tax-simulator.md) — API : [`docs/api/tax-simulator.md`](../api/tax-simulator.md)

#### Bilan financier personnel

Vue synthétique calquée sur un compte de résultat d'entreprise. Revenus, dépenses, actifs, passifs, taux d'épargne, ratio de couverture patrimoniale et projection FIRE côte à côte.

→ [`docs/architecture/tools/bilan-financier.md`](tools/bilan-financier.md)

#### Simulateur d'intérêts composés

Projection de la croissance d'un capital avec versements périodiques, inflation, frais, fiscalité PFU et mode inversé (calcul des paramètres pour atteindre un objectif).

→ [`docs/architecture/tools/compound-interest-simulator.md`](tools/compound-interest-simulator.md)

#### Simulateur d'emprunt immobilier

Simulation complète d'un crédit immobilier : mensualité, coût total, tableau d'amortissement. Prend en compte frais de notaire, frais d'agence, assurance, PTZ et remboursement anticipé.

→ [`docs/architecture/tools/loan-simulator.md`](tools/loan-simulator.md)

#### Déclaration de patrimoine

Document officiel exportable en PDF synthétisant l'identité civile, le patrimoine net, les revenus et le détail des actifs par catégorie (avec enveloppe fiscale pour BOURSE/IMMO_PAPIER).

→ [`docs/architecture/patrimoine-declaration.md`](patrimoine-declaration.md)

#### Simulateur de crise

Applique les taux de chute historiques de crises majeures (2008, dot-com, COVID, 2022) au patrimoine actuel. Montre l'impact par catégorie, la couverture du matelas de sécurité post-crise et une estimation du temps de récupération selon le taux d'épargne.

→ [`docs/architecture/tools/crisis-simulator.md`](tools/crisis-simulator.md)

#### Référentiel fiscal (barème kilométrique)

Endpoint `GET /api/fiscal/bareme-kilometrique` exposant le barème officiel français en vigueur pour calculer les frais réels de déplacement (voitures). Réutilisable côté frontend depuis n'importe quel module concerné par les frais réels.

→ API : [`docs/api/fiscal-referentiel.md`](../api/fiscal-referentiel.md)

#### Simulateur de crédit Lombard

Simule un emprunt garanti par le portefeuille de titres financiers (sans vente d'actifs). Trois scénarios LTV pré-définis (Prudent / Réaliste / Optimiste) + mode personnalisé éditable, modes In fine / Amortissable, calcul du seuil de margin call et chute tolérée. Effet de levier (réinvestissement à un rendement attendu) avec gain net après PFU vs coût des intérêts. Sensibilité aux variations EURIBOR (±3 pts). Comparaison parallèle des 3 scénarios LTV sur un même projet. Stress test couplé au levier (effet boule de neige révélé) réutilisant les `drawdowns` du simulateur de crise. Comparaison vente vs Lombard avec calcul d'imposition plus-value et manque à gagner.

→ [`docs/architecture/tools/lombard-credit-simulator.md`](tools/lombard-credit-simulator.md)

#### Optimisation fiscale fin d'année (Tax-Loss Harvesting)

Détecte en novembre-décembre les positions BOURSE/CRYPTO en moins-value latente compensables avec les plus-values réalisées sur l'année. Calcule l'économie potentielle sur le PFU (30 %). Deux baskets cloisonnés (CTO et CRYPTO, conformément aux règles CGI). Tri des candidats par impact, recommandation du nombre de parts à vendre. Bandeau saisonnier sur la page Patrimoine entre le 1ᵉʳ novembre et le 31 décembre.

→ [`docs/architecture/tools/tax-loss-harvesting.md`](tools/tax-loss-harvesting.md) — API : [`docs/api/tax-loss-harvesting.md`](../api/tax-loss-harvesting.md)

#### Comparateur d'enveloppes fiscales (PEA / CTO / AV / PER)

Compare le rendement net après impôt de quatre enveloppes pour un même investissement. Rendements différenciés par enveloppe (sliders individuels) ou mode taux unique pour isoler l'impact fiscal pur. Fiscalité complète : PFU/barème CTO, exonération IR PEA après 5 ans, abattement AV après 8 ans, déduction TMI + taxation barème à la sortie PER. Réinvestissement de l'économie d'impôt PER dans un placement virtuel. Frais d'enveloppe paramétrables. Profil fiscal pré-rempli depuis le simulateur d'impôts. Tooltips pédagogiques sur chaque concept. Graphique d'évolution + bar chart jalons + tableau récapitulatif.

→ [`docs/architecture/tools/fiscal-envelope-comparator.md`](tools/fiscal-envelope-comparator.md)

#### Performance patrimoniale (TWR / MWR) — *ADMIN only, en travaux*

Calcul du rendement annualisé du patrimoine (hors `IMMO_PHYSIQUE` et `LIQUIDITE`) avec deux métriques complémentaires : **TWR** (performance pure de l'actif, via Modified Dietz entre snapshots) et **MWR / XIRR** (performance réellement vécue, Newton-Raphson). Page dédiée avec sélecteur de période (Globale / YTD / 1 / 3 / 5 ans), graphique TWR cumulé vs benchmark configurable, tableaux par catégorie et par position triées par TWR. Aucune nouvelle entité — réutilise `PositionOrder`, `PortfolioSnapshot` et `ExchangeRate`.

**Restreint au rôle ADMIN** tant que les limites structurelles (catégorie mutable rétroactivement, granularité mensuelle, frais non tracés) ne sont pas levées. Bandeau orange "🚧 Fonctionnalité en cours de développement" en permanence sur la page.

→ [`docs/architecture/patrimoine-performance.md`](patrimoine-performance.md)

---

### 3.9 Fonctionnalités d'administration

Accessibles uniquement au rôle `ADMIN`.

#### Gestion des utilisateurs

CRUD complet sur les comptes utilisateurs. Validation des demandes d'inscription.

→ [`docs/architecture/user-management.md`](user-management.md) — API : [`docs/api/users.md`](../api/users.md)

#### Instruments, cours et taux de change

Mise à jour manuelle et automatique des cours (Boursorama BOURSE, CoinGecko CRYPTO), scheduler mensuel (1er du mois à 2h), taux de change ECB, snapshot patrimonial pour tous les utilisateurs. Toggle prix fixe par instrument. Allocations géographiques et sectorielles.

→ [`docs/architecture/instruments.md`](instruments.md) — API : [`docs/api/exchange-rates.md`](../api/exchange-rates.md)

#### Gestion manuelle des relevés

CRUD complet sur les relevés de patrimoine de n'importe quel utilisateur. Utilisé pour corriger des snapshots ou reconstituer un historique.

→ [`docs/architecture/admin-snapshot-management.md`](admin-snapshot-management.md) — API : [`docs/api/admin-snapshots.md`](../api/admin-snapshots.md)

#### Historique des connexions

Consultation paginée des événements de connexion (SUCCESS / FAILURE / BLOCKED) avec filtres par login, type et date.

→ [`docs/architecture/login-history.md`](login-history.md) — API : [`docs/api/login-history.md`](../api/login-history.md)

#### Gestion des groupes familiaux

Consultation et modération des groupes familiaux (dissolution, retrait de membres).

→ [`docs/architecture/family-group.md`](family-group.md) — API : [`docs/api/family-group.md`](../api/family-group.md)

---

### 3.10 Hauts faits (gamification)

Système de **67 badges** déclinés en plusieurs sensibilités (Trivial / Faible / Moyen / Plus lourd) et axes (patrimonial, comportemental, exploratoire). Chaque badge est défini par un code, un emoji, une description et — pour les badges à paliers — jusqu'à 5 niveaux (Bronze à Diamant). Évaluation déclenchée à la demande lors de l'affichage de la page (transaction unique) et batch nocturne pour tous les utilisateurs. Indicateur de "nouveaux badges" dans la navigation (compteur depuis `lastAchievementSeenAt`). Badges secrets (easter eggs) masqués tant que non débloqués.

| Documentation | Lien |
|---------------|------|
| Architecture | [`docs/architecture/achievements.md`](achievements.md) |
| API | [`docs/api/achievements.md`](../api/achievements.md) |

---

### 3.11 Analytics & observabilité

Tracking unifié comportement utilisateur + santé technique. Trois types d'événements : `PAGE_VIEW`, `FEATURE_USE`, `BUTTON_CLICK`, `FORM_SUBMIT`. Whitelist stricte sur les `metadata` (jamais de donnée financière). Opt-out utilisateur configurable (`PUT /api/profile/analytics-opt-out`). Côté admin : KPIs d'engagement, retention, top events, timeline, parcours par session, erreurs frontend groupées par fingerprint, dashboard santé. Purge des données antérieures à N jours.

| Documentation | Lien |
|---------------|------|
| Architecture | [`docs/architecture/analytics.md`](analytics.md) |

---

### 3.12 Plateforme (UI, PWA, robustesse)

Préférences utilisateur, installabilité PWA et gestion d'erreurs côté client.

#### Mode nuit

Bascule l'ensemble de l'interface en thème sombre via une classe `dark` posée sur `<html>`. Les couleurs sont définies par des variables CSS (`--color-*`) surchargées dans `html.dark` — aucun composant ne nécessite de modification. Initialisé depuis `localStorage` ou `prefers-color-scheme` si aucune préférence n'est sauvegardée. Un script inline dans `index.html` applique la classe avant le premier rendu React pour éviter le flash de blanc.

#### Masquage des valeurs

Classe `hide-values` sur le conteneur principal. Tous les éléments portant la classe `.amount` passent en `blur(6px)`, révélables au survol. Utilisé pour dissimuler les données financières à l'écran sans déconnecter.

#### PWA (Progressive Web App)

`manifest.json` permet l'installation de MyFinance comme application sur mobile (iOS / Android) et desktop. Icônes, nom court, couleurs de splash configurés pour s'aligner avec l'identité visuelle.

#### Pages d'erreur HTTP

Composant générique `ErrorPage` couvrant les familles 3xx / 4xx / 5xx avec icône, code, description et boutons d'action contextuels (Réessayer / Retour tableau de bord). Mode plein écran (`fullPage`) ou inline. Utilisé par `ErrorBoundary` (React error boundary) pour capturer toute exception non gérée et afficher une page d'erreur 500 propre au lieu d'un écran blanc.

---

## 4. Décisions d'architecture (ADR)

Les décisions techniques structurantes sont documentées dans [`docs/architecture/decisions/`](decisions/README.md).

| ADR | Sujet |
|-----|-------|
| [ADR-001](decisions/ADR-001-architecture-generale.md) | Architecture générale (monorepo, SQLite, session cookie) |
| [ADR-002](decisions/ADR-002-tailwind-css.md) | Choix de Tailwind CSS v4 |
| [ADR-003](decisions/ADR-003-logging-strategy.md) | Stratégie de logging |
| [ADR-004](decisions/ADR-004-responsive-mobile.md) | Responsive mobile |

---

## 5. Statut

✅ **V1.8 en production** sur NAS QNAP via Docker (HTTPS via reverse proxy myQNAPcloud).

🚧 **En cours / restrictions actuelles** :
- **Performance patrimoniale (TWR / MWR)** — page livrée mais restreinte au rôle ADMIN tant que les limites structurelles (catégorie mutable rétroactivement, granularité mensuelle, frais non tracés) ne sont pas levées. Bandeau "🚧 Fonctionnalité en cours de développement" visible en permanence.

> **Détail exhaustif feature par feature** (avec contexte d'implémentation, dates, migrations, tests) : [`docs/PROJECT-STATUS.md`](../PROJECT-STATUS.md)
