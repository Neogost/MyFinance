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

### Script automatisé

Utiliser le script `deploy.sh` à la racine du projet :

```bash
./deploy.sh
```

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
