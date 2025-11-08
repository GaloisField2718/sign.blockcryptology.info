# Intégration Complète UTXO - SDK txspam.lol API

**Date :** 2025-11-08 01:53:22 UTC

**Statut :** ✅ **INTÉGRATION COMPLÈTE TERMINÉE**

---

## 📋 Vue d'Ensemble

Intégration complète de l'API SDK txspam.lol pour la gestion des UTXOs dans l'application React. L'intégration utilise directement l'API `sdk.txspam.lol` avec CORS configuré côté backend.

---

## 🏗️ Architecture

```
Frontend React
    ↓
useUtxos Hook
    ↓
txspamApi Service
    ↓
SDK txspam.lol API (https://sdk.txspam.lol)
```

### Composants Créés

1. **`src/services/txspamApi.ts`** - Service API pour interagir avec SDK txspam.lol
2. **`src/hooks/useUtxos.ts`** - Hook React pour gérer les UTXOs
3. **`src/components/UtxosListCard.tsx`** - Composant refactorisé utilisant le nouveau service

---

## 🔧 Configuration

### Variables d'Environnement

**Fichier :** `.env`

```bash
# SDK txspam.lol API Configuration
REACT_APP_TXSPAM_API_URL=https://sdk.txspam.lol
REACT_APP_SECRET_API_TOKEN=your_token_here
```

**Note :** Le token peut ne pas être nécessaire côté frontend si le backend gère l'authentification, mais il est conservé pour compatibilité.

### Configuration (`src/config.ts`)

```typescript
export const SDK_TXSPAM_API_URL = 
  process.env.REACT_APP_TXSPAM_API_URL || 
  'https://sdk.txspam.lol';

export const SDK_TXSPAM_SECRET_TOKEN = 
  process.env.REACT_APP_SECRET_API_TOKEN || '';
```

---

## 📚 API Service (`src/services/txspamApi.ts`)

### Méthodes Disponibles

#### `getUtxos(address: string): Promise<TxspamUtxo[]>`

Récupère tous les UTXOs pour une adresse Bitcoin.

```typescript
import { txspamApi } from '../services/txspamApi';

const utxos = await txspamApi.getUtxos('bc1p...');
```

#### `getUtxoStatus(txid: string, vout: number, address: string): Promise<UtxoStatus>`

Récupère le statut d'un UTXO spécifique (spent/unspent).

```typescript
const status = await txspamApi.getUtxoStatus(
  '77c2f1ced94997da4632260f9e32e57f0786a4b754997a5165e6048d52400e12',
  0,
  'bc1p...'
);
// Retourne: { txid, vout, status: 'unspent' | 'spent' | 'pending', isSpent: boolean }
```

#### `batchGetUtxoStatus(utxos: Array<{txid, vout, address}>): Promise<Map<string, UtxoStatus>>`

Récupère le statut de plusieurs UTXOs en batch (par lots de 10).

```typescript
const statusMap = await txspamApi.batchGetUtxoStatus([
  { txid: '...', vout: 0, address: 'bc1p...' },
  { txid: '...', vout: 1, address: 'bc1p...' },
]);
```

### Types TypeScript

```typescript
interface TxspamUtxo {
  txid: string;
  vout: number;
  satoshi: number;
  address: string;
  scriptPk: string; // Important pour la construction de PSBT
}

interface UtxoStatus {
  txid: string;
  vout: number;
  status: 'unspent' | 'spent' | 'pending';
  isSpent: boolean;
}
```

---

## 🎣 Hook React (`src/hooks/useUtxos.ts`)

### Utilisation

```typescript
import { useUtxos } from '../hooks/useUtxos';

function MyComponent() {
  const {
    utxos,           // UTXOs avec statut optionnel
    loading,         // État de chargement
    error,           // Message d'erreur
    fetchUtxos,      // Fonction pour récupérer les UTXOs
    fetchUtxoStatus, // Fonction pour récupérer le statut d'un UTXO
    refreshUtxos,    // Fonction pour rafraîchir les UTXOs
    clearError,      // Fonction pour effacer l'erreur
    currentAddress,  // Adresse actuellement chargée
  } = useUtxos({
    autoFetch: false,      // Auto-fetch au montage
    fetchStatus: false,    // Récupérer le statut automatiquement
    onError: (err) => {    // Callback d'erreur
      console.error(err);
    },
  });

  // Utilisation
  useEffect(() => {
    fetchUtxos('bc1p...');
  }, []);
}
```

### Options du Hook

- **`autoFetch`** : Si `true`, charge automatiquement les UTXOs au montage
- **`fetchStatus`** : Si `true`, récupère le statut de chaque UTXO automatiquement
- **`onError`** : Callback appelé en cas d'erreur

### Rate Limiting

Le hook gère automatiquement le rate limiting :
- **5 appels par minute** par adresse
- Message d'erreur avec temps d'attente si limite atteinte

---

## 🎨 Composant UtxosListCard

### Fonctionnalités

1. **Affichage des UTXOs par statut** :
   - ✅ **Unspent** (disponibles) - en vert
   - ❌ **Spent** (dépensés) - en rouge, non sélectionnables
   - ❓ **Unknown** (statut inconnu) - en gris

2. **Sélection d'UTXOs** :
   - Cases à cocher pour sélectionner les UTXOs disponibles
   - Les UTXOs spent ne peuvent pas être sélectionnés

3. **Boutons d'action** :
   - **Load UTXOs** : Charger les UTXOs d'une adresse
   - **Check Status** : Vérifier le statut de tous les UTXOs
   - **Refresh** : Rafraîchir la liste des UTXOs

4. **Informations affichées** :
   - Outpoint (txid:vout)
   - Montant en satoshis et BTC
   - Statut (Unspent/Spent/Unknown)
   - ScriptPK (au survol)
   - Liens vers nullpool.space

### Exemple d'Utilisation

```tsx
import { UtxosListCard } from './components/UtxosListCard';

function App() {
  return (
    <UtxosListCard defaultAddress="bc1p..." />
  );
}
```

---

## 🧪 Tests

### Script de Test Bash

Un script de test est disponible pour valider l'API :

```bash
# Tester l'API
./scripts/test-txspam-api.sh YOUR_SECRET_TOKEN

# Ou avec variable d'environnement
SECRET_API_TOKEN=your_token ./scripts/test-txspam-api.sh
```

Le script teste :
- ✅ Récupération des UTXOs
- ✅ Récupération du statut UTXO
- ✅ Validation des erreurs (adresse invalide, token manquant)
- ✅ CORS preflight (OPTIONS)

### Tests Manuels dans le Frontend

1. Ouvrir l'application
2. Aller à la section "UTXOs List"
3. Entrer une adresse Bitcoin
4. Cliquer sur "Load UTXOs"
5. Vérifier que les UTXOs s'affichent
6. Cliquer sur "Check Status" pour vérifier le statut
7. Sélectionner des UTXOs pour les utiliser dans SendBitcoin

---

## 🔗 Intégration avec SendBitcoin

Les UTXOs sélectionnés dans `UtxosListCard` sont automatiquement disponibles dans `SendBitcoinCard` via le contexte `UtxoSelectionContext`.

### Workflow

1. **Sélectionner les UTXOs** dans `UtxosListCard`
2. **Aller à SendBitcoin** - Les UTXOs sélectionnés sont affichés
3. **Construire la transaction** avec les UTXOs sélectionnés (à implémenter)

---

## 📊 Structure des Données

### Format UTXO

```typescript
interface UtxoWithStatus {
  txid: string;           // Transaction ID
  vout: number;           // Output index
  satoshi: number;        // Valeur en satoshis
  address: string;        // Adresse Bitcoin
  scriptPk: string;       // Script public key (pour PSBT)
  status?: UtxoStatus;     // Statut optionnel
  isSpent?: boolean;      // Indicateur spent/unspent
}
```

### Format Outpoint

Les UTXOs sont identifiés par leur outpoint au format : `{txid}:{vout}`

Exemple : `77c2f1ced94997da4632260f9e32e57f0786a4b754997a5165e6048d52400e12:0`

---

## 🚀 Déploiement

### 1. Configuration

Assurez-vous que les variables d'environnement sont configurées :

```bash
REACT_APP_TXSPAM_API_URL=https://sdk.txspam.lol
REACT_APP_SECRET_API_TOKEN=your_token_here  # Optionnel si backend gère l'auth
```

### 2. Build

```bash
yarn build
```

### 3. Déploiement

```bash
yarn build && sudo cp -r build/* /var/www/sign-blockcryptology/
```

**Note :** Plus besoin de proxy Node.js - l'API est appelée directement depuis le frontend.

---

## 🔒 Sécurité

### CORS

- ✅ CORS configuré côté backend avec whitelist de domaines
- ✅ Seules les origines autorisées peuvent accéder à l'API
- ✅ Headers CORS corrects retournés par le backend

### Authentification

- ✅ Header `X-Custom-Secret` requis pour toutes les requêtes
- ✅ Token stocké dans `.env` (pas dans le code)
- ✅ Rate limiting côté backend (10 req/s par origine)

### Rate Limiting Frontend

- ✅ 5 appels par minute par adresse (côté frontend)
- ✅ Message d'erreur avec temps d'attente
- ✅ Protection contre les appels excessifs

---

## 📝 Endpoints Utilisés

### POST `/market/v1/brc20/utxos`

Récupère tous les UTXOs pour une adresse.

**Request :**
```json
{
  "address": "bc1p..."
}
```

**Response :**
```json
{
  "success": true,
  "data": [
    {
      "txid": "...",
      "vout": 0,
      "satoshi": 100000,
      "address": "bc1p...",
      "scriptPk": "0014..."
    }
  ]
}
```

### POST `/market/v1/brc20/utxos/{txid}/{vout}/status`

Récupère le statut d'un UTXO spécifique.

**Request :**
```json
{
  "address": "bc1p..."
}
```

**Response :**
```json
{
  "success": true,
  "data": {
    "txid": "...",
    "vout": 0,
    "status": "unspent",
    "isSpent": false
  }
}
```

---

## 🐛 Troubleshooting

### Erreur CORS

**Symptôme :** `Access to fetch at 'https://sdk.txspam.lol/...' has been blocked by CORS policy`

**Solution :** Vérifier que votre domaine est dans la whitelist CORS du backend.

### Erreur 401 Unauthorized

**Symptôme :** `Unauthorized - Invalid X-Custom-Secret header`

**Solution :** Vérifier que `REACT_APP_SECRET_API_TOKEN` est configuré dans `.env`.

### Rate Limit

**Symptôme :** `Rate limit reached`

**Solution :** Attendre le temps indiqué ou augmenter la limite dans `config.ts`.

### UTXOs non affichés

**Vérifications :**
1. L'adresse est-elle valide ?
2. Y a-t-il des UTXOs pour cette adresse ?
3. Vérifier les logs de la console pour les erreurs

---

## 📚 Références

- **API Documentation :** https://sdk.txspam.lol (Swagger)
- **CORS Plan V2 :** `CORS_PLAN_V2_FINAL.md`
- **Service API :** `src/services/txspamApi.ts`
- **Hook React :** `src/hooks/useUtxos.ts`
- **Composant :** `src/components/UtxosListCard.tsx`

---

## ✅ Checklist d'Intégration

- [x] Service API créé (`txspamApi.ts`)
- [x] Hook React créé (`useUtxos.ts`)
- [x] Composant refactorisé (`UtxosListCard.tsx`)
- [x] Configuration mise à jour (`config.ts`)
- [x] Intégration du statut UTXO (spent/unspent)
- [x] Rate limiting implémenté
- [x] Gestion d'erreurs complète
- [x] Script de test créé
- [x] Documentation complète

---

**Document généré le :** 2025-11-08 01:53:22 UTC

**Statut :** ✅ **INTÉGRATION COMPLÈTE TERMINÉE**

