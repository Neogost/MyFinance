# MyFinance

Application web personnelle de gestion financière, hébergée sur NAS QNAP en réseau local.

## Modules

- **Authentification & utilisateurs** — session cookie, anti brute-force, historique des connexions, regroupement familial
- **Revenus** — contrats salariaux (privé + fonction publique), bulletins, primes, avantages, revenus complémentaires
- **Dépenses & dettes** — dépenses récurrentes, budgets, calendrier des abonnements, dettes avec amortissement, grandes possessions
- **Patrimoine** — positions / ordres (BOURSE, CRYPTO, IMMO, LIVRET, LIQUIDITE), allocations géo/sectorielles, snapshots, scoring 6 axes, fiscalité crypto (formulaire 2086)
- **Outils** — simulateurs d'impôts, d'emprunt, de crédit Lombard, d'enveloppes fiscales, de retraite, de crise, d'intérêts composés, bilan financier, déclaration de patrimoine
- **Tableau de bord & gamification** — widgets personnalisables (FIRE, scoring, dettes, cash flow Sankey, prochains prélèvements), 67 hauts faits débloquables
- **Plateforme** — mode nuit, masquage des valeurs, PWA, pages d'erreur, analytics opt-in

> **Détail exhaustif des features** (avec contexte technique) : [`docs/PROJECT-STATUS.md`](docs/PROJECT-STATUS.md)
> **Architecture** : [`docs/architecture/overview.md`](docs/architecture/overview.md)

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
# 1311 tests unitaires (services + controllers) · couverture JaCoCo : target/site/jacoco/index.html

# Frontend
cd frontend
npm test
# 978 tests Vitest (pages CRUD, widgets dashboard, formulaires, utils, graphiques, infrastructure, simulateur Lombard, comparateur enveloppes, simulateur retraite, performance patrimoniale, simulateur donation & succession)
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
