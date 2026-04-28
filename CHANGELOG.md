# Notes de version

## v1.4.0 — 28 avril 2026 — Crédit Lombard, personnalisation et sécurité

> Cette version introduit un nouveau simulateur dédié au crédit Lombard, des outils de personnalisation du tableau de bord, et plusieurs améliorations de transparence et de sécurité.

### ✨ Nouveautés

#### Simulateur de crédit Lombard (Outils → Simulateur de crédit Lombard)

Empruntez en mettant votre portefeuille en collatéral, sans vendre vos actifs.

- **3 scénarios LTV** (Prudent / Réaliste / Optimiste) + mode personnalisé éditable par catégorie
- Modes **In fine** ou **Amortissable** avec mensualité, coût total et tableau d'amortissement
- **Effet de levier** : simule le réinvestissement du capital emprunté et compare gain net (après PFU) au coût des intérêts
- **Sensibilité aux taux variables** : impact d'une variation EURIBOR de ±3 points
- **Comparaison parallèle** des 3 scénarios LTV pour un même projet
- **Stress test couplé au levier** : applique les chutes de marché historiques (2008, COVID, dot-com, Crypto Winter) et révèle l'effet boule de neige (margin call + perte sur réinvestissement)
- **Vente vs Lombard** : calcul d'imposition plus-value et manque à gagner sur rendement attendu
- **Tooltips pédagogiques** sur tous les concepts clés (LTV, margin call, in fine, PFU…)

#### Widget Patrimoine net (Tableau de bord)

Vue synthétique brut / dettes / net avec :

- Δ depuis le dernier relevé (badge vert/rouge)
- Barre d'endettement avec seuil 33 %
- Détail des dettes : libellé, type, capital restant, mensualité, progression de remboursement, date de libération

#### Personnalisation du tableau de bord

Bouton **Personnaliser** en haut du dashboard pour activer/désactiver chaque widget. Vos préférences sont sauvegardées localement.

#### Score patrimonial : axe Optimisation fiscale

L'axe « Cohérence âge/risque » est remplacé par **Optimisation fiscale** : mesure la part de BOURSE / IMMO_PAPIER placée en enveloppe avantageuse (PEA, AV, PEE) plutôt qu'en CTO. Plus actionnable et indépendant de votre âge.

### 🎨 Améliorations

- **Tooltips explicatifs** dans Mon Profil : chaque champ (informations personnelles, profil fiscal, matelas de sécurité) explique où la donnée est utilisée dans l'application
- **Masquage automatique** des sections du Dashboard sans données : si vous n'avez pas de bulletins de paie, dépenses ou passifs, les widgets correspondants ne s'affichent plus
- **Mode "masquer les valeurs"** étendu à la déclaration de patrimoine et au simulateur de crise — toutes les valeurs monétaires sont désormais floutées
- **Diversification patrimoniale** : les liquidités (compte courant) ne sont plus comptées comme une catégorie de diversification — focus sur les vrais investissements

### 🔒 Sécurité

- Renforcement des en-têtes HTTP (`Referrer-Policy`, `Permissions-Policy`)
- Anti-énumération sur les invitations de groupe familial
- Cookie de session forcé en `Secure=true` en production
- Protection contre l'injection SSRF via les symboles Boursorama
- Validation et bornage des champs sur 22 DTOs (Create / Update)
- Audit trail admin sur 15 actions sensibles

### 🐛 Corrections

- **Suppression d'une dette** : correction de l'erreur "No EntityManager" qui empêchait la suppression dans certains cas
- **Pages d'erreur 500** : les ressources statiques manquantes renvoient désormais un 404 silencieux

### 🛠 Sous le capot

- **JaCoCo** ajouté pour la couverture de tests backend (rapport HTML, seuil 70 % lignes / 60 % branches)
- **Maven Surefire Report** pour le rapport HTML d'exécution des tests
- 706 tests backend + 923 tests frontend (43 nouveaux pour le simulateur Lombard)

---

## v1.3.0 — 27 avril 2026 — Mode nuit, audit sécurité et frais réels détaillés

> Version riche en améliorations transversales : mode sombre, audit de sécurité complet, déclaration de frais réels, et refactor frontend en profondeur.

### ✨ Nouveautés

#### Mode nuit (dark mode)

Toggle lune/soleil dans la barre de navigation. Le thème sombre s'applique à toute l'application et est persisté localement (avec détection automatique de la préférence système au premier accès).

#### Frais réels détaillés (Mon Profil → Profil fiscal)

Saisie complète des frais professionnels avec barème kilométrique fiscal automatique :

- Transport véhicule (CV fiscal, électrique avec ×1.20)
- Transport en commun, frais de repas (calcul automatique avec déduction tickets-restaurant), télétravail (allocation employeur)
- Vêtements pro, formation, matériel, téléphone, double résidence
- **Comparaison forfait 10 % vs frais réels** en temps réel pour savoir lequel est plus avantageux

#### Sauvegarde des simulations d'emprunt

Les simulations d'emprunt immobilier sont désormais persistées en base. Bouton "Sauvegarder" pour nommer une simulation, "Mes simulations" pour les charger ou supprimer.

#### Affichage de la version

Le numéro de version de l'application est affiché dans le pied de page (desktop) et au bas du menu mobile.

### 🎨 Améliorations

- **Investissement locatif** dans le simulateur d'emprunt — calcul du rendement net, comparaison achat vs location, projection sur 30 ans
- **Champ Instrument obligatoire** lors de la création d'une position BOURSE/CRYPTO

### 🔒 Sécurité

Audit de sécurité complet — 15 vulnérabilités identifiées et corrigées :

- **Critiques** : mot de passe admin initial via env var, anti-énumération de comptes au /register, rate-limit IP sur /register et /login, cookie XSRF explicite
- **Élevées** : restriction PUT /api/instruments/{id} aux ADMIN, validation des entrées sur /api/profile/*, récupération des vraies IPs derrière le proxy, bornage des Map/List
- **Modérées** : politique de mot de passe renforcée, contrôle de session concurrente + timeout 4h, blocage Swagger UI hors profil dev, validation /login sans username, purge des hashs après approve/reject

### 🐛 Corrections

- **Simulateur d'impôts** : rechargement de l'utilisateur depuis la base à chaque simulation (les modifications de profil fiscal étaient parfois ignorées)
- **Gestion d'erreurs API** : `AccessDeniedException` et `MethodArgumentNotValidException` retournent désormais des codes HTTP appropriés

### 🛠 Sous le capot

- Refactor frontend en 3 phases — abstractions partagées (`useCrud`, composants communs), migration de tous les modules CRUD, restructuration des grosses pages (PatrimoinePage, LoanSimulatorPage)
- Stack de tests Vitest + React Testing Library installée (880 tests Vitest)
- 514 → 706 tests backend, 0 → 880 tests frontend
- Documentation : refonte complète des diagrammes Mermaid, audit `docs/api/` et `docs/architecture/`, création de `docs/architecture/tools/`

---

## v1.2.1 — 26 avril 2026 — Correctifs

### 🐛 Corrections

- Mise à jour des tests `ProfileService` et `ProfileController` après l'introduction du profil self-service (tests cassés silencieusement par la v1.2.0)

---

## v1.2.0 — 26 avril 2026 — Profil self-service et investissement locatif

> L'utilisateur peut désormais éditer son profil sans passer par un admin, et le simulateur d'emprunt s'enrichit d'une analyse d'investissement locatif.

### ✨ Nouveautés

#### Profil self-service (Mon Profil)

Édition autonome des informations personnelles et du profil fiscal sans intervention d'un administrateur :

- **Informations personnelles** : prénom, nom, date de naissance, commune et code postal de naissance, poste actuel
- **Profil fiscal** : nombre de parts fiscales, mode de déduction (forfait 10 % ou frais réels)

#### Investissement locatif (Simulateur d'emprunt)

Section dédiée à l'analyse de rentabilité d'un projet locatif :

- Loyer mensuel, charges, taxe foncière, vacance locative
- Régime fiscal (micro-foncier, réel)
- **Cash-flow mensuel** et **rendement net** affichés en temps réel
- Comparaison achat-revente vs location-location sur la durée du prêt

---

## v1.1.1 — 25 avril 2026 — Correctifs

### 🐛 Corrections

- **Documentation** : correction des chemins d'images dans la documentation utilisateur
- **Authentification** : l'erreur 401 sur l'endpoint `/api/auth/login` n'est plus interceptée par le gestionnaire global (n'affichait plus le message "Identifiants incorrects")

---

## v1.1.0 — 25 avril 2026 — Lancement officiel

> Première version stable de MyFinance, application personnelle de gestion de finances et de patrimoine, déployée sur NAS QNAP en réseau local.

### ✨ Fonctionnalités principales au lancement

#### Authentification et utilisateurs

- Connexion par session cookie + BCrypt
- CRUD utilisateurs réservé aux administrateurs
- Changement de mot de passe self-service

#### Gestion des revenus

- **Contrats salariaux** avec révisions, primes (exceptionnelles et annuelles), avantages en nature et astreintes
- **Calcul du net imposable réel** via cotisations légales 2025, statut cadre/non-cadre et option prévoyance
- **Bulletins de paie mensuels** réels (saisie manuelle)
- **Revenus complémentaires** (locatifs, dividendes, aides sociales, autres) avec leurs paramètres fiscaux

#### Simulateur des impôts (IRPP)

- Barème progressif officiel et quotient familial
- Choix de la source salariale (projection contrat ou bulletins réels)
- Sélection des revenus complémentaires à inclure
- **Affichage de l'impôt mensuel estimé** (montant annuel ÷ 12)

#### Patrimoine

- Positions (BOURSE, CRYPTO, IMMO_PAPIER, IMMO_PHYSIQUE, LIVRET, LIQUIDITE) avec instruments financiers
- Ordres d'achat/vente avec calcul automatique du prix moyen pondéré et de la plus-value latente
- Relevés mensuels (snapshots) pour suivre l'évolution dans le temps

#### Interface

- Application web responsive (Tailwind CSS v4)
- Tableau de bord avec graphiques Recharts (évolution salariale, projection FIRE, répartition patrimoniale)
- Architecture monorepo (`backend/` Spring Boot 3.5 + `frontend/` React/Vite)

### 🛠 Sous le capot

- Java 17, Spring Boot 3.5, SQLite (mono-utilisateur)
- React 18 + Vite, Tailwind CSS v4
- Documentation architecture et API dans `docs/`
- Premiers tests unitaires backend (UserService, UserController, services revenus et impôts)

---
