#!/bin/bash

# Script de synchronisation des origines CORS entre .env et Nginx
# Usage: ./scripts/sync-cors-nginx.sh

set -e

# Couleurs pour l'output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

ENV_FILE="${ENV_FILE:-.env}"
NGINX_CONF="${NGINX_CONF:-/etc/nginx/conf.d/cors-whitelist-generated.conf}"
NGINX_TEST_CMD="${NGINX_TEST_CMD:-nginx -t}"
NGINX_RELOAD_CMD="${NGINX_RELOAD_CMD:-systemctl reload nginx}"

echo -e "${YELLOW}🔄 Synchronisation CORS Nginx ↔ Express${NC}"
echo "=========================================="

# Vérifier que .env existe
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Fichier .env non trouvé: $ENV_FILE${NC}"
    exit 1
fi

# Extraire les origines depuis .env
if grep -q "CORS_ALLOWED_ORIGINS" "$ENV_FILE"; then
    ORIGINS=$(grep "^CORS_ALLOWED_ORIGINS=" "$ENV_FILE" | cut -d '=' -f2- | tr ',' '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | grep -v '^$')
else
    echo -e "${YELLOW}⚠️  CORS_ALLOWED_ORIGINS non trouvé dans .env, utilisation des valeurs par défaut${NC}"
    ORIGINS="https://sign.blockcryptology.info
https://v0-so-vault-app.vercel.app"
fi

# Ajouter localhost si en développement
if [ "${NODE_ENV:-production}" != "production" ]; then
    ORIGINS="$ORIGINS
http://localhost:3000"
fi

# Générer le map Nginx
echo -e "${GREEN}📝 Génération de la configuration Nginx...${NC}"

cat > "$NGINX_CONF" <<EOF
# Configuration CORS générée automatiquement
# Ne pas modifier manuellement - Régénérer via scripts/sync-cors-nginx.sh
# Généré le: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
map \$http_origin \$cors_origin {
    default "";
EOF

# Ajouter chaque origine au map
while IFS= read -r origin; do
    if [ -n "$origin" ]; then
        echo "    \"$origin\" \"$origin\";" >> "$NGINX_CONF"
    fi
done <<< "$ORIGINS"

echo "}" >> "$NGINX_CONF"

echo -e "${GREEN}✅ Configuration générée: $NGINX_CONF${NC}"
echo ""
echo "Origines configurées:"
while IFS= read -r origin; do
    if [ -n "$origin" ]; then
        echo "  - $origin"
    fi
done <<< "$ORIGINS"

# Tester la configuration Nginx
echo ""
echo -e "${YELLOW}🧪 Test de la configuration Nginx...${NC}"
if sudo $NGINX_TEST_CMD; then
    echo -e "${GREEN}✅ Configuration Nginx valide${NC}"
    
    # Demander confirmation avant de recharger
    read -p "Recharger Nginx maintenant? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}🔄 Rechargement de Nginx...${NC}"
        sudo $NGINX_RELOAD_CMD
        echo -e "${GREEN}✅ Nginx rechargé avec succès${NC}"
    else
        echo -e "${YELLOW}⚠️  Nginx n'a pas été rechargé. Exécutez manuellement:${NC}"
        echo "  sudo $NGINX_RELOAD_CMD"
    fi
else
    echo -e "${RED}❌ Erreur dans la configuration Nginx${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Synchronisation terminée${NC}"

