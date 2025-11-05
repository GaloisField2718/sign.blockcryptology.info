# Guide de Déploiement Rapide - sign.blockcryptology.info

## Déploiement en 5 Minutes

### Sur votre machine locale :

```bash
# 1. Build
yarn build

# 2. Transférer (remplacer user@server par vos identifiants)
rsync -avz --delete build/ user@your-server:/var/www/sign-blockcryptology/
```

### Sur le serveur :

```bash
# 1. Installer nginx
sudo apt update && sudo apt install nginx -y

# 2. Créer la configuration
sudo nano /etc/nginx/sites-available/sign-blockcryptology
# Copier le contenu de nginx.conf.example

# 3. Activer le site
sudo ln -s /etc/nginx/sites-available/sign-blockcryptology /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 4. Configurer SSL
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d sign.blockcryptology.info

# 5. Vérifier
curl -I https://sign.blockcryptology.info
```

## Déploiement Automatique

Utiliser le script `deploy.sh` :

```bash
# Modifier les variables dans le script ou passer en paramètres
./deploy.sh user@your-server-ip
```

## Points Critiques

1. **DNS** : Le domaine `sign.blockcryptology.info` doit pointer vers l'IP du serveur AVANT de configurer SSL
2. **React Router** : La ligne `try_files $uri $uri/ /index.html;` est ESSENTIELLE pour que les routes React fonctionnent
3. **Permissions** : Les fichiers doivent appartenir à `www-data:www-data` avec les permissions `755`

## Vérification

```bash
# Vérifier nginx
sudo systemctl status nginx
sudo nginx -t

# Vérifier les logs
sudo tail -f /var/log/nginx/sign-blockcryptology-error.log

# Tester le site
curl -I https://sign.blockcryptology.info
```

## En cas de problème

Voir le guide complet dans `DEPLOYMENT.md`

