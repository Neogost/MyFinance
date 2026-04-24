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
| Bilan financier | ✅ | Actif/passif, ratio de couverture patrimoniale, projection FIRE |
| Tableau de bord | ✅ | Évolution patrimoine, widget FIRE, scoring, dettes, objectifs (Recharts) |
| Mise à jour des cours | ✅ | Mise à jour manuelle groupée (admin), prix fixe par instrument |
| Simulateur d'emprunt | ✅ | Calcul mensualités, coût total, tableau d'amortissement |
| Simulateur de crise | ✅ | Impact d'un choc de marché sur le patrimoine net |
| Déclaration de patrimoine | ✅ | Synthèse complète avec export PDF |

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
Les fichiers `deploy.sh` et `docker-compose.yml` ne sont pas versionnés (`.gitignore`) car ils contiennent des informations personnelles (IP, chemins NAS).

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

**2. Transfert vers le NAS :**
```bash
ssh NAS_USER@NAS_IP "cat > NAS_PATH/myfinance.tar" < /tmp/myfinance.tar
ssh NAS_USER@NAS_IP "cat > NAS_PATH/docker-compose.yml" < docker-compose.yml
```

**3. Déploiement sur le NAS :**
```bash
ssh NAS_USER@NAS_IP
docker stop myfinance
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
cd backend
./mvnw test
# 561 tests unitaires (services + controllers)
```

## Documentation

| Document | Description |
|----------|-------------|
| `docs/architecture/overview.md` | Architecture générale et diagrammes |
| `docs/architecture/salary.md` | Revenus salariaux, formules de calcul, astreintes |
| `docs/architecture/tax-simulator.md` | Simulateur d'impôts, algorithme IRPP |
| `docs/architecture/patrimoine.md` | Patrimoine : positions, ordres, snapshots |
| `docs/architecture/patrimoine-scoring.md` | Scoring patrimonial : axes, seuils, profils |
| `docs/architecture/recurring-expenses.md` | Dépenses récurrentes, capacité d'épargne |
| `docs/architecture/dettes.md` | Dettes : amortissement, suivi manuel |
| `docs/architecture/bilan-financier.md` | Bilan financier personnel |
| `docs/architecture/dashboard.md` | Tableau de bord, widgets |
| `docs/architecture/login-history.md` | Historique des connexions |
| `docs/architecture/family-group.md` | Regroupement familial |
| `docs/api/authentication.md` | API authentification |
| `docs/api/users.md` | API utilisateurs |
| `docs/api/salary-contracts.md` | API contrats salariaux et bulletins |
| `docs/api/other-incomes.md` | API revenus complémentaires |
| `docs/api/patrimoine.md` | API patrimoine (positions, ordres, snapshots) |
| `docs/api/recurring-expenses.md` | API dépenses récurrentes |
| `docs/api/debts.md` | API dettes |
| `docs/architecture/decisions/` | Décisions d'architecture (ADR) |
