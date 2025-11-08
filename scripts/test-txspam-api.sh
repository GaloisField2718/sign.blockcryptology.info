#!/bin/bash

# Script de test pour l'API SDK txspam.lol - UTXO Management
# Usage: ./scripts/test-txspam-api.sh [SECRET_API_TOKEN]

set -e

# Couleurs pour l'output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-https://sdk.txspam.lol}"
SECRET_TOKEN="${1:-${REACT_APP_SECRET_API_TOKEN}}"

# Adresses de test
TEST_ADDRESS="bc1pqxhua0whe3w88jtt49sald6emk6l09llxje3sx3h40tuaprnkw2sy22w92"
TEST_TXID="77c2f1ced94997da4632260f9e32e57f0786a4b754997a5165e6048d52400e12"
TEST_VOUT=0

# Compteurs
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Fonction pour afficher le résultat d'un test
print_result() {
    local endpoint=$1
    local method=$2
    local status_code=$3
    local expected_status=$4
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$status_code" -eq "$expected_status" ] || ([ "$status_code" -ge 200 ] && [ "$status_code" -lt 300 ]); then
        echo -e "${GREEN}✅ PASS${NC} - $method $endpoint (HTTP $status_code)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} - $method $endpoint (HTTP $status_code, expected $expected_status)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Fonction pour tester un endpoint POST
test_post() {
    local endpoint=$1
    local body_data=$2
    local expected_status=${3:-200}
    local description=$4
    
    echo -e "${BLUE}Testing:${NC} POST $endpoint"
    if [ -n "$description" ]; then
        echo -e "  ${YELLOW}Description:${NC} $description"
    fi
    
    response=$(curl -s -w "\n%{http_code}" -X POST \
        "${BASE_URL}${endpoint}" \
        -H "X-Custom-Secret: ${SECRET_TOKEN}" \
        -H "Content-Type: application/json" \
        -H "Origin: https://sign.blockcryptology.info" \
        -d "$body_data" \
        2>&1)
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    print_result "$endpoint" "POST" "$http_code" "$expected_status"
    
    if [ "$http_code" -ge 400 ]; then
        echo -e "  ${RED}Error response:${NC} $(echo "$body" | head -c 200)"
    else
        # Afficher un aperçu de la réponse
        echo -e "  ${GREEN}Response preview:${NC} $(echo "$body" | head -c 100)..."
    fi
    
    echo ""
}

# Vérifier que le token est fourni
if [ -z "$SECRET_TOKEN" ]; then
    echo -e "${RED}❌ Erreur: SECRET_API_TOKEN requis${NC}"
    echo ""
    echo "Usage:"
    echo "  $0 <SECRET_API_TOKEN>"
    echo "  OU"
    echo "  SECRET_API_TOKEN=your_token $0"
    echo ""
    exit 1
fi

# En-tête
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Test UTXO Management API - SDK txspam.lol${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo "  Base URL: $BASE_URL"
echo "  Secret Token: ${SECRET_TOKEN:0:10}...${SECRET_TOKEN: -4}"
echo "  Test Address: $TEST_ADDRESS"
echo "  Test TXID: $TEST_TXID"
echo "  Test VOUT: $TEST_VOUT"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# ========== UTXO MANAGEMENT ROUTES ==========
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  UTXO Management Routes${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 1: POST /market/v1/brc20/utxos
test_post \
    "/market/v1/brc20/utxos" \
    "{\"address\":\"${TEST_ADDRESS}\"}" \
    200 \
    "Get Address UTXOs"

# Test 2: POST /market/v1/brc20/utxos/{txid}/{vout}/status
test_post \
    "/market/v1/brc20/utxos/${TEST_TXID}/${TEST_VOUT}/status" \
    "{\"address\":\"${TEST_ADDRESS}\"}" \
    200 \
    "Get UTXO Status"

# ========== TESTS DE VALIDATION ==========
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  Tests de Validation (Erreurs attendues)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 3: POST sans body
echo -e "${BLUE}Testing:${NC} POST /market/v1/brc20/utxos (sans body)"
response=$(curl -s -w "\n%{http_code}" -X POST \
    "${BASE_URL}/market/v1/brc20/utxos" \
    -H "X-Custom-Secret: ${SECRET_TOKEN}" \
    -H "Content-Type: application/json" \
    -H "Origin: https://sign.blockcryptology.info" \
    2>&1)
http_code=$(echo "$response" | tail -n1)
print_result "/market/v1/brc20/utxos (sans body)" "POST" "$http_code" "400"
echo ""

# Test 4: POST avec adresse invalide
test_post \
    "/market/v1/brc20/utxos" \
    "{\"address\":\"invalid-address\"}" \
    400 \
    "Test avec adresse invalide (erreur attendue)"

# Test 5: Requête sans token (401 attendu)
echo -e "${BLUE}Testing:${NC} POST /market/v1/brc20/utxos (sans token)"
response=$(curl -s -w "\n%{http_code}" -X POST \
    "${BASE_URL}/market/v1/brc20/utxos" \
    -H "Content-Type: application/json" \
    -H "Origin: https://sign.blockcryptology.info" \
    -d "{\"address\":\"${TEST_ADDRESS}\"}" \
    2>&1)
http_code=$(echo "$response" | tail -n1)
print_result "/market/v1/brc20/utxos (sans token)" "POST" "$http_code" "401"
echo ""

# Test 6: Test CORS preflight (OPTIONS)
echo -e "${BLUE}Testing:${NC} OPTIONS /market/v1/brc20/utxos (CORS preflight)"
response=$(curl -s -w "\n%{http_code}" -X OPTIONS \
    "${BASE_URL}/market/v1/brc20/utxos" \
    -H "Origin: https://sign.blockcryptology.info" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type,X-Custom-Secret" \
    2>&1)
http_code=$(echo "$response" | tail -n1)
cors_origin=$(echo "$response" | grep -i "access-control-allow-origin" || echo "")

if [ "$http_code" -eq 204 ] && [ -n "$cors_origin" ]; then
    echo -e "${GREEN}✅ PASS${NC} - OPTIONS /market/v1/brc20/utxos (HTTP $http_code, CORS headers present)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}❌ FAIL${NC} - OPTIONS /market/v1/brc20/utxos (HTTP $http_code, CORS headers missing)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

# ========== RÉSUMÉ ==========
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Résumé des Tests${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Total de tests: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "${GREEN}Tests réussis: $PASSED_TESTS${NC}"
echo -e "${RED}Tests échoués: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✅ Tous les tests sont passés !${NC}"
    exit 0
else
    echo -e "${RED}❌ Certains tests ont échoué${NC}"
    exit 1
fi

