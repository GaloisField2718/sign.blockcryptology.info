# Guide de Débogage - Erreur "Failed to fetch UTXOs"

**Date :** 2025-11-08 01:53:22 UTC

## 🔍 Diagnostic de l'Erreur

L'erreur "Failed to fetch UTXOs" peut avoir plusieurs causes. Suivez ce guide pour identifier le problème.

---

## 📋 Checklist de Diagnostic

### 1. Vérifier la Configuration

#### Token API Configuré ?

**Vérifier dans la console du navigateur :**

Ouvrez la console (F12) et cherchez ces messages :

```
[txspamApi] ⚠️ No secret token configured - requests may fail with 401
```

**Si vous voyez ce message :**

1. Vérifier que `.env` contient :
   ```bash
   REACT_APP_SECRET_API_TOKEN=your_token_here
   ```

2. Redémarrer le serveur de développement :
   ```bash
   # Arrêter le serveur (Ctrl+C)
   yarn start
   ```

3. Vérifier que le token est bien chargé :
   ```javascript
   // Dans la console du navigateur
   console.log('Token:', process.env.REACT_APP_SECRET_API_TOKEN);
   ```

**Note :** Les variables d'environnement React doivent commencer par `REACT_APP_` et nécessitent un redémarrage du serveur.

### 2. Vérifier les Logs de la Console

Avec les améliorations de logging, vous devriez voir :

```
[txspamApi] Fetching UTXOs: { url: "...", address: "..." }
[txspamApi] Using secret token: xxxxx...
[txspamApi] Response status: 200 OK
[txspamApi] Response data: { success: true, dataLength: X }
```

**Si vous voyez :**

- **`Response status: 401`** → Token manquant ou invalide
- **`Response status: 400`** → Adresse invalide ou format incorrect
- **`Response status: 500`** → Erreur serveur
- **`Response status: 0` ou `Failed to fetch`** → Problème CORS ou réseau

### 3. Vérifier CORS

**Symptôme :** `Response status: 0` ou `Failed to fetch` dans les logs

**Vérifications :**

1. Le backend CORS est-il configuré ?
   - Vérifier que le plan CORS V2 a été implémenté
   - Vérifier que `https://sign.blockcryptology.info` est dans la whitelist

2. Tester directement avec curl :
   ```bash
   curl -X POST https://sdk.txspam.lol/market/v1/brc20/utxos \
     -H "Content-Type: application/json" \
     -H "X-Custom-Secret: YOUR_TOKEN" \
     -H "Origin: https://sign.blockcryptology.info" \
     -d '{"address":"bc1p..."}'
   ```

### 4. Vérifier le Format de la Réponse

**Dans la console, cherchez :**

```
[txspamApi] Response data: { success: false, ... }
```

**Si `success: false` :**

- Vérifier le message d'erreur dans `data.error`
- Vérifier que l'adresse est valide
- Vérifier que le token a les bonnes permissions

---

## 🐛 Scénarios d'Erreur Courants

### Scénario 1 : Token Non Configuré

**Symptômes :**
- Erreur "Failed to fetch UTXOs"
- Log : `⚠️ No secret token configured`
- Response status : 401

**Solution :**
```bash
# Ajouter dans .env
REACT_APP_SECRET_API_TOKEN=your_token_here

# Redémarrer le serveur
yarn start
```

### Scénario 2 : Token Invalide

**Symptômes :**
- Response status : 401
- Message : "Unauthorized"

**Solution :**
- Vérifier que le token est correct
- Vérifier qu'il n'y a pas d'espaces avant/après
- Vérifier que le token a les bonnes permissions

### Scénario 3 : Adresse Invalide

**Symptômes :**
- Response status : 400
- Message : "Bad Request - Invalid address format"

**Solution :**
- Vérifier le format de l'adresse Bitcoin
- S'assurer que c'est une adresse valide (bc1, 1, ou 3)

### Scénario 4 : Problème CORS

**Symptômes :**
- Response status : 0
- Erreur : "Failed to fetch" ou "CORS policy"
- Logs : Pas de réponse du serveur

**Solution :**
- Vérifier que le backend CORS est configuré
- Vérifier que votre domaine est dans la whitelist
- Vérifier les logs du backend

### Scénario 5 : Format de Réponse Inattendu

**Symptômes :**
- Response status : 200
- Mais `success: false` dans la réponse
- Ou `data` n'est pas un tableau

**Solution :**
- Vérifier les logs : `[txspamApi] Response data:`
- Vérifier la documentation de l'API
- Vérifier que l'endpoint est correct

---

## 🔧 Commandes de Débogage

### Dans la Console du Navigateur

```javascript
// Vérifier la configuration
console.log('API URL:', process.env.REACT_APP_TXSPAM_API_URL || 'https://sdk.txspam.lol');
console.log('Token:', process.env.REACT_APP_SECRET_API_TOKEN ? 'Configured' : 'NOT CONFIGURED');

// Tester l'API directement
fetch('https://sdk.txspam.lol/market/v1/brc20/utxos', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Custom-Secret': 'YOUR_TOKEN',
  },
  body: JSON.stringify({ address: 'bc1p...' })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

### Test avec le Script

```bash
# Tester l'API avec le script
./scripts/test-txspam-api.sh YOUR_SECRET_TOKEN
```

---

## 📊 Logs à Surveiller

### Logs Normaux (Succès)

```
[txspamApi] Fetching UTXOs: { url: "...", address: "..." }
[txspamApi] Using secret token: xxxxx...
[txspamApi] Response status: 200 OK
[txspamApi] Response headers: { ... }
[txspamApi] Response data: { success: true, dataLength: 5 }
```

### Logs d'Erreur

```
[txspamApi] ⚠️ No secret token configured
[txspamApi] Response status: 401 Unauthorized
[txspamApi] Error fetching UTXOs: { message: "...", status: 401 }
[useUtxos] Error in fetchUtxos: Error: ...
```

---

## ✅ Solutions Rapides

### Solution 1 : Vérifier le Token

```bash
# Vérifier .env
cat .env | grep SECRET_API_TOKEN

# Si vide, ajouter :
echo "REACT_APP_SECRET_API_TOKEN=your_token" >> .env

# Redémarrer
yarn start
```

### Solution 2 : Vérifier CORS

```bash
# Tester avec curl
curl -X POST https://sdk.txspam.lol/market/v1/brc20/utxos \
  -H "Content-Type: application/json" \
  -H "X-Custom-Secret: YOUR_TOKEN" \
  -H "Origin: https://sign.blockcryptology.info" \
  -d '{"address":"bc1p..."}' \
  -v
```

### Solution 3 : Vérifier les Logs Backend

```bash
# Si le backend est accessible
sudo tail -f /var/log/nginx/error.log
# ou
pm2 logs api
```

---

## 🎯 Prochaines Étapes

1. **Ouvrir la console du navigateur** (F12)
2. **Recharger la page** et essayer de charger les UTXOs
3. **Copier tous les logs** qui commencent par `[txspamApi]` ou `[useUtxos]`
4. **Partager les logs** pour diagnostic approfondi

Les logs améliorés devraient maintenant montrer exactement où l'erreur se produit.

---

**Document généré le :** 2025-11-08 01:53:22 UTC

