# Déploiement - Guide Complet

## Architecture de Production

```
Frontend React (build statique dans /var/www/sign-blockcryptology/)
    ↓
Nginx (reverse proxy)
    ↓
├─→ PostgREST (Docker, port 3001) → PostgreSQL
└─→ TXSpam Proxy (Node.js service, port 3002) → sdk.txspam.lol API
```

## Déploiement du Frontend (Build Statique)

Le frontend est déployé comme un build statique :

```bash
# Build et déploiement
yarn build && sudo cp -r build/* /var/www/sign-blockcryptology/ && echo "✅ Déploiement réussi !"
```

**Aucun serveur Node.js n'est nécessaire pour servir le frontend** - Nginx sert directement les fichiers statiques.

## Déploiement du Proxy Backend

Le proxy TXSpam est un **service backend séparé** qui doit tourner en permanence.

### 1. Installation initiale

```bash
cd /home/galois/blockchain/bitcoin/unisat-web3-demo/backend
npm install
```

### 2. Vérifier que le token est dans .env

Le fichier `.env` à la racine du projet doit contenir :

```bash
SECRET_API_TOKEN=votre_token_ici
```

### 3. Démarrer le service (choisir une méthode)

#### Option A : PM2 (recommandé)

```bash
cd /home/galois/blockchain/bitcoin/unisat-web3-demo
pm2 start backend/txspam-proxy.js --name txspam-proxy --cwd $(pwd)
pm2 save
pm2 startup  # Une seule fois pour démarrer au boot
```

#### Option B : systemd

Créer `/etc/systemd/system/txspam-proxy.service` (voir `backend/README_PROXY.md`), puis :

```bash
sudo systemctl daemon-reload
sudo systemctl enable txspam-proxy
sudo systemctl start txspam-proxy
```

### 4. Configurer Nginx

Ajouter la configuration proxy dans `/etc/nginx/sites-available/sign-blockcryptology` :

```nginx
# Proxy pour TXSpam API (AVANT la location /api générale)
location /api/txspam {
    proxy_pass http://127.0.0.1:3002/api;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Proxy pour PostgREST API
location /api {
    proxy_pass http://127.0.0.1:3001;
    # ... reste de la config
}
```

Puis recharger Nginx :

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Workflow de Déploiement Complet

```bash
# 1. Mettre à jour le code
git pull

# 2. Rebuild le frontend et déployer
yarn build && sudo cp -r build/* /var/www/sign-blockcryptology/

# 3. Redémarrer le proxy si nécessaire (après changement de code backend)
pm2 restart txspam-proxy
# ou
sudo systemctl restart txspam-proxy

# 4. Vérifier que tout fonctionne
pm2 status
curl http://localhost:3002/health
```

## Vérification

```bash
# Vérifier que le proxy tourne
pm2 status txspam-proxy
# ou
sudo systemctl status txspam-proxy

# Tester le proxy directement
curl http://localhost:3002/health

# Tester via Nginx (en production)
curl -X POST https://sign.blockcryptology.info/api/txspam/utxos \
  -H "Content-Type: application/json" \
  -d '{"address": "bc1p..."}'
```

## Résumé

- **Frontend** : Build statique déployé dans `/var/www/sign-blockcryptology/` (pas de serveur Node.js)
- **Proxy Backend** : Service Node.js indépendant qui tourne en permanence sur le port 3002
- **Nginx** : Reverse proxy qui route les requêtes vers les services backend appropriés

