# 📈 Investment Tracker

Application personnelle de gestion d'investissements, hébergée sur NAS en réseau local.

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend | Java 21 + Spring Boot 3.5 |
| Base de données | SQLite |
| Frontend | React + Recharts |
| Mise à jour des cours | Yahoo Finance API (@Scheduled) |

## Lancer le projet en développement

### Prérequis
- Java 21+
- Maven 3.9+
- Node.js 20+ (pour le frontend)

### Backend

```bash
# Cloner le projet
git clone <url-du-repo>
cd investment-tracker

# Lancer en profil dev
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

# L'API est accessible sur http://localhost:8080
# Actuator health : http://localhost:8080/actuator/health
```

### Frontend

```bash
cd frontend
npm install
npm start
# Accessible sur http://localhost:3000
```

## Déploiement sur NAS

```bash
# Compiler le JAR
./mvnw clean package -DskipTests

# Lancer sur le NAS avec le profil prod
java -jar -Dspring.profiles.active=prod target/investment-tracker-0.0.1-SNAPSHOT.jar
```

## Structure du projet

```
src/main/java/com/monportefeuille/investmenttracker/
├── config/        Configuration (CORS, Scheduler)
├── domain/        Entités JPA (Asset, Portfolio, Transaction)
├── repository/    Accès base de données (Spring Data JPA)
├── service/       Logique métier
├── controller/    Endpoints REST /api/**
└── dto/           Objets échangés avec le frontend
```

## Endpoints principaux (à venir)

| Méthode | URL | Description |
|---------|-----|-------------|
| GET | /api/portfolio | Résumé du portefeuille |
| GET | /api/assets | Liste des actifs |
| POST | /api/transactions | Ajouter une transaction |
| GET | /api/assets/{id}/history | Historique des cours |

## Variables d'environnement

Copier `.env.example` en `.env` et adapter les valeurs.
Ne jamais committer le fichier `.env` réel.