#!/bin/bash
# Script de déploiement MyFinance sur NAS QNAP
# Usage : ./deploy.sh

set -e

NAS_USER="NAS_USER"
NAS_IP="NAS_IP"
NAS_PATH="/FOLDER/config/myFinance"
IMAGE_NAME="myfinance:latest"
TAR_FILE="/tmp/myfinance.tar"

echo "==> Build de l'image Docker (linux/amd64)..."
docker buildx build --platform linux/amd64 --provenance=false --load -t "$IMAGE_NAME" .

echo "==> Export de l'image..."
docker save "$IMAGE_NAME" -o "$TAR_FILE"

echo "==> Transfert sur le NAS..."
scp "$TAR_FILE" "$NAS_USER@$NAS_IP:$NAS_PATH/myfinance.tar"

echo "==> Déploiement sur le NAS..."
ssh "$NAS_USER@$NAS_IP" "
  docker stop myfinance 2>/dev/null || true
  docker load -i $NAS_PATH/myfinance.tar
  cd $NAS_PATH
  docker compose up -d
  docker ps | grep myfinance
"

echo "==> Déploiement terminé."
