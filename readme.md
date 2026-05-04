# MyFinance

Application web personnelle de gestion financière, hébergée sur NAS QNAP en réseau local.

## Fonctionnalités

| Domaine | Statut | Description |
|---------|--------|-------------|
| Authentification | ✅ | Login/logout session cookie, anti brute-force, historique des connexions |
| Gestion des utilisateurs | ✅ | CRUD complet (admin), rôles ADMIN / USER, regroupement familial |
| Revenus salariaux | ✅ | Contrats, projections super brut/net/mensuel, bulletins de paie, révisions salariales, primes, avantages en nature, astreintes/gardes |
| Revenus complémentaires | ✅ | Locatif, dividendes, aides sociales, autres |
| Dépenses récurrentes | ✅ | 9 catégories, fréquence mensuelle/annuelle, colocation, capacité d'épargne |
| Patrimoine | ✅ | Positions, ordres, instruments (BOURSE/CRYPTO/IMMO/LIVRET…), taux de change, relevés, objectifs par catégorie |
| Passifs | ✅ | Grandes possessions avec décote automatique par catégorie |
| Dettes | ✅ | Amortissement automatique, suivi manuel du capital restant, tableau d'échéances |
| Scoring patrimonial | ✅ | Score 0–105 pts en 6 axes, profil FRAGILE→OPTIMISE, widget tableau de bord |
| Simulateur d'impôts | ✅ | IRPP avec revenus salariaux + complémentaires + astreintes |
| Simulateur d'emprunt | ✅ | Calcul mensualités, coût total, tableau d'amortissement, section investissement locatif |
| Simulateur de crédit Lombard | ✅ | Capacité d'emprunt selon LTV (3 scénarios + custom), effet de levier, sensibilité aux taux, stress test couplé |
| Comparateur d'enveloppes fiscales | ✅ | PEA / CTO / Assurance-vie / PER — capital net après impôts, rendements différenciés, tooltips pédagogiques |
| Simulateur retraite | ✅ | Régime Général (CNAV) + Agirc-Arrco + CNRACL/RAFP, comparaison 4 âges, bloc PER, tooltips pédagogiques |
| Simulateur de crise | ✅ | Impact d'un choc de marché sur le patrimoine net (actifs, possessions, dettes) |
| Simulateur d'intérêts composés | ✅ | Projection d'épargne avec versements périodiques et rendement cible |
| Bilan financier | ✅ | Actif/passif, ratio de couverture patrimoniale, projection FIRE |
| Déclaration de patrimoine | ✅ | Synthèse complète exportable en PDF (via impression navigateur) |
| Tableau de bord | ✅ | Évolution patrimoine, widget FIRE, scoring, dettes, objectifs (Recharts) |
| Mise à jour des cours | ✅ | Scheduler automatique mensuel (Boursorama + CoinGecko + ECB) + déclenchement manuel admin |

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend | Java 17 + Spring Boot 3.5 |
| Base de données | SQLite (fichier local) |
| Frontend | React 19 + Vite + Tailwind CSS v4 |
| Graphiques | Recharts |
| Documentation API | Swagger UI (`/swagger-ui.html`) |

## Structure du projet

```
MyFinance/
├── backend/       Java / Spring Boot
├── frontend/      React / Vite
├── docs/          Documentation architecture et API
├── .gitignore
└── readme.md
```

## Lancer le projet en développement

### Prérequis
- Java 17+
- Maven 3.9+
- Node.js 20+

### Backend

```bash
cd backend
mkdir -p data  # créer le dossier SQLite (première fois uniquement)
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
# API accessible sur http://localhost:8080
# Swagger UI : http://localhost:8080/swagger-ui.html
```

### Frontend

```bash
cd frontend
npm install    # première fois uniquement
npm run dev
# Accessible sur http://localhost:3000
```

## Déploiement sur NAS (Docker)

Le déploiement utilise Docker via Container Station sur NAS QNAP.
Les fichiers `scripts/deploy.sh` et `docker-compose.yml` ne sont pas versionnés (`.gitignore`) car ils contiennent des informations personnelles (IP, chemins NAS).

### Prérequis NAS
- Docker et Docker Compose installés (via Container Station)
- Dossiers créés sur le NAS :
  ```
  /NAS_PATH/config/myFinance/data/
  /NAS_PATH/config/myFinance/logs/
  ```

### Étapes de mise à jour

**1. Build et export de l'image (sur le Mac) :**
```bash
cd MyFinance/
docker buildx build --platform linux/amd64 --provenance=false \
  --output "type=docker,dest=/tmp/myfinance.tar" -t myfinance:latest .
```

**2. Migrations de base de données (si applicable) :**

> À faire si des scripts sont présents dans `backend/migrations/` depuis le dernier déploiement.
> SQLite n'étant pas installé sur le NAS, la migration s'effectue en local.

```bash
# Arrêter le conteneur pour éviter toute corruption
ssh NAS_USER@NAS_IP "docker stop myfinance"

# Copier la base sur le Mac
scp NAS_USER@NAS_IP:NAS_PATH/data/myfinance.db /tmp/myfinance-prod.db

# Appliquer chaque script de migration dans l'ordre
sqlite3 /tmp/myfinance-prod.db < backend/migrations/00X_nom_migration.sql

# Vérifier (optionnel)
sqlite3 /tmp/myfinance-prod.db ".schema nom_de_la_table"

# Renvoyer la base migrée
scp /tmp/myfinance-prod.db NAS_USER@NAS_IP:NAS_PATH/data/myfinance.db
```

**3. Transfert vers le NAS :**
```bash
ssh NAS_USER@NAS_IP "cat > NAS_PATH/myfinance.tar" < /tmp/myfinance.tar
ssh NAS_USER@NAS_IP "cat > NAS_PATH/docker-compose.yml" < docker-compose.yml
```

**4. Déploiement sur le NAS :**
```bash
ssh NAS_USER@NAS_IP
docker load -i NAS_PATH/myfinance.tar
cd NAS_PATH && docker compose up -d
docker ps | grep myfinance
```

### Variables d'environnement (docker-compose.yml)

| Variable | Description |
|----------|-------------|
| `CORS_ALLOWED_ORIGINS` | Domaine d'accès (ex: `https://mondomaine.com`) |

### Logs applicatifs

Les logs sont persistés sur le NAS dans `NAS_PATH/logs/myfinance.log` (rotation 7 jours, 50 MB max).

## Tests

```bash
# Backend
cd backend
./mvnw test
# 920 tests unitaires (services + controllers) · couverture JaCoCo : target/site/jacoco/index.html

# Frontend
cd frontend
npm test
# 943 tests Vitest (pages CRUD, widgets dashboard, formulaires, utils, graphiques, infrastructure, simulateur Lombard, comparateur enveloppes, simulateur retraite, performance patrimoniale)
```

## Documentation

### Architecture

| Document | Description |
|----------|-------------|
| `docs/architecture/overview.md` | Architecture générale, fonctionnalités, statut |
| `docs/architecture/user-management.md` | Utilisateurs, rôles, droits, inscription, matelas de sécurité |
| `docs/architecture/security.md` | Authentification, anti brute-force, sessions |
| `docs/architecture/salary.md` | Revenus salariaux : formules, astreintes, projections |
| `docs/architecture/tax-simulator.md` | Simulateur d'impôts, algorithme IRPP, barème |
| `docs/architecture/patrimoine.md` | Positions, ordres, enveloppes fiscales, snapshots |
| `docs/architecture/instruments.md` | Instruments, cours (manuels + automatiques), taux de change, scheduler |
| `docs/architecture/patrimoine-strategy.md` | Objectifs cibles par catégorie d'actif |
| `docs/architecture/patrimoine-scoring.md` | Score 0–105 pts, 6 axes, profils |
| `docs/architecture/patrimoine-declaration.md` | Déclaration de patrimoine, export PDF |
| `docs/architecture/admin-snapshot-management.md` | Gestion admin des relevés de patrimoine |
| `docs/architecture/recurring-expenses.md` | Dépenses récurrentes, capacité d'épargne |
| `docs/architecture/passifs.md` | Possessions, décote automatique par catégorie |
| `docs/architecture/dettes.md` | Dettes : amortissement, suivi manuel, tableau |
| `docs/architecture/tools/bilan-financier.md` | Bilan financier personnel, ratio FIRE |
| `docs/architecture/dashboard.md` | Tableau de bord, widgets Recharts |
| `docs/architecture/user-management.md` | Utilisateurs, rôles, droits, inscription, matelas de sécurité |
| `docs/architecture/family-group.md` | Regroupement familial, invitations |
| `docs/architecture/login-history.md` | Historique des connexions, événements |
| `docs/architecture/tools/loan-simulator.md` | Simulateur d'emprunt, investissement locatif |
| `docs/architecture/tools/lombard-credit-simulator.md` | Simulateur de crédit Lombard, LTV par scénario, stress test couplé au levier |
| `docs/architecture/tools/fiscal-envelope-comparator.md` | Comparateur d'enveloppes fiscales PEA/CTO/AV/PER |
| `docs/architecture/tools/retirement-simulator.md` | Simulateur retraite (spécifié, non implémenté) |
| `docs/architecture/tools/crisis-simulator.md` | Simulateur de crise, impact choc de marché |
| `docs/architecture/tools/compound-interest-simulator.md` | Simulateur d'intérêts composés |
| `docs/architecture/decisions/` | Décisions d'architecture (ADR) et patterns |

### API

| Document | Description |
|----------|-------------|
| `docs/api/authentication.md` | Login, logout, me, changement de mot de passe |
| `docs/api/users.md` | CRUD utilisateurs (admin) |
| `docs/api/profile.md` | Profil self-service : safety-net, fiscal, infos personnelles |
| `docs/api/salary-contracts.md` | Contrats, bulletins, primes, avantages, astreintes |
| `docs/api/other-incomes.md` | Revenus complémentaires |
| `docs/api/tax-simulator.md` | Simulation IRPP |
| `docs/api/fiscal-referentiel.md` | Barème kilométrique fiscal |
| `docs/api/patrimoine-positions.md` | Instruments, positions, ordres |
| `docs/api/patrimoine-snapshots.md` | Snapshots et déclenchement scheduler |
| `docs/api/patrimoine-outils.md` | Score, objectifs, référentiel INSEE |
| `docs/api/exchange-rates.md` | Taux de change (admin) |
| `docs/api/recurring-expenses.md` | Dépenses récurrentes |
| `docs/api/possessions.md` | Grandes possessions (passifs) |
| `docs/api/debts.md` | Dettes, tableau d'amortissement, historique |
| `docs/api/family-group.md` | Regroupement familial, invitations |
| `docs/api/registration-requests.md` | Demandes d'inscription (admin) |
| `docs/api/admin-snapshots.md` | Gestion admin des relevés (admin) |
| `docs/api/login-history.md` | Historique des connexions (admin) |
| `docs/api/dashboard.md` | Évolution salariale (tableau de bord) |
| `docs/api/app-info.md` | Version de l'application |
