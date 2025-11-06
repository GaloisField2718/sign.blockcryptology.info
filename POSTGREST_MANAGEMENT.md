# PostgREST Management Guide - sign.blockcryptology.info

Guide de gestion et monitoring du service PostgREST pour le stockage des clés API ordiscan.com.

## Architecture

```
Frontend React (static) → Nginx → PostgREST (Docker) → PostgreSQL
```

## Services

### PostgreSQL
- **Service** : `postgresql@14-main`
- **Port** : 5432
- **Base de données** : `sign_blockcryptology`
- **Utilisateur** : `sign_blockcryptology`
- **Mot de passe** : Configuré dans l'environnement

### PostgREST
- **Conteneur Docker** : `postgrest`
- **Port** : 3001
- **URL API** : `http://localhost:3001` (dev) / `https://sign.blockcryptology.info/api` (prod)

## Commandes de Management

### PostgreSQL

```bash
# Statut
sudo systemctl status postgresql@14-main

# Démarrer/Arrêter
sudo systemctl start postgresql@14-main
sudo systemctl stop postgresql@14-main

# Connexion à la base
sudo -u postgres psql -d sign_blockcryptology

# Sauvegarde
sudo -u postgres pg_dump sign_blockcryptology > backup_$(date +%Y%m%d).sql

# Restauration
sudo -u postgres psql -d sign_blockcryptology < backup_YYYYMMDD.sql
```

### PostgREST

```bash
# Statut du conteneur
docker ps | grep postgrest

# Logs (live)
docker logs -f postgrest

# Logs (dernières lignes)
docker logs postgrest | tail -50

# Redémarrer
docker restart postgrest

# Arrêter/Démarrer
docker stop postgrest
docker start postgrest

# Supprimer et recréer (après changement de config)
docker stop postgrest
docker rm postgrest
docker run -d \
  --name postgrest \
  --restart always \
  --network host \
  -e PGRST_DB_URI="postgresql://sign_blockcryptology:MoneyPrinter21@localhost:5432/sign_blockcryptology" \
  -e PGRST_DB_SCHEMA="public" \
  -e PGRST_DB_ANON_ROLE="web_anon" \
  -e PGRST_SERVER_HOST="0.0.0.0" \
  -e PGRST_SERVER_PORT="3001" \
  postgrest/postgrest
```

## API Endpoints PostgREST

### Lister toutes les clés API
```bash
curl http://localhost:3001/address_api_keys
```

### Récupérer une clé API par adresse
```bash
curl "http://localhost:3001/address_api_keys?address=eq.BITCOIN_ADDRESS&select=api_key"
```

### Créer/Mettre à jour une clé API
```bash
curl -X POST http://localhost:3001/address_api_keys \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d '{"address":"BITCOIN_ADDRESS","api_key":"API_KEY"}'
```

### Supprimer une clé API
```bash
curl -X DELETE "http://localhost:3001/address_api_keys?address=eq.BITCOIN_ADDRESS"
```

## Monitoring

### Vérifier que tout fonctionne

```bash
# 1. PostgreSQL écoute sur TCP/IP
sudo netstat -tuln | grep 5432
# Devrait afficher : tcp 127.0.0.1:5432 ou tcp 0.0.0.0:5432

# 2. PostgREST répond
curl http://localhost:3001/address_api_keys
# Devrait retourner [] ou un tableau JSON

# 3. Logs PostgREST sans erreurs
docker logs postgrest | grep -i error
# Ne devrait rien retourner

# 4. Logs PostgreSQL
sudo journalctl -u postgresql@14-main -n 50
```

### Health Check

```bash
# Test complet
curl -s http://localhost:3001/address_api_keys && echo " ✅ PostgREST OK" || echo " ❌ PostgREST FAILED"
```

## Maintenance Base de Données

### Vérifier les données

```bash
sudo -u postgres psql -d sign_blockcryptology << 'SQL'
-- Nombre d'entrées
SELECT COUNT(*) FROM address_api_keys;

-- Lister toutes les adresses (sans les clés pour sécurité)
SELECT address, created_at, updated_at FROM address_api_keys;

-- Vérifier les permissions
\dp address_api_keys

-- Vérifier le rôle web_anon
\du web_anon
\q
SQL
```

### Permissions (si problème)

```bash
sudo -u postgres psql -d sign_blockcryptology << 'SQL'
GRANT SELECT, INSERT, UPDATE, DELETE ON address_api_keys TO web_anon;
GRANT USAGE, SELECT ON SEQUENCE address_api_keys_id_seq TO web_anon;
\q
SQL
```

### Nettoyer les anciennes entrées

```bash
# Supprimer les entrées de plus de X jours
sudo -u postgres psql -d sign_blockcryptology << 'SQL'
DELETE FROM address_api_keys 
WHERE updated_at < NOW() - INTERVAL '90 days';
\q
SQL
```

## Troubleshooting

### PostgREST ne répond pas
```bash
docker logs postgrest | tail -20
docker restart postgrest
```

### Erreur "permission denied"
```bash
sudo -u postgres psql -d sign_blockcryptology -c "\dp address_api_keys"
# Vérifier que web_anon a les permissions arwd
```

### Erreur "Connection refused"
```bash
# Vérifier PostgreSQL
sudo systemctl status postgresql@14-main

# Vérifier que PostgreSQL écoute sur TCP/IP
sudo grep listen_addresses /etc/postgresql/14/main/postgresql.conf
```

## Configuration Nginx

Le proxy nginx est configuré pour rediriger `/api` vers `http://127.0.0.1:3001` :

```nginx
location /api {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Prefer "return=representation";
}
```

## Fichiers de Configuration

- **Schéma DB** : `schema.sql`
- **Config PostgREST** : `/etc/postgrest/postgrest.conf` (ou variables d'environnement Docker)
- **Template config** : `.env.example` (exemple de variables d'environnement)
- **Config Nginx** : `/etc/nginx/sites-available/sign-blockcryptology`

## Sécurité

- Les clés API sont stockées en **plain text** dans PostgreSQL
- Pour production, considérer le chiffrement au niveau base de données
- Le rôle `web_anon` a uniquement accès à la table `address_api_keys`
- CORS configuré pour limiter les origines autorisées

