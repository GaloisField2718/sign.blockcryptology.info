# Guide de Déploiement - sign.blockcryptology.info

Ce guide détaille toutes les étapes nécessaires pour déployer l'application React sur un serveur avec nginx.

## Prérequis

- Serveur Linux (Ubuntu/Debian recommandé)
- Accès root ou sudo
- Domaine `sign.blockcryptology.info` pointant vers l'IP du serveur
- Node.js et npm/yarn installés sur le serveur OU build local transféré

---

## Étape 1 : Préparation du Build

### Option A : Build Local (Recommandé)

Sur votre machine de développement :

```bash
# Aller dans le répertoire du projet
cd /home/galois/blockchain/bitcoin/unisat-web3-demo

# Installer les dépendances si nécessaire
yarn install
# ou
npm install

# Créer le build de production
yarn build
# ou
npm run build

# Le build sera créé dans le dossier `build/`
# Vous devrez transférer ce dossier sur le serveur
```

### Option B : Build sur le Serveur

```bash
# Sur le serveur, installer Node.js (si pas déjà installé)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Installer yarn (optionnel)
npm install -g yarn

# Cloner ou transférer le projet
git clone <votre-repo> /var/www/sign-blockcryptology
cd /var/www/sign-blockcryptology

# Installer les dépendances
yarn install
# ou
npm install

# Créer le build
yarn build
# ou
npm run build
```

---

## Étape 2 : Transférer les Fichiers sur le Serveur

### Si build local :

```bash
# Depuis votre machine locale
scp -r build/ user@your-server-ip:/var/www/sign-blockcryptology/

# Ou utiliser rsync pour une synchronisation efficace
rsync -avz --delete build/ user@your-server-ip:/var/www/sign-blockcryptology/
```

### Créer la structure de répertoires sur le serveur :

```bash
# Se connecter au serveur
ssh user@your-server-ip

# Créer le répertoire de déploiement
sudo mkdir -p /var/www/sign-blockcryptology
sudo chown -R $USER:$USER /var/www/sign-blockcryptology

# Si vous avez transféré le build, assurez-vous qu'il est dans /var/www/sign-blockcryptology/
# La structure devrait être :
# /var/www/sign-blockcryptology/
#   ├── index.html
#   ├── static/
#   │   ├── css/
#   │   ├── js/
#   │   └── media/
#   └── ...
```

---

## Étape 3 : Installation et Configuration de Nginx

### Installer nginx :

```bash
sudo apt update
sudo apt install nginx -y

# Vérifier que nginx fonctionne
sudo systemctl status nginx
```

### Créer la configuration nginx :

```bash
sudo nano /etc/nginx/sites-available/sign-blockcryptology
```

Contenu de la configuration :

```nginx
# Configuration pour sign.blockcryptology.info

# Redirection HTTP vers HTTPS (à activer après configuration SSL)
server {
    listen 80;
    listen [::]:80;
    server_name sign.blockcryptology.info;

    # Pour Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirection vers HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# Configuration HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name sign.blockcryptology.info;

    # Chemins vers les certificats SSL (à mettre à jour après génération)
    ssl_certificate /etc/letsencrypt/live/sign.blockcryptology.info/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sign.blockcryptology.info/privkey.pem;

    # Configuration SSL moderne et sécurisée
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # En-têtes de sécurité
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Racine du site
    root /var/www/sign-blockcryptology;
    index index.html;

    # Compression gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    # Logs
    access_log /var/log/nginx/sign-blockcryptology-access.log;
    error_log /var/log/nginx/sign-blockcryptology-error.log;

    # Configuration principale
    location / {
        try_files $uri $uri/ /index.html;
        
        # Cache pour les fichiers statiques
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Interdire l'accès aux fichiers cachés
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Configuration spécifique pour les fichiers statiques React
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
}
```

### Activer le site :

```bash
# Créer un lien symbolique
sudo ln -s /etc/nginx/sites-available/sign-blockcryptology /etc/nginx/sites-enabled/

# Vérifier la configuration nginx
sudo nginx -t

# Si la configuration est valide, recharger nginx
sudo systemctl reload nginx
```

**Note** : Pour l'instant, nginx écoutera sur le port 80 seulement. Nous configurerons SSL à l'étape suivante.

---

## Étape 4 : Configuration SSL avec Let's Encrypt

### Installer Certbot :

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### Obtenir le certificat SSL :

```bash
# Assurez-vous que le DNS pointe vers votre serveur avant de continuer
# Vérifier avec : dig sign.blockcryptology.info

# Obtenir le certificat
sudo certbot --nginx -d sign.blockcryptology.info

# Certbot va :
# 1. Générer le certificat
# 2. Modifier automatiquement la configuration nginx
# 3. Configurer le renouvellement automatique
```

### Vérifier le renouvellement automatique :

```bash
# Tester le renouvellement (dry-run)
sudo certbot renew --dry-run

# Le renouvellement automatique est déjà configuré via cron
```

---

## Étape 5 : Configuration du Firewall

### Autoriser les ports nécessaires :

```bash
# Si vous utilisez UFW (Ubuntu)
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
sudo ufw enable

# Vérifier le statut
sudo ufw status

# Si vous utilisez firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

## Étape 6 : Vérification et Tests

### Vérifier que nginx fonctionne :

```bash
sudo systemctl status nginx
```

### Vérifier les logs en cas d'erreur :

```bash
# Logs d'accès
sudo tail -f /var/log/nginx/sign-blockcryptology-access.log

# Logs d'erreur
sudo tail -f /var/log/nginx/sign-blockcryptology-error.log

# Logs nginx généraux
sudo tail -f /var/log/nginx/error.log
```

### Tester depuis la ligne de commande :

```bash
# Test HTTP (devrait rediriger vers HTTPS)
curl -I http://sign.blockcryptology.info

# Test HTTPS
curl -I https://sign.blockcryptology.info

# Vérifier les en-têtes de sécurité
curl -I https://sign.blockcryptology.info | grep -i "strict-transport"
```

### Tester dans le navigateur :

1. Ouvrir `https://sign.blockcryptology.info`
2. Vérifier que le cadenas SSL s'affiche
3. Tester toutes les fonctionnalités de l'application
4. Vérifier la console du navigateur pour les erreurs

---

## Étape 7 : Configuration Avancée (Optionnel)

### Optimisation des performances :

Ajouter dans la configuration nginx :

```nginx
# Dans le bloc server HTTPS, ajouter :

# Cache des fichiers statiques
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
    expires 365d;
    add_header Cache-Control "public, immutable";
    access_log off;
}

# Désactiver les logs pour les favicon
location = /favicon.ico {
    log_not_found off;
    access_log off;
}

# Désactiver les logs pour robots.txt
location = /robots.txt {
    log_not_found off;
    access_log off;
}
```

### Configuration pour plusieurs workers :

Dans `/etc/nginx/nginx.conf` :

```nginx
worker_processes auto;
worker_connections 1024;
```

---

## Étape 8 : Mise à Jour du Site

### Processus de mise à jour :

```bash
# 1. Sur votre machine locale
cd /home/galois/blockchain/bitcoin/unisat-web3-demo
yarn build

# 2. Transférer le nouveau build
rsync -avz --delete build/ user@your-server-ip:/var/www/sign-blockcryptology/

# 3. Sur le serveur, recharger nginx (optionnel, pas nécessaire si fichiers statiques)
sudo systemctl reload nginx
```

### Script de déploiement automatique :

Créer `/var/www/sign-blockcryptology/deploy.sh` :

```bash
#!/bin/bash
set -e

echo "🚀 Déploiement de sign.blockcryptology.info"

# Aller dans le répertoire du projet
cd /var/www/sign-blockcryptology

# Pull les dernières modifications (si git)
# git pull origin main

# Installer les dépendances
yarn install

# Build
yarn build

# Copier le build (si nécessaire)
# cp -r build/* /var/www/sign-blockcryptology/

# Recharger nginx
sudo systemctl reload nginx

echo "✅ Déploiement terminé !"
```

Rendre exécutable :

```bash
chmod +x /var/www/sign-blockcryptology/deploy.sh
```

---

## Étape 9 : Monitoring et Maintenance

### Surveiller les logs :

```bash
# Installer logwatch (optionnel)
sudo apt install logwatch

# Configurer logwatch pour nginx
sudo nano /etc/logwatch/conf/logwatch.conf
```

### Surveiller l'espace disque :

```bash
# Vérifier l'espace disque
df -h

# Nettoyer les anciens builds si nécessaire
```

### Sauvegardes :

```bash
# Créer un script de sauvegarde
sudo nano /usr/local/bin/backup-sign-site.sh
```

Contenu :

```bash
#!/bin/bash
BACKUP_DIR="/backups/sign-blockcryptology"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/sign-blockcryptology-$DATE.tar.gz /var/www/sign-blockcryptology /etc/nginx/sites-available/sign-blockcryptology

# Garder seulement les 7 derniers backups
find $BACKUP_DIR -name "sign-blockcryptology-*.tar.gz" -mtime +7 -delete
```

Ajouter au cron :

```bash
sudo crontab -e
# Ajouter : 0 2 * * * /usr/local/bin/backup-sign-site.sh
```

---

## Checklist de Déploiement

- [ ] Build de production créé (`yarn build`)
- [ ] Fichiers transférés sur le serveur dans `/var/www/sign-blockcryptology`
- [ ] Nginx installé et configuré
- [ ] Configuration nginx créée dans `/etc/nginx/sites-available/sign-blockcryptology`
- [ ] Site activé (`ln -s` vers `sites-enabled`)
- [ ] DNS configuré pour `sign.blockcryptology.info`
- [ ] Certificat SSL obtenu avec Certbot
- [ ] Firewall configuré (ports 80 et 443 ouverts)
- [ ] Test HTTPS réussi
- [ ] Application fonctionnelle dans le navigateur
- [ ] Logs vérifiés sans erreurs
- [ ] Renouvellement SSL automatique configuré

---

## Dépannage

### Erreur 502 Bad Gateway

```bash
# Vérifier que nginx fonctionne
sudo systemctl status nginx

# Vérifier les permissions
sudo chown -R www-data:www-data /var/www/sign-blockcryptology
sudo chmod -R 755 /var/www/sign-blockcryptology
```

### Erreur 404 sur les routes React

Assurez-vous que la configuration nginx contient :
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### Certificat SSL non valide

```bash
# Vérifier le certificat
sudo certbot certificates

# Renouveler manuellement si nécessaire
sudo certbot renew --force-renewal
```

### Nginx ne démarre pas

```bash
# Vérifier la syntaxe
sudo nginx -t

# Vérifier les logs
sudo tail -f /var/log/nginx/error.log
```

---

## Commandes Utiles

```bash
# Redémarrer nginx
sudo systemctl restart nginx

# Recharger la configuration sans interruption
sudo systemctl reload nginx

# Vérifier la configuration
sudo nginx -t

# Voir les processus nginx
ps aux | grep nginx

# Tester la configuration DNS
dig sign.blockcryptology.info
nslookup sign.blockcryptology.info
```

---

## Support et Documentation

- Documentation nginx : https://nginx.org/en/docs/
- Documentation Certbot : https://certbot.eff.org/docs/
- React Deployment : https://create-react-app.dev/docs/deployment/

---

**Note importante** : Assurez-vous que le domaine `sign.blockcryptology.info` pointe vers l'IP de votre serveur avant de configurer SSL. Vous pouvez vérifier avec `dig sign.blockcryptology.info` ou `nslookup sign.blockcryptology.info`.

