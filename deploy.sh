#!/bin/bash

# Script de déploiement pour sign.blockcryptology.info
# Usage: ./deploy.sh [server-user@server-ip]

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$PROJECT_DIR/build"
REMOTE_USER="${1:-user}"
REMOTE_HOST="${2:-your-server-ip}"
REMOTE_DIR="/var/www/sign-blockcryptology"

echo -e "${GREEN}🚀 Déploiement de sign.blockcryptology.info${NC}"
echo ""

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "$PROJECT_DIR/package.json" ]; then
    echo -e "${RED}❌ Erreur: package.json non trouvé${NC}"
    exit 1
fi

# Étape 1: Build
echo -e "${YELLOW}📦 Étape 1: Création du build de production...${NC}"
if [ -d "$BUILD_DIR" ]; then
    echo "Nettoyage de l'ancien build..."
    rm -rf "$BUILD_DIR"
fi

# Vérifier si yarn est disponible
if command -v yarn &> /dev/null; then
    echo "Utilisation de yarn..."
    yarn install
    yarn build
elif command -v npm &> /dev/null; then
    echo "Utilisation de npm..."
    npm install
    npm run build
else
    echo -e "${RED}❌ Erreur: yarn ou npm doit être installé${NC}"
    exit 1
fi

if [ ! -d "$BUILD_DIR" ]; then
    echo -e "${RED}❌ Erreur: Le build n'a pas été créé${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build créé avec succès${NC}"
echo ""

# Étape 2: Vérification des fichiers
echo -e "${YELLOW}🔍 Étape 2: Vérification des fichiers...${NC}"
if [ ! -f "$BUILD_DIR/index.html" ]; then
    echo -e "${RED}❌ Erreur: index.html non trouvé dans le build${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Fichiers vérifiés${NC}"
echo ""

# Étape 3: Transfert vers le serveur
echo -e "${YELLOW}📤 Étape 3: Transfert vers le serveur...${NC}"
echo "Serveur: $REMOTE_USER@$REMOTE_HOST"
echo "Répertoire: $REMOTE_DIR"
echo ""

# Vérifier la connexion SSH
if ! ssh -o ConnectTimeout=5 "$REMOTE_USER@$REMOTE_HOST" exit 2>/dev/null; then
    echo -e "${RED}❌ Erreur: Impossible de se connecter au serveur${NC}"
    echo "Vérifiez que:"
    echo "  - Le serveur est accessible"
    echo "  - SSH est configuré"
    echo "  - Les clés SSH sont correctes"
    exit 1
fi

# Créer le répertoire sur le serveur si nécessaire
ssh "$REMOTE_USER@$REMOTE_HOST" "sudo mkdir -p $REMOTE_DIR && sudo chown -R $REMOTE_USER:$REMOTE_USER $REMOTE_DIR"

# Transférer les fichiers avec rsync
echo "Transfert des fichiers..."
rsync -avz --delete \
    --exclude '*.map' \
    "$BUILD_DIR/" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"

echo -e "${GREEN}✅ Fichiers transférés${NC}"
echo ""

# Étape 4: Configuration des permissions
echo -e "${YELLOW}🔐 Étape 4: Configuration des permissions...${NC}"
ssh "$REMOTE_USER@$REMOTE_HOST" "sudo chown -R www-data:www-data $REMOTE_DIR && sudo chmod -R 755 $REMOTE_DIR"
echo -e "${GREEN}✅ Permissions configurées${NC}"
echo ""

# Étape 5: Rechargement de nginx
echo -e "${YELLOW}🔄 Étape 5: Rechargement de nginx...${NC}"
if ssh "$REMOTE_USER@$REMOTE_HOST" "sudo nginx -t && sudo systemctl reload nginx"; then
    echo -e "${GREEN}✅ Nginx rechargé${NC}"
else
    echo -e "${YELLOW}⚠️  Nginx n'a pas pu être rechargé. Vérifiez la configuration manuellement.${NC}"
fi
echo ""

# Résumé
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Déploiement terminé avec succès !${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "🌐 Site: https://sign.blockcryptology.info"
echo ""
echo "Pour vérifier le déploiement:"
echo "  curl -I https://sign.blockcryptology.info"
echo ""

