#!/bin/bash

# Script de déploiement LOCAL pour sign.blockcryptology.info
# À utiliser directement sur le serveur
# Usage: ./deploy-local.sh
# OU: sudo ./deploy-local.sh (pour automatiser toutes les étapes)

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$PROJECT_DIR/build"
DEPLOY_DIR="/var/www/sign-blockcryptology"
NEEDS_SUDO=false

# Vérifier si on a les droits sudo
if [ "$EUID" -ne 0 ]; then 
    NEEDS_SUDO=true
fi

echo -e "${GREEN}🚀 Déploiement LOCAL de sign.blockcryptology.info${NC}"
echo -e "${BLUE}Répertoire projet: $PROJECT_DIR${NC}"
echo -e "${BLUE}Répertoire déploiement: $DEPLOY_DIR${NC}"
if [ "$NEEDS_SUDO" = true ]; then
    echo -e "${YELLOW}⚠️  Mode utilisateur: certaines commandes nécessiteront sudo${NC}"
fi
echo ""

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "$PROJECT_DIR/package.json" ]; then
    echo -e "${RED}❌ Erreur: package.json non trouvé dans $PROJECT_DIR${NC}"
    exit 1
fi

# Étape 1: Build
echo -e "${YELLOW}📦 Étape 1: Création du build de production...${NC}"
cd "$PROJECT_DIR"

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

# Étape 3: Créer le répertoire de déploiement
echo -e "${YELLOW}📁 Étape 3: Préparation du répertoire de déploiement...${NC}"
if [ "$NEEDS_SUDO" = true ]; then
    echo "Création du répertoire (nécessite sudo)..."
    sudo mkdir -p "$DEPLOY_DIR"
else
    mkdir -p "$DEPLOY_DIR"
fi

# Sauvegarder l'ancien déploiement si il existe
if [ -d "$DEPLOY_DIR" ] && [ "$(ls -A $DEPLOY_DIR 2>/dev/null)" ]; then
    BACKUP_DIR="${DEPLOY_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
    echo "Sauvegarde de l'ancien déploiement vers $BACKUP_DIR"
    if [ "$NEEDS_SUDO" = true ]; then
        sudo mv "$DEPLOY_DIR" "$BACKUP_DIR"
        sudo mkdir -p "$DEPLOY_DIR"
    else
        mv "$DEPLOY_DIR" "$BACKUP_DIR"
        mkdir -p "$DEPLOY_DIR"
    fi
fi

echo -e "${GREEN}✅ Répertoire préparé${NC}"
echo ""

# Étape 4: Copier les fichiers
echo -e "${YELLOW}📤 Étape 4: Copie des fichiers vers $DEPLOY_DIR...${NC}"
if [ "$NEEDS_SUDO" = true ]; then
    sudo cp -r "$BUILD_DIR"/* "$DEPLOY_DIR/"
else
    cp -r "$BUILD_DIR"/* "$DEPLOY_DIR/"
fi
echo -e "${GREEN}✅ Fichiers copiés${NC}"
echo ""

# Étape 5: Configuration des permissions
echo -e "${YELLOW}🔐 Étape 5: Configuration des permissions...${NC}"
if [ "$NEEDS_SUDO" = true ]; then
    sudo chown -R www-data:www-data "$DEPLOY_DIR"
    sudo chmod -R 755 "$DEPLOY_DIR"
else
    chown -R www-data:www-data "$DEPLOY_DIR"
    chmod -R 755 "$DEPLOY_DIR"
fi
echo -e "${GREEN}✅ Permissions configurées (www-data:www-data, 755)${NC}"
echo ""

# Étape 6: Vérifier la configuration nginx
echo -e "${YELLOW}🔧 Étape 6: Vérification de la configuration nginx...${NC}"
if [ -f "/etc/nginx/sites-available/sign-blockcryptology" ]; then
    if [ "$NEEDS_SUDO" = true ]; then
        if sudo nginx -t 2>/dev/null; then
            echo -e "${GREEN}✅ Configuration nginx valide${NC}"
        else
            echo -e "${YELLOW}⚠️  Configuration nginx invalide. Vérifiez avec: sudo nginx -t${NC}"
        fi
    else
        if nginx -t 2>/dev/null; then
            echo -e "${GREEN}✅ Configuration nginx valide${NC}"
        else
            echo -e "${YELLOW}⚠️  Configuration nginx invalide. Vérifiez avec: nginx -t${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Configuration nginx non trouvée${NC}"
    echo "Créez la configuration avec:"
    echo "  sudo cp $PROJECT_DIR/nginx.conf.example /etc/nginx/sites-available/sign-blockcryptology"
    echo "  sudo ln -s /etc/nginx/sites-available/sign-blockcryptology /etc/nginx/sites-enabled/"
fi
echo ""

# Étape 7: Rechargement de nginx
echo -e "${YELLOW}🔄 Étape 7: Rechargement de nginx...${NC}"
if [ "$NEEDS_SUDO" = true ]; then
    if sudo systemctl is-active --quiet nginx; then
        if sudo systemctl reload nginx; then
            echo -e "${GREEN}✅ Nginx rechargé${NC}"
        else
            echo -e "${YELLOW}⚠️  Erreur lors du rechargement de nginx${NC}"
            echo "Vérifiez avec: sudo systemctl status nginx"
        fi
    else
        echo -e "${YELLOW}⚠️  Nginx n'est pas actif${NC}"
        echo "Démarrez avec: sudo systemctl start nginx"
    fi
else
    if systemctl is-active --quiet nginx; then
        if systemctl reload nginx; then
            echo -e "${GREEN}✅ Nginx rechargé${NC}"
        else
            echo -e "${YELLOW}⚠️  Erreur lors du rechargement de nginx${NC}"
            echo "Vérifiez avec: systemctl status nginx"
        fi
    else
        echo -e "${YELLOW}⚠️  Nginx n'est pas actif${NC}"
        echo "Démarrez avec: systemctl start nginx"
    fi
fi
echo ""

# Résumé
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Déploiement terminé avec succès !${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📋 Informations:${NC}"
echo "  🌐 Répertoire déployé: $DEPLOY_DIR"
if [ -d "$BUILD_DIR" ]; then
    echo "  📦 Taille du build: $(du -sh $BUILD_DIR 2>/dev/null | cut -f1 || echo 'N/A')"
fi
echo ""
echo -e "${BLUE}🔍 Prochaines étapes:${NC}"
if [ "$NEEDS_SUDO" = true ]; then
    echo "  1. Vérifier la configuration nginx: sudo nginx -t"
    echo "  2. Vérifier les logs: sudo tail -f /var/log/nginx/sign-blockcryptology-error.log"
    echo "  3. Tester le site: curl -I http://localhost"
else
    echo "  1. Vérifier la configuration nginx: nginx -t"
    echo "  2. Vérifier les logs: tail -f /var/log/nginx/sign-blockcryptology-error.log"
    echo "  3. Tester le site: curl -I http://localhost"
fi
echo ""
if [ ! -f "/etc/letsencrypt/live/sign.blockcryptology.info/fullchain.pem" ]; then
    echo -e "${YELLOW}⚠️  SSL non configuré${NC}"
    if [ "$NEEDS_SUDO" = true ]; then
        echo "  Configurez SSL avec: sudo certbot --nginx -d sign.blockcryptology.info"
    else
        echo "  Configurez SSL avec: certbot --nginx -d sign.blockcryptology.info"
    fi
    echo ""
fi
