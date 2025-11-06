# Backend PostgREST - Référence Rapide

## Configuration

**PostgREST** est déployé via Docker. Aucun code backend Node.js n'est nécessaire.

## Commandes Essentielles

```bash
# Logs
docker logs -f postgrest

# Redémarrer
docker restart postgrest

# Status
docker ps | grep postgrest

# Recréer (après changement)
docker stop postgrest && docker rm postgrest
docker run -d --name postgrest --restart always --network host \
  -e PGRST_DB_URI="postgresql://sign_blockcryptology:PASSWORD@localhost:5432/sign_blockcryptology" \
  -e PGRST_DB_SCHEMA="public" \
  -e PGRST_DB_ANON_ROLE="web_anon" \
  -e PGRST_SERVER_HOST="0.0.0.0" \
  -e PGRST_SERVER_PORT="3001" \
  postgrest/postgrest
```

## Test API

```bash
# Lister toutes les clés
curl http://localhost:3001/address_api_keys

# Récupérer une clé
curl "http://localhost:3001/address_api_keys?address=eq.ADDRESS&select=api_key"
```

## Configuration

Voir `../POSTGREST_MANAGEMENT.md` pour le guide complet de management.
