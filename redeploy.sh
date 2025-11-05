#!/bin/bash

# Script de redéploiement rapide - Rebuild et copie uniquement
# Usage: ./redeploy.sh

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$PROJECT_DIR/build"
DEPLOY_DIR="/var/www/sign-blockcryptology"

echo -e "${GREEN}🚀 Redéploiement rapide${NC}"
echo ""

# Vérifier les permissions
if [ ! -w "$DEPLOY_DIR" ] && [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Nécessite sudo pour copier les fichiers${NC}"
    SUDO_CMD="sudo"
else
    SUDO_CMD=""
fi

# Étape 1: Build
echo -e "${YELLOW}📦 Build de production...${NC}"
cd "$PROJECT_DIR"

if command -v yarn &> /dev/null; then
    yarn build
elif command -v npm &> /dev/null; then
    npm run build
else
    echo -e "${RED}❌ yarn ou npm requis${NC}"
    exit 1
fi

if [ ! -d "$BUILD_DIR" ]; then
    echo -e "${RED}❌ Build échoué${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build créé${NC}"
echo ""

# Étape 2: Copie
echo -e "${YELLOW}📤 Copie vers $DEPLOY_DIR...${NC}"
$SUDO_CMD cp -r "$BUILD_DIR"/* "$DEPLOY_DIR/"

# Permissions
if [ "$EUID" -eq 0 ] || [ -n "$SUDO_CMD" ]; then
    $SUDO_CMD chown -R www-data:www-data "$DEPLOY_DIR"
    $SUDO_CMD chmod -R 755 "$DEPLOY_DIR"
fi

echo -e "${GREEN}✅ Redéploiement terminé !${NC}"
echo ""
echo "🌐 Site: https://sign.blockcryptology.info"
echo "💡 Nginx n'a pas besoin d'être rechargé pour les fichiers statiques"

