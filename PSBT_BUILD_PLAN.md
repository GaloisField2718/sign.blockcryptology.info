# Plan d'Intégration PSBT avec Sélection d'UTXOs

**Date :** 2025-11-08  
**Statut :** 📋 Plan d'Architecture  
**Objectif :** Intégrer la création de PSBT avec sélection manuelle d'UTXOs et outputs personnalisés

---

## Phase 1 : Accusé de Réception et Plan d'Analyse

### Contexte de la Demande

L'utilisateur souhaite intégrer la création de PSBT (Partially Signed Bitcoin Transaction) avec :
1. **Sélection manuelle d'UTXOs** depuis `UtxosListCard`
2. **Spécification des outputs** (comme dans `SendBitcoinCard.tsx`)
3. **Signature avec le wallet** (Unisat)
4. **Expérience utilisateur optimale** respectant l'ambiance de l'application

### Fichiers à Analyser

**Fichiers Structurels :**
- `package.json` - Dépendances (bitcoinjs-lib déjà présent)
- `src/App.tsx` - Structure de l'application et navigation
- `src/const.ts` - Configuration réseau (mainnet/testnet)

**Fichiers de Contexte & État :**
- `src/contexts/UtxoSelectionContext.tsx` - Gestion de la sélection d'UTXOs
- `src/hooks/useUtxos.ts` - Hook pour récupérer les UTXOs

**Fichiers de Composants Existants :**
- `src/components/SendBitcoinCard.tsx` - Interface pour outputs multiples
- `src/components/SignPsbtCard.tsx` - Signature de PSBT existant
- `src/components/DecodePsbtTxCard.tsx` - Décodage PSBT (utilise bitcoinjs-lib)
- `src/components/UtxosListCard.tsx` - Liste et sélection d'UTXOs

**Fichiers Utilitaires :**
- `src/utils.ts` - Fonctions utilitaires (satoshisToAmount, etc.)

Je vais maintenant procéder à une lecture complète pour internaliser le stack technique, l'architecture d'interaction blockchain et la logique applicative.

---

## Phase 2 : Lecture et Synthèse du Contexte

### Stack Frontend & Compétences Adaptées

**Framework & Runtime :**
- **React 18.2.0** avec TypeScript
- **Ant Design 5.2.3** pour l'UI (Cards, Inputs, Buttons, Alerts, Tags, etc.)
- **react-app-rewired** pour la configuration personnalisée

**Gestion de l'État :**
- **React Context API** (`UtxoSelectionContext`) pour la sélection d'UTXOs globale
- **React Hooks** (`useState`, `useCallback`, `useEffect`) pour l'état local
- Pas de Zustand/Redux - architecture simple avec Context

**Styling & UI :**
- **Ant Design** comme bibliothèque de composants principale
- **CSS personnalisé** (`App.css`) pour les effets fluorescents et animations
- Style cohérent avec cartes orange/fluorescentes

**Qualité & Tooling :**
- **TypeScript 4.9.5** pour le typage
- **ESLint** avec config react-app
- **bitcoinjs-lib 6.1.5** déjà installé ✅

### Stack Web3 & Bitcoin

**Intégration Wallet :**
- **Unisat Wallet SDK** via `window.unisat`
- Méthodes disponibles :
  - `unisat.signPsbt(psbtHex, options)` - Signature PSBT
  - `unisat.pushPsbt(psbtHex)` - Finalisation et broadcast
  - `unisat.getAccounts()` - Adresses connectées
  - `unisat.getNetwork()` - Réseau actif (livenet/testnet)

**Protocole Bitcoin & PSBT :**
- **bitcoinjs-lib 6.1.5** disponible pour la construction de PSBT
- **Décodage PSBT** déjà implémenté dans `DecodePsbtTxCard.tsx`
- Format PSBT : hex ou base64
- Support des différents types d'adresses (P2PKH, P2SH, P2WPKH, P2WSH, Taproot)

**Communication Blockchain :**
- **SDK txspam.lol API** pour récupérer les UTXOs avec détails complets
- **UtxoSelectionContext** pour partager la sélection entre composants
- Pas d'appels directs aux indexers pour les frais (à implémenter)

### Architecture & Patterns Applicatifs

**Structure du Projet :**
```
src/
├── components/          # Composants UI
│   ├── UtxosListCard.tsx      # Sélection d'UTXOs ✅
│   ├── SendBitcoinCard.tsx    # Outputs multiples ✅
│   ├── SignPsbtCard.tsx       # Signature PSBT ✅
│   └── DecodePsbtTxCard.tsx   # Décodage PSBT ✅
├── contexts/           # Contextes React
│   └── UtxoSelectionContext.tsx  # Sélection globale ✅
├── hooks/              # Hooks personnalisés
│   └── useUtxos.ts            # Gestion UTXOs ✅
├── services/           # Services API
│   └── txspamApi.ts           # API UTXOs ✅
└── utils.ts            # Utilitaires
```

**Gestion des États Asynchrones :**
- Pattern standard React avec `useState` et `useCallback`
- Gestion d'erreurs avec `Alert` d'Ant Design
- Loading states avec `Spin` et `loading` props

**Patterns Clés Identifiés :**
1. **Card-based UI** : Chaque fonctionnalité dans une `Card` Ant Design
2. **Context pour état global** : `UtxoSelectionContext` pour partager les UTXOs sélectionnés
3. **Validation avant soumission** : Vérification des champs avant appel API
4. **Feedback utilisateur** : Alerts de succès/erreur, loading states

**Flux de Données Actuel :**
```
UtxosListCard
  └─> useUtxos() → txspamApi.getUtxos()
  └─> toggleUtxo() → UtxoSelectionContext
  └─> selectedUtxos disponibles globalement

SendBitcoinCard
  └─> useUtxoSelection() → Affiche selectedUtxos (informatif seulement)
  └─> unisat.sendBitcoin() → Wallet gère TOUT automatiquement
  └─> ⚠️ Le wallet ignore la sélection et choisit ses propres UTXOs

SignPsbtCard
  └─> User entre psbtHex
  └─> unisat.signPsbt(psbtHex, options)
  └─> Retourne PSBT signé
```

**⚠️ Problème Identifié :**
- `SendBitcoinCard` affiche les UTXOs sélectionnés mais **ne les utilise pas réellement**
- `unisat.sendBitcoin()` délègue la sélection d'UTXOs au wallet
- **Pas de contrôle utilisateur** sur quels UTXOs sont utilisés

**Flux Cible (Nouveau) :**
```
UtxosListCard
  └─> Sélection d'UTXOs → UtxoSelectionContext

CreatePsbtCard (NOUVEAU)
  └─> useUtxoSelection() → Récupère selectedUtxos
  └─> ✅ VALIDATION: Si aucun UTXO sélectionné → Message + lien vers UtxosListCard
  └─> User spécifie outputs (comme SendBitcoinCard)
  └─> Calcul frais automatique (1 sat/vB)
  └─> bitcoinjs-lib → Construit PSBT avec UTXOs sélectionnés EXACTEMENT
  └─> Aperçu PSBT (décodage) → Vérification avant signature
  └─> unisat.signPsbt(psbtHex) → Signature uniquement (wallet a les clés)
  └─> Optionnel: unisat.pushPsbt(psbtHex) → Broadcast
```

**✅ Valeur Ajoutée de CreatePsbtCard :**
1. **Contrôle Total sur les UTXOs** : Utilise EXACTEMENT les UTXOs sélectionnés (pas de sélection automatique par le wallet)
2. **Cas d'Usage Avancés** :
   - UTXOs spécifiques (inscriptions, runes)
   - Éviter certains UTXOs (locked, inscriptions)
   - Transactions multi-signatures
   - OP_RETURN personnalisés
   - RBF (Replace-By-Fee) avec contrôle
3. **Transparence** : Aperçu complet avant signature (inputs/outputs/frais)
4. **Flexibilité** : Modification du PSBT avant signature si nécessaire

---

## Phase 3 : Diagnostic et Exploration des Hypothèses

### Reformulation du Problème

**Objectif :** Créer un composant permettant de :
1. **✅ OBLIGATOIRE** : Utiliser les UTXOs sélectionnés depuis `UtxosListCard` (pas de sélection automatique)
2. Spécifier les outputs (adresses + montants) comme dans `SendBitcoinCard`
3. Calculer automatiquement les frais de transaction (1 sat/vB par défaut)
4. Construire un PSBT avec `bitcoinjs-lib` en utilisant **EXACTEMENT** les UTXOs sélectionnés
5. Afficher un aperçu du PSBT avant signature (transparence totale)
6. Permettre la signature via `unisat.signPsbt()` (wallet signe mais n'a pas choisi les UTXOs)
7. Optionnellement broadcaster via `unisat.pushPsbt()`

**⚠️ Différence Clé avec SendBitcoinCard :**
- `SendBitcoinCard` : Wallet choisit les UTXOs automatiquement (pas de contrôle)
- `CreatePsbtCard` : **UTILISATEUR choisit les UTXOs** (contrôle total)

### Questions Critiques

1. **Calcul des Frais :**
   - Quelle source utiliser pour les frais ? (mempool.space API, estimation fixe, user input)
   - Quelle stratégie de frais ? (sat/vB, total en sats)
   - Gérer le change automatiquement ?

2. **Gestion du Change :**
   - Créer automatiquement une sortie de change vers l'adresse source ?
   - Comment déterminer l'adresse de change ? (première adresse connectée ?)

3. **Validation des UTXOs :**
   - Vérifier que les UTXOs sélectionnés sont suffisants ?
   - Gérer les UTXOs avec inscriptions (non dépensables) ?

4. **Réseau Bitcoin :**
   - Comment déterminer le réseau (mainnet/testnet) pour `bitcoinjs-lib` ?
   - Utiliser `unisat.getNetwork()` ou `chainType` depuis `App.tsx` ?

5. **Script Public Keys :**
   - Les UTXOs ont `scriptPk` dans la réponse API
   - Comment obtenir les clés publiques pour signer ? (via wallet uniquement)

### Approches Possibles

#### **Approche A : Composant Autonome "Create PSBT"**

**Principe :**
- Créer un nouveau composant `CreatePsbtCard.tsx`
- Interface similaire à `SendBitcoinCard` pour les outputs
- Intégration avec `UtxoSelectionContext` pour les UTXOs
- Construction PSBT avec `bitcoinjs-lib`
- Workflow : Select UTXOs → Define Outputs → Build PSBT → Preview → Sign → Broadcast

**Avantages :**
- ✅ Séparation claire des responsabilités
- ✅ Réutilisable indépendamment
- ✅ Workflow guidé étape par étape
- ✅ Facile à tester

**Inconvénients :**
- ⚠️ Duplication de code avec `SendBitcoinCard` (outputs)
- ⚠️ Nécessite une nouvelle entrée dans le menu

#### **Approche B : Amélioration de SendBitcoinCard avec Mode PSBT**

**Principe :**
- Ajouter un toggle "Use PSBT Mode" dans `SendBitcoinCard`
- Si activé : construire PSBT avec UTXOs sélectionnés
- Si désactivé : comportement actuel (`unisat.sendBitcoin`)

**Avantages :**
- ✅ Pas de duplication de code
- ✅ Interface familière pour l'utilisateur
- ✅ Transition douce entre les deux modes

**Inconvénients :**
- ⚠️ Composant plus complexe
- ⚠️ Logique conditionnelle peut devenir confuse
- ⚠️ Moins flexible pour des cas d'usage avancés

#### **Approche C : Workflow Multi-Étapes avec Stepper**

**Principe :**
- Créer un composant avec `Steps` d'Ant Design
- Étape 1 : Sélection UTXOs (lien vers UtxosListCard)
- Étape 2 : Définition Outputs
- Étape 3 : Calcul Frais & Aperçu
- Étape 4 : Signature & Broadcast

**Avantages :**
- ✅ UX très guidée et claire
- ✅ Validation à chaque étape
- ✅ Aperçu avant signature
- ✅ Expérience utilisateur professionnelle

**Inconvénients :**
- ⚠️ Plus complexe à implémenter
- ⚠️ Peut être trop guidé pour des utilisateurs avancés

---

## Phase 4 : Recommandation et Justification

### Analyse des Compromis

| Critère | Approche A | Approche B | Approche C |
|---------|------------|------------|------------|
| **Sécurité** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Maintenabilité** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Testabilité** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **UX Simplicité** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Flexibilité** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Cohérence Architecture** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

### Recommandation : Approche A + Éléments de C

**Choix Final :** **Approche A (Composant Autonome)** avec des éléments d'UX de l'Approche C

**Justification :**

1. **Respect de l'Architecture Actuelle :**
   - L'application utilise déjà un pattern de composants autonomes (`SignPsbtCard`, `SendBitcoinCard`, etc.)
   - Chaque fonctionnalité dans sa propre Card
   - Cohérent avec la structure existante

2. **Séparation des Responsabilités :**
   - `SendBitcoinCard` reste simple (délègue au wallet)
   - `CreatePsbtCard` gère la construction manuelle avec contrôle total
   - Pas de logique conditionnelle complexe

3. **Flexibilité et Extensibilité :**
   - Facile d'ajouter des fonctionnalités avancées (OP_RETURN, RBF, etc.)
   - Peut évoluer indépendamment
   - Testable unitairement

4. **UX Optimale :**
   - Interface claire dédiée à la création PSBT
   - Aperçu avant signature (réutilise `DecodePsbtTxCard` ou logique similaire)
   - Feedback visuel à chaque étape

5. **Réutilisation du Code Existant :**
   - Réutilise `UtxoSelectionContext` pour les UTXOs
   - Réutilise la logique d'outputs de `SendBitcoinCard`
   - Réutilise `bitcoinjs-lib` déjà utilisé dans `DecodePsbtTxCard`

### Architecture Recommandée

```
CreatePsbtCard.tsx
├── Section 1: Selected UTXOs Summary (OBLIGATOIRE)
│   └─> useUtxoSelection() → Récupère selectedUtxos
│   └─> ✅ Si UTXOs sélectionnés → Affiche liste + totaux
│   └─> ⚠️ Si AUCUN UTXO → ALERTE + Bouton "Go to UTXOs List"
│   └─> ⚠️ Si AUCUN UTXO → Désactiver toutes les autres sections
│
├── Section 2: Outputs Definition (DÉSACTIVÉE si aucun UTXO)
│   └─> Réutilise la logique de SendBitcoinCard
│   └─> Add/Remove outputs dynamiquement
│   └─> ⚠️ Disabled si selectedUtxos.length === 0
│
├── Section 3: Fee Configuration (DÉSACTIVÉE si aucun UTXO)
│   └─> Estimation automatique (1 sat/vB par défaut)
│   └─> Option manuelle pour override
│   └─> ⚠️ Disabled si selectedUtxos.length === 0
│
├── Section 4: PSBT Preview (VISIBLE seulement après Build)
│   └─> Affiche inputs (UTXOs sélectionnés)
│   └─> Affiche outputs (user-defined + change)
│   └─> Affiche frais calculés
│
└── Section 5: Actions (DÉSACTIVÉES si aucun UTXO)
    ├── Build PSBT → Génère psbtHex (disabled si aucun UTXO)
    ├── Sign PSBT → unisat.signPsbt() (disabled si pas de PSBT)
    └── Broadcast → unisat.pushPsbt() (disabled si pas signé)
```

**⚠️ Règle Critique :**
- **Sans sélection d'UTXOs, le composant est INUTILE**
- **Message clair :** "Please select UTXOs first to build a PSBT"
- **Alternative suggérée :** "Or use Send Bitcoin for automatic UTXO selection"

---

## Phase 5 : Implémentation Détaillée

### Étape 1 : Créer le Service de Construction PSBT

**Fichier :** `src/services/psbtBuilder.ts`

**Responsabilités :**
- Construire PSBT avec `bitcoinjs-lib`
- Gérer les différents types d'adresses
- Calculer les frais
- Gérer le change automatiquement

**Dépendances :**
- `bitcoinjs-lib` (déjà installé)
- `UtxoSelectionContext` pour les UTXOs
- Configuration réseau depuis `const.ts`

### Étape 2 : Créer le Hook usePsbtBuilder

**Fichier :** `src/hooks/usePsbtBuilder.ts`

**Responsabilités :**
- Gérer l'état de construction PSBT
- Valider les inputs (UTXOs, outputs)
- Calculer les frais
- Construire le PSBT via le service
- Gérer les erreurs

### Étape 3 : Créer le Composant CreatePsbtCard

**Fichier :** `src/components/CreatePsbtCard.tsx`

**Interface :**
- Section UTXOs sélectionnés (avec lien vers UtxosListCard)
- Section Outputs (comme SendBitcoinCard)
- Section Frais (estimation + override)
- Section Aperçu PSBT
- Boutons : Build → Sign → Broadcast

### Étape 4 : Intégrer dans App.tsx

**Modification :**
- Ajouter `CreatePsbtCard` dans le Collapse
- Positionner après `UtxosListCard` pour workflow naturel

### Détails Techniques

#### 1. Calcul des Frais

**Stratégie Recommandée :**
- Utiliser une estimation fixe par défaut : **1 sat/vB** (minimum économique)
- Permettre override manuel
- Option future : intégrer mempool.space API

**Formule :**
```
fee = (estimatedSize * feeRate) + dustThreshold
estimatedSize = baseSize + (inputs * inputSize) + (outputs * outputSize)
```

#### 2. Gestion du Change

**Logique :**
- Calculer total inputs (UTXOs sélectionnés)
- Calculer total outputs (user-defined)
- Si inputs > outputs + fees → créer change output vers adresse source
- Si inputs < outputs + fees → erreur (fond insuffisant)

#### 3. Construction PSBT avec bitcoinjs-lib

**Workflow :**
```typescript
import { Psbt } from 'bitcoinjs-lib';
import * as bitcoin from 'bitcoinjs-lib';

// 1. Créer PSBT avec réseau approprié
const network = getNetworkFromChainType(chainType);
const psbt = new Psbt({ network });

// 2. Ajouter inputs (UTXOs sélectionnés)
selectedUtxos.forEach(utxo => {
  psbt.addInput({
    hash: utxo.txid,
    index: utxo.vout,
    // Note: scriptPk nécessaire pour Taproot, sinon optionnel
  });
});

// 3. Ajouter outputs
outputs.forEach(output => {
  psbt.addOutput({
    address: output.address,
    value: parseInt(output.amount),
  });
});

// 4. Ajouter change output si nécessaire
if (changeAmount > 0) {
  psbt.addOutput({
    address: sourceAddress,
    value: changeAmount,
  });
}

// 5. Convertir en hex
const psbtHex = psbt.toHex();
```

#### 4. Intégration avec Wallet

**Signature :**
```typescript
const signedPsbt = await unisat.signPsbt(psbtHex, {
  autoFinalize: false, // Laisser l'utilisateur choisir
  broadcast: false,     // Séparer signature et broadcast
});
```

**Broadcast :**
```typescript
const txid = await unisat.pushPsbt(signedPsbt);
```

### UX Flow Recommandé

```
┌─────────────────────────────────────┐
│  Step 1: Select UTXOs               │
│  └─> Go to UtxosListCard            │
│  └─> Select available UTXOs        │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  Step 2: Define Outputs              │
│  └─> Add recipient addresses        │
│  └─> Specify amounts                │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  Step 3: Review & Build              │
│  └─> Show selected UTXOs summary    │
│  └─> Show outputs summary            │
│  └─> Show estimated fees             │
│  └─> Show change (if any)            │
│  └─> [Build PSBT] button            │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  Step 4: Preview PSBT                │
│  └─> Decode PSBT (réutilise logique)│
│  └─> Show inputs/outputs            │
│  └─> [Sign PSBT] button             │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  Step 5: Sign & Broadcast           │
│  └─> Wallet modal (Unisat)          │
│  └─> User confirms                  │
│  └─> [Broadcast] button (optional)  │
└─────────────────────────────────────┘
```

### Points d'Attention

1. **Script Public Keys :**
   - Les UTXOs ont `scriptPk` dans la réponse API
   - Pour Taproot, besoin de `internalPubkey` (non disponible)
   - **Solution :** Laisser le wallet gérer la signature (il a les clés)

2. **Réseau Bitcoin :**
   - Détecter depuis `unisat.getNetwork()` ou `chainType`
   - Mapper vers `bitcoin.networks.bitcoin` ou `bitcoin.networks.testnet`

3. **Validation :**
   - Vérifier UTXOs suffisants avant construction
   - Vérifier adresses valides
   - Vérifier montants positifs
   - Vérifier fonds suffisants (inputs >= outputs + fees)

4. **Gestion d'Erreurs :**
   - UTXOs insuffisants
   - Adresse invalide
   - PSBT invalide
   - Erreur wallet (refus, réseau, etc.)

---

## Plan d'Implémentation Séquentiel

### Phase 1 : Infrastructure (Services & Hooks)

1. **Créer `src/services/psbtBuilder.ts`**
   - Fonction `buildPsbt(selectedUtxos, outputs, feeRate, network)`
   - Gestion des différents types d'adresses
   - Calcul automatique du change

2. **Créer `src/hooks/usePsbtBuilder.ts`**
   - État : `psbtHex`, `loading`, `error`, `preview`
   - Fonctions : `buildPsbt()`, `validateInputs()`, `calculateFees()`

### Phase 2 : Composant UI

3. **Créer `src/components/CreatePsbtCard.tsx`**
   - Section UTXOs (réutilise `useUtxoSelection`)
   - Section Outputs (réutilise logique `SendBitcoinCard`)
   - Section Frais
   - Section Aperçu
   - Actions (Build, Sign, Broadcast)

### Phase 3 : Intégration

4. **Modifier `src/App.tsx`**
   - Ajouter `CreatePsbtCard` dans le Collapse
   - Positionner logiquement (après UtxosListCard)

5. **Tests & Validation**
   - Tester avec UTXOs réels
   - Valider calculs de frais
   - Valider construction PSBT
   - Tester signature et broadcast

---

## Considérations UX Spécifiques

### 1. Feedback Visuel

- **UTXOs sélectionnés** : Afficher avec totaux (comme SendBitcoinCard)
- **Outputs** : Format familier (comme SendBitcoinCard)
- **Frais** : Affichage clair (1 sat/vB par défaut + total en sats)
- **Change** : Afficher si généré automatiquement
- **Aperçu PSBT** : Réutiliser le style de `DecodePsbtTxCard`

### 2. Validation Progressive

- Valider UTXOs avant de permettre outputs
- Valider outputs avant de permettre build
- Valider PSBT avant de permettre signature
- Messages d'erreur contextuels à chaque étape

### 3. Workflow Guidé

- **⚠️ CRITIQUE** : Si aucun UTXO sélectionné → **Bloquer l'utilisation** + Message clair + lien vers UtxosListCard
  - Le composant n'a **AUCUN INTÉRÊT** sans sélection d'UTXOs
  - Si pas de sélection → Utiliser `SendBitcoinCard` à la place
- Si fonds insuffisants → Calculer et afficher le manquant
- Si PSBT invalide → Message d'erreur détaillé

### 4. Cohérence Visuelle

- Utiliser les mêmes styles que `SendBitcoinCard`
- Utiliser les mêmes composants Ant Design
- Respecter l'ambiance orange/fluorescente de l'app

---

## Prochaines Étapes

1. ✅ **Validation du Plan** - Attendre approbation utilisateur
2. ⏳ **Implémentation Phase 1** - Services & Hooks
3. ⏳ **Implémentation Phase 2** - Composant UI
4. ⏳ **Implémentation Phase 3** - Intégration
5. ⏳ **Tests & Ajustements** - Validation complète

---

**Document généré le :** 2025-11-08  
**Version :** 1.0  
**Statut :** 📋 En attente d'approbation

