# Déploiement Docker sur NAS QNAP

## Architecture

```
Device (build)
    │
    ├─ docker buildx (linux/amd64)
    │
    └─► Serveur (Container)
            │
            ├─ Container myfinance (port 8081)
            │   └─ SQLite /data/myfinance.db
            │
            └─ Proxy inverse QNAP
                └─► https://VOTRE_DOMAINE.com:4443
```

**Fichiers de déploiement :**
- `Dockerfile` — build multi-stage (node → JDK → JRE Alpine)
- `docker-compose.yml` — configuration du conteneur
- `backend/src/main/resources/application-docker.properties` — profil Spring Boot HTTP sans SSL

---

## Gestion des versions

### Convention de numérotation

Le projet suit le **versionnage sémantique** (`MAJOR.MINOR.PATCH`) :

| Type | Incrément | Exemples de changements |
|------|-----------|------------------------|
| PATCH | `1.2.X` | Correction de bug, amélioration mineure, ajout de tests |
| MINOR | `1.X.0` | Nouvelle fonctionnalité, nouvel écran, nouvel endpoint |
| MAJOR | `X.0.0` | Refonte, migration de base non triviale, rupture d'API |

### Comment la version circule

```
backend/pom.xml  →  mvn package  →  build-info.properties
                                          │
                                    GET /api/version
                                          │
                              UI footer (desktop) + menu mobile
```

Le goal Maven `build-info` (configuré dans `spring-boot-maven-plugin`) embed automatiquement la version du `pom.xml` dans l'image Docker. Aucune manipulation manuelle n'est nécessaire côté frontend.

### Checklist de release

Avant chaque déploiement en production, dans cet ordre :

```bash
# 1. Mettre à jour la version dans pom.xml
#    Modifier la ligne : <version>1.2.1</version> → <version>1.3.0</version>
vim backend/pom.xml

# 2. Commiter le bump de version
git add backend/pom.xml
git commit -m "chore(release): bump version to 1.3.0"

# 3. Créer et pousser le tag git
git tag v1.3.0
git push origin main
git push origin v1.3.0

# 4. Déployer (voir section "Mises à jour")
./deploy.sh
```

> **Important** : le tag git et la version dans `pom.xml` doivent toujours correspondre.
> La version affichée dans l'interface (`GET /api/version`) provient du `pom.xml` via le `build-info`.

---

## Premier déploiement

### Prérequis
- Docker Desktop installé
- Accès SSH au NAS (`ssh NAS_USER@NAS_IP`)
- Dossier créé sur le NAS : `/FOLDER/config/myFinance/`

### 1. Builder l'image sur le Mac

```bash
cd /path/to/MyFinance
docker buildx build --platform linux/amd64 --provenance=false --load -t myfinance:latest .
docker save myfinance:latest -o ~/Desktop/myfinance.tar
```

### 2. Transférer sur le NAS

```bash
scp ~/Desktop/myfinance.tar NAS_USER@NAS_IP:/FOLDER/config/myFinance/myfinance.tar
scp docker-compose.yml NAS_USER@NAS_IP:/FOLDER/config/myFinance/docker-compose.yml
```

### 3. Démarrer sur le NAS (SSH)

```bash
ssh NAS_USER@NAS_IP
mkdir -p /FOLDER/config/myFinance/data
docker load -i /FOLDER/config/myFinance/myfinance.tar
cd /FOLDER/config/myFinance
docker compose up -d
```

### 4. Migrer la base de données existante

```bash
# Depuis le Mac — copie via docker cp pour éviter les problèmes de permissions
scp /path/to/myfinance-dev.db NAS_USER@NAS_IP:/tmp/myfinance.db
ssh NAS_USER@NAS_IP "docker stop myfinance && docker cp /tmp/myfinance.db myfinance:/data/myfinance.db && docker start myfinance"
```

---

## Mises à jour

### Script automatisé (recommandé)

```bash
# Depuis la racine du projet, après avoir suivi la checklist de release
./deploy.sh
```

Le script :
1. Teste la connexion SSH
2. Build l'image Docker (`linux/amd64`)
3. Transfère l'image et le `docker-compose.yml` sur le NAS
4. Arrête l'ancien container, charge la nouvelle image, redémarre

### Manuellement

```bash
# 1. Rebuilder l'image
docker buildx build --platform linux/amd64 --provenance=false --load -t myfinance:latest .
docker save myfinance:latest -o ~/Desktop/myfinance.tar

# 2. Déployer
scp ~/Desktop/myfinance.tar NAS_USER@NAS_IP:NAS_PATH/config/myFinance/myfinance.tar
ssh NAS_USER@NAS_IP "docker stop myfinance \
  && docker load -i NAS_PATH/config/myFinance/myfinance.tar \
  && cd NAS_PATH/config/myFinance \
  && docker compose up -d"
```

La base de données est sur un volume persistant — elle n'est pas affectée par les mises à jour.

### Vérifier la version déployée

Après déploiement, vérifier que la bonne version est active :

```bash
# Via l'API
curl -s http://NAS_IP:8081/api/version   # nécessite d'être authentifié → utiliser l'UI

# Via les logs Docker
ssh NAS_USER@NAS_IP "docker logs myfinance --tail 20 | grep 'Started\|version'"
```

La version est aussi visible dans le footer de l'application (bas de page, desktop).

---

## Configuration QNAP

### Proxy inverse (Panneau de configuration → Réseau → Proxy inverse)

| Champ | Valeur |
|-------|--------|
| Source protocole | HTTPS |
| Source domaine | `VOTRE_DOMAINE.myqnapcloud.com` |
| Source port | 4443 |
| Destination protocole | HTTP |
| Destination hôte | `NAS_IP` |
| Destination port | 8081 |

### DDNS (myQNAPcloud → DDNS)

Le sous-domaine `myfinance` doit être enregistré dans myQNAPcloud pour que le DNS se propage automatiquement.

### SSL

Le certificat est géré automatiquement par myQNAPcloud (Let's Encrypt, renouvellement auto).

---

## Accès

| Contexte | URL |
|----------|-----|
| Réseau local | `http://NAS_IP:8081` |
| Internet | `https://VOTRE_DOMAINE.myqnapcloud.com:4443` |

---

## Données persistantes

La base SQLite est stockée dans `NAS_PATH/config/myFinance/data/myfinance.db` sur le NAS.

**Sauvegarde :**
```bash
ssh NAS_USER@NAS_IP "docker stop myfinance"
scp NAS_USER@NAS_IP:NAS_PATH/config/myFinance/data/myfinance.db ~/Desktop/myfinance-backup-$(date +%Y%m%d).db
ssh NAS_USER@NAS_IP "docker start myfinance"
```

---

## Dépannage

### Vérifier que le conteneur tourne
```bash
ssh NAS_USER@NAS_IP "docker ps | grep myfinance"
```

### Voir les logs
```bash
ssh NAS_USER@NAS_IP "docker logs myfinance --tail 50"
```

### Redémarrer le conteneur
```bash
ssh NAS_USER@NAS_IP "docker restart myfinance"
```
