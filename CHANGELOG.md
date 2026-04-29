# Notes de version

## v1.5.1 — 29 avril 2026 — Conformité responsive mobile complète

> Mise en conformité de l'ensemble de l'application sur mobile (iPhone SE 375 px), sans nouvelle fonctionnalité.

### 🔧 Corrections & améliorations

#### Responsive mobile
- **Modals** : toutes les modals utilisent désormais le pattern *bottom drawer* (glisse depuis le bas sur mobile, centrée sur desktop) et `z-60` pour passer au-dessus de la navigation
- **Tableaux** : scroll horizontal sur tous les tableaux, colonnes secondaires masquées sur mobile
- **Formulaires** : champs empilés en 1 colonne sur mobile (plus de mise en page serrée sur petit écran)
- **Widgets dashboard** : KPIs empilés verticalement sur mobile
- **Simulateurs** : layouts 2 panneaux corrigés, graphiques Recharts responsifs, sections "Comparaison" masquées quand inutilisables sur mobile
- **Dark mode** : le mode sombre répond désormais uniquement au toggle de l'application — plus de changement automatique selon l'heure du jour (OS scheduled dark mode)

#### Corrections d'affichage
- Montants : `fmt()` limité à 2 décimales (plus de "2 995,081 €")
- `KpiCard` : symbole `€` reste sur la même ligne que le montant sur mobile
- Simulateur de crise — Impact par catégorie : labels longs sur ligne dédiée, montants compacts (`k€`)
- Comparateur enveloppes fiscales : correction du débordement horizontal des descriptions

## v1.5.0 — 29 avril 2026 — Comparateur d'enveloppes fiscales + Simulateur Retraite

> Cette version introduit deux nouveaux simulateurs patrimoniaux : un comparateur d'enveloppes fiscales (PEA / CTO / AV / PER) et un simulateur retraite couvrant les régimes obligatoires français.

### ✨ Nouveautés

#### Comparateur d'enveloppes fiscales (Outils → Enveloppes fiscales)

Répondez à la question : *« Pour un même investissement, quelle enveloppe me laisse le plus d'argent après impôts ? »*

- **4 enveloppes comparées** : PEA, CTO, Assurance-vie et PER — chacune avec ses règles fiscales propres
- **Rendements différenciés par enveloppe** : un slider par enveloppe (CTO/PEA → actions monde, AV → mix fonds euros + UC, PER → profil équilibré) ou un mode « même taux partout » pour isoler l'impact fiscal pur
- **Fiscalité complète** : exonération IR PEA après 5 ans, abattement AV après 8 ans (4 600 € / 9 200 €), déduction TMI à l'entrée du PER avec taxation à la sortie au barème retraite, PFU 30 % ou option barème
- **Réinvestissement de l'économie d'impôt PER** : l'économie fiscale annuelle est capitalisée séparément et comparée nette de PFU — donne une vision équitable de l'avantage PER
- **Profil fiscal pré-rempli** depuis votre simulateur d'impôts (TMI actuelle et à la retraite)
- **Frais d'enveloppe paramétrables** par enveloppe (frais de gestion UC typiques : 0,6 %/an)
- **Graphique d'évolution** du capital brut sur la durée + comparaison par jalons (5 / 10 / 20 ans)
- **Tableau récapitulatif** : capital brut, frais cumulés, économie fiscale à l'entrée, impôt à la sortie, capital net et rendement brut par enveloppe
- **Tooltips pédagogiques** sur chaque concept : TMI, PFU vs barème, abattement AV, plafond PEA, plafond PER, dividendes CTO, réinvestissement éco. PER

#### Simulateur Retraite (Outils → Simulateur retraite)

Estimez votre future pension et planifiez l'effort d'épargne PER pour combler le manque.

- **Régime Général + Agirc-Arrco (privé)** : SAM sur les 25 meilleures années plafonnées au PASS, taux de liquidation 50 % au taux plein, points Agirc-Arrco accumulés sur la carrière, coefficient de solidarité −10 % si départ sans surcote
- **CNRACL + RAFP (fonction publique)** : pension calculée sur l'indice majoré des 6 derniers mois × 75 % au taux plein, RAFP forfaitaire
- **Décote/surcote** : 1,25 %/trimestre manquant ou supplémentaire, barèmes 2023 par génération
- **Pré-remplissage automatique** : date de naissance, type de contrat, salaire/indice majoré depuis le contrat salarial actif, TMI depuis le simulateur d'impôts
- **Comparaison 4 âges de départ** (60 / 62 / 64 / 67 ans) : trimestres validés, pension nette, taux de remplacement, capital PER nécessaire, verdict
- **Graphique** évolution des revenus nets (salaire actif → pension, avec ligne de départ retraite)
- **Bloc PER** : capital cible et versement mensuel calculés pour combler le delta entre pension et objectif (taux de remplacement % ou montant mensuel fixe)
- **Tooltips pédagogiques** sur tous les concepts : trimestres, SAM, PASS, Agirc-Arrco, coefficient de solidarité, RAFP, taux de remplacement, règle des 4 %…

---

## v1.4.0 — 28 avril 2026 — Lombard, contrats publics, personnalisation et sécurité

> Cette version introduit le support des contrats de la **fonction publique**, un nouveau simulateur de crédit Lombard, des outils de personnalisation du tableau de bord, et plusieurs améliorations de transparence et de sécurité.

### ✨ Nouveautés

#### Contrats fonction publique (Revenus → Salariat)

Il est maintenant possible de saisir un contrat de la **fonction publique** en plus des contrats d'entreprise privée.

À la création d'un contrat, un écran de sélection propose :
- 🏢 **Entreprise privée** — formulaire habituel (salaire brut annuel)
- 🏛️ **Fonction publique** — nouveau formulaire dédié

Pour les contrats publics, le salaire n'est pas saisi directement : vous renseignez votre **indice majoré (IM)** et l'application calcule automatiquement le traitement brut annuel en appliquant la **valeur du point d'indice** en vigueur à la date du contrat. L'historique complet des revalorisations depuis 2002 est intégré.

- Deux statuts supportés : **Titulaire** (cotisations CNRACL + CSG spécifiques) et **Contractuel** (régime général comme le privé)
- Un aperçu du brut calculé s'affiche en temps réel sous le champ indice
- Les **révisions salariales** fonctionnent de la même façon : saisissez le nouvel indice majoré et le brut est recalculé automatiquement à la date d'entrée en vigueur

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

#### Performance patrimoniale — TWR / MWR (Administration, en travaux)

Une nouvelle page de **mesure du rendement annualisé** du patrimoine financier est disponible dans le menu Administration (réservée aux administrateurs, fonctionnalité en cours de développement).

- **TWR** (Time-Weighted Return) : performance pure de l'actif, neutralise les versements — comparable à un benchmark
- **MWR** (Money-Weighted Return / XIRR) : rendement réellement vécu, tient compte du timing de vos investissements
- Sélecteur de période : Globale, YTD, 1 an, 3 ans, 5 ans
- Graphique d'évolution du TWR cumulé vs un benchmark de référence configurable (ex. 8 %/an)
- Tableaux par catégorie (Bourse, Crypto, Immo papier, Livret) et par position triés par performance
- ⚠️ Les calculs s'appuient sur vos relevés mensuels — la précision dépend de leur régularité

### 🎨 Améliorations

- **Tooltips explicatifs** dans Mon Profil : chaque champ (informations personnelles, profil fiscal, matelas de sécurité) explique où la donnée est utilisée dans l'application
- **Masquage automatique** des sections du Dashboard sans données : si vous n'avez pas de bulletins de paie, dépenses ou passifs, les widgets correspondants ne s'affichent plus
- **Mode "masquer les valeurs"** étendu à la déclaration de patrimoine et au simulateur de crise — toutes les valeurs monétaires sont désormais floutées
- **Diversification patrimoniale** : les liquidités (compte courant) ne sont plus comptées comme une catégorie de diversification — focus sur les vrais investissements
- **Duplication d'un bulletin de paie** : bouton « Dupliquer » sur chaque ligne du panneau bulletins — ouvre la modal de saisie pré-remplie avec les montants du bulletin existant, seule la période reste à sélectionner
- **Saisie du brut annuel au centime** : le champ « Salaire brut annuel » du formulaire contrat n'est plus limité aux multiples de 100 €

### 🔒 Sécurité

- Renforcement des en-têtes HTTP (`Referrer-Policy`, `Permissions-Policy`)
- Anti-énumération sur les invitations de groupe familial
- Cookie de session forcé en `Secure=true` en production
- Protection contre l'injection SSRF via les symboles Boursorama
- Validation et bornage des champs sur 22 DTOs (Create / Update)
- Audit trail admin sur 15 actions sensibles

### 🐛 Corrections

- **Comparaison « vs théorique » du Net versé** dans les bulletins de paie : le badge d'écart était toujours vide car le code comparait à un champ inexistant (`monthlyNetSalary`) au lieu du bon champ (`monthlyNetAfterTax`)
- **Suppression d'un contrat salarial** : correction de l'erreur "No EntityManager" qui empêchait la suppression lorsque le contrat avait des révisions associées
- **Suppression d'une dette** : correction de la même erreur "No EntityManager"
- **Pages d'erreur 500** : les ressources statiques manquantes renvoient désormais un 404 silencieux

### 🛠 Sous le capot

- **JaCoCo** ajouté pour la couverture de tests backend (rapport HTML, seuil 70 % lignes / 60 % branches)
- **Maven Surefire Report** pour le rapport HTML d'exécution des tests
- 746 tests backend + 923 tests frontend

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
