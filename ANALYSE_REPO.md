# Analyse Détaillée du Repository Unisat Web3 Demo

## Phase 1 : Vue d'Ensemble Générale

### Nature du Projet
Ce repository est une **application de démonstration** (`unisat-web3-demo`) conçue pour tester et présenter les fonctionnalités de l'API **Unisat Wallet**, un wallet Bitcoin fonctionnant comme extension de navigateur. L'application sert de **playground interactif** pour les développeurs souhaitant intégrer Unisat Wallet dans leurs applications Web3 Bitcoin.

### Objectif Principal
L'application permet de tester en temps réel toutes les méthodes principales de l'API Unisat Wallet :
- Envoi de Bitcoin, inscriptions et runes
- Signature de messages (ECDSA et BIP322-simple)
- Création, signature et broadcast de transactions Bitcoin via PSBTs
- Gestion multi-signatures

---

## Phase 2 : Stack Technique & Architecture

### Stack Frontend

#### Framework & Runtime
- **React 18.2.0** (via Create React App)
- **TypeScript 4.9.5** avec configuration stricte
- **React Scripts 5.0.1** (pas de Vite, configuration Webpack via CRA)
- **Build Tool** : Webpack (via react-scripts, non exposé)

#### Gestion de l'État
- **État Local React** uniquement (pas de Zustand/Redux)
  - Utilisation intensive de `useState` et `useRef` dans `App.tsx`
  - Gestion de l'état du wallet (connexion, comptes, balance, réseau) directement dans le composant principal
  - Pattern : état centralisé dans `App.tsx`, passé via props implicites (pas de Context API visible)

#### Styling & UI
- **Ant Design 5.2.3** (antd) comme bibliothèque de composants UI complète
- **CSS Modules** : `App.css` et `index.css` pour le styling global
- Design responsive avec media queries pour mobile/tablette
- Utilisation de composants Ant Design : `Card`, `Button`, `Input`, `Radio`, `Collapse`, `Space`, `Divider`, `message`

#### Qualité & Tooling
- **TypeScript** : Configuration stricte (`strict: true`)
- **ESLint** : Configuration react-app/react-app/jest
- **Tests** : Framework de test configuré (`@testing-library/react`, `@testing-library/jest-dom`)
- **Gestion des dépendances** : Yarn (présence de `yarn.lock`)

### Stack Web3 & Bitcoin

#### Intégration Wallet
- **SDK Unisat Wallet** : Accès via l'objet global `window.unisat`
- **Pattern de Connexion** :
  - Détection automatique de l'extension (`checkUnisat()` avec polling)
  - Écoute des événements wallet : `accountsChanged`, `networkChanged`, `chainChanged`
  - Méthodes principales utilisées :
    - `unisat.requestAccounts()` : Connexion
    - `unisat.getAccounts()` : Récupération des comptes
    - `unisat.getPublicKey()` : Clé publique
    - `unisat.getBalance()` / `unisat.getBalanceV2()` : Solde (v1 legacy, v2 avec available/unavailable)
    - `unisat.getNetwork()` : Réseau (legacy)
    - `unisat.getChain()` : Chaîne active (nouveau standard)
    - `unisat.switchChain()` / `unisat.switchNetwork()` : Changement de réseau/chaîne
    - `unisat.disconnect()` : Déconnexion

#### Protocole Bitcoin & PSBT
- **Pas de bibliothèque Bitcoin explicite** dans `package.json` (pas de `bitcoinjs-lib`, `bip32`, etc.)
- **Manipulation PSBT** : Déléguée entièrement à Unisat Wallet
  - Les PSBTs sont manipulés uniquement sous forme hexadécimale (string)
  - Aucune construction de transaction côté client
  - Le wallet gère la construction, la signature et le broadcast

#### Communication Blockchain
- **Pas d'appels directs à des indexers** (pas de fetch vers mempool.space, API Ordinals)
- **Communication 100% via Unisat Wallet** :
  - Les méthodes `sendBitcoin`, `sendInscription`, `sendRunes` gèrent la construction complète de la transaction
  - `pushPsbt` et `pushTx` permettent le broadcast après signature
- **Endpoints configurés** dans `const.ts` mais non utilisés directement :
  - `wallet-api.unisat.io` (mainnet)
  - `wallet-api-testnet.unisat.io` (testnet)
  - URLs mempool.space et ordinals.com pour référence seulement

### Architecture & Patterns Applicatifs

#### Structure du Projet
```
src/
├── App.tsx              # Composant principal (état wallet + UI)
├── components/          # Composants fonctionnels isolés
│   ├── SignPsbtCard.tsx
│   ├── SignPsbtsCard.tsx
│   ├── PushPsbtCard.tsx
│   ├── SendBitcoinCard.tsx
│   ├── SendInscriptionCard.tsx
│   ├── SendRunesCard.tsx
│   ├── InscribeTransferCard.tsx
│   ├── SignMessageCard.tsx
│   └── MultiSignMessageCard.tsx
├── const.ts             # Configuration des chaînes Bitcoin
├── utils.ts             # Utilitaires (conversion satoshis/BTC, clipboard)
└── index.tsx            # Point d'entrée React
```

#### Gestion des États Asynchrones
- **Pattern simple** : Chaque composant gère son propre état de chargement/erreur/résultat
- **Pas de gestion d'erreur centralisée** : Chaque appel API gère ses propres `try/catch`
- **Feedback utilisateur** : Utilisation de `message` (Ant Design) pour les notifications

#### Patterns Clés
1. **Composants Fonctionnels Purs** : Chaque carte (`Card`) est un composant fonctionnel isolé
2. **Pas d'Abstraction Wallet** : Appels directs à `window.unisat` dans chaque composant
3. **État Local Minimal** : Chaque composant maintient uniquement l'état nécessaire à sa fonction
4. **Pas de Hooks Métier** : Pas de hooks dédiés (`usePsbtBuilder`, `useWallet`, etc.)

#### Flux de Données
**Exemple : Signature d'un PSBT unique**
```
SignPsbtCard.tsx
  └─> User saisit psbtHex (string)
  └─> Clic sur "Submit"
  └─> Appel direct : await window.unisat.signPsbt(psbtHex)
  └─> Wallet affiche modal de confirmation
  └─> Résultat : psbtHex signé (string)
  └─> Affichage du résultat dans le composant
```

**Exemple : Signature multiple de PSBTs**
```
SignPsbtsCard.tsx
  └─> User saisit plusieurs psbtHex + options (actuellement {} vide)
  └─> Clic sur "Sign All PSBTs"
  └─> Appel : await window.unisat.signPsbts(psbtHexs[], options[])
  └─> Wallet traite en batch
  └─> Résultat : tableau de psbtHex signés
  └─> Affichage de tous les résultats
```

---

## Phase 3 : Analyse Détaillée des PSBTs

### Composants PSBT Identifiés

#### 1. `SignPsbtCard.tsx` - Signature d'un PSBT Unique

**Fonctionnalité** :
- Permet de signer un seul PSBT fourni en hexadécimal
- Interface simple : un champ texte pour le PSBT hex, un bouton submit

**Méthode API utilisée** :
```typescript
await window.unisat.signPsbt(psbtHex: string)
```

**Paramètres** :
- `psbtHex` : String hexadécimale du PSBT à signer
- **Pas d'options** : La méthode est appelée sans second paramètre

**Comportement** :
- Le wallet Unisat affiche une modal de confirmation
- L'utilisateur peut examiner la transaction avant de signer
- Retourne le PSBT signé (hex) si succès
- Lance une exception si l'utilisateur refuse ou en cas d'erreur

**État géré** :
- `psbtHex` : Valeur du champ texte
- `result` : `{ success: boolean, error: string, data: string }`

---

#### 2. `SignPsbtsCard.tsx` - Signature Multiple de PSBTs

**Fonctionnalité** :
- Permet de signer plusieurs PSBTs en une seule interaction utilisateur
- Interface dynamique : ajout/suppression de PSBTs
- Support d'options par PSBT (mais actuellement non configurées dans l'UI)

**Méthode API utilisée** :
```typescript
await window.unisat.signPsbts(
  psbtHexs: string[],
  options: object[]
)
```

**Paramètres** :
- `psbtHexs` : Tableau de strings hexadécimales des PSBTs
- `options` : Tableau d'objets d'options (un par PSBT)

**État géré** :
```typescript
const [psbts, setPsbts] = useState([
  { psbtHex: '', options: {} },
  { psbtHex: '', options: {} },
]);
```

**Problème Identifié** :
- ❌ **Les options ne sont jamais modifiées par l'utilisateur**
- ❌ **L'interface ne permet pas de configurer les options**
- ❌ **Tous les PSBTs utilisent `options: {}` (objet vide)**
- ⚠️ **Les options sont transmises au wallet mais restent vides**

**Comportement Attendu** :
- Le wallet devrait afficher une modal batch pour signer tous les PSBTs
- L'utilisateur peut examiner chaque transaction
- Signature atomique : tous signés ou aucun
- Retourne un tableau de PSBTs signés dans le même ordre

**Documentation Référencée** :
- Lien vers : `https://docs.unisat.io/dev/unisat-developer-center/unisat-wallet#signpsbts`

---

#### 3. `PushPsbtCard.tsx` - Broadcast d'un PSBT Signé

**Fonctionnalité** :
- Permet de diffuser un PSBT déjà signé sur le réseau Bitcoin
- Le PSBT doit être complètement signé et finalisé

**Méthode API utilisée** :
```typescript
await window.unisat.pushPsbt(psbtHex: string)
```

**Paramètres** :
- `psbtHex` : String hexadécimale du PSBT signé et finalisé

**Comportement** :
- Le wallet finalise le PSBT (si nécessaire)
- Broadcast de la transaction sur le réseau Bitcoin
- Retourne le `txid` de la transaction diffusée
- Lance une exception si le broadcast échoue

**État géré** :
- `psbtHex` : Valeur du champ texte
- `result` : `{ success: boolean, error: string, data: string }` (data = txid)

**Note** : La documentation référencée pointe vers `#pushtx` mais le composant utilise `pushPsbt`.

---

### Options PSBT - Analyse Critique

#### État Actuel des Options

**Dans `SignPsbtCard.tsx`** :
- ❌ **Aucune option supportée**
- La méthode `signPsbt` est appelée avec un seul paramètre

**Dans `SignPsbtsCard.tsx`** :
- ⚠️ **Options déclarées mais non configurées**
- Structure : `{ psbtHex: '', options: {} }`
- Options transmises : tableau d'objets vides `[]`
- Aucune interface utilisateur pour modifier les options

#### Options Potentielles (Basées sur les Standards PSBT)

Les options PSBT typiques dans les wallets Bitcoin incluent :

1. **`autoFinalize`** (boolean)
   - Détermine si le wallet doit finaliser automatiquement le PSBT après signature
   - Valeur par défaut probable : `false`

2. **`toSignInputs`** (array)
   - Indique quels inputs doivent être signés par ce wallet
   - Format attendu : `[{ index: number, publicKey?: string, sighashTypes?: number[] }]`
   - Utile pour les transactions multi-signatures

3. **`signingOptions`** (object)
   - Options de signature (SIGHASH flags)
   - `sighashType` : Type de signature (SIGHASH_ALL, SIGHASH_SINGLE, etc.)

4. **`rbf`** (boolean)
   - Replace-By-Fee : permet de remplacer la transaction par une autre avec des frais plus élevés
   - Valeur par défaut : dépend du wallet

5. **`disableChangePosition`** (boolean)
   - Empêche le wallet de modifier la position de la sortie de change

**Hypothèse** : Les options sont probablement définies dans la documentation Unisat mais ne sont pas implémentées dans cette démo.

---

## Phase 4 : Points d'Attention pour Modifications & Déploiement

### Problèmes Identifiés

#### 1. Gestion des Options PSBT Incomplète
- **Impact** : Les développeurs ne peuvent pas tester les options avancées de signature
- **Risque** : Limitations dans les cas d'usage complexes (multi-sig, SIGHASH personnalisés)
- **Recommandation** : Ajouter une interface pour configurer les options dans `SignPsbtsCard`

#### 2. Pas de Validation des PSBTs
- **Impact** : L'application accepte n'importe quelle string comme PSBT hex
- **Risque** : Erreurs utilisateur non détectées avant l'appel au wallet
- **Recommandation** : Ajouter une validation basique du format hex avant soumission

#### 3. Gestion d'Erreur Basique
- **Impact** : Les erreurs sont affichées mais pas catégorisées
- **Risque** : Expérience utilisateur sous-optimale
- **Recommandation** : Créer un système de gestion d'erreur avec messages contextuels

#### 4. Pas de Construction de PSBT Côté Client
- **Impact** : L'application ne démontre pas comment construire un PSBT
- **Risque** : Les développeurs doivent apprendre ailleurs comment créer des PSBTs
- **Recommandation** : Ajouter un composant `CreatePsbtCard` utilisant `bitcoinjs-lib`

#### 5. Documentation Incomplète
- **Impact** : Pas de README détaillé expliquant les fonctionnalités
- **Risque** : Difficulté pour les nouveaux développeurs
- **Recommandation** : Améliorer le README avec exemples d'utilisation

### Points Forts

✅ **Architecture Simple et Claire** : Structure facile à comprendre et modifier
✅ **Isolation des Composants** : Chaque fonctionnalité est isolée dans son propre composant
✅ **TypeScript Strict** : Typage fort pour éviter les erreurs
✅ **UI Moderne** : Interface Ant Design professionnelle et responsive
✅ **Support Multi-Chaînes** : Configuration pour mainnet, testnet, signet, fractal

---

## Phase 5 : Recommandations pour Améliorations

### Priorité Haute

1. **Implémenter la Configuration des Options PSBT**
   - Ajouter une section dans `SignPsbtsCard` pour configurer les options
   - Exemples : checkbox pour `autoFinalize`, input pour `toSignInputs`
   - Validation des options avant soumission

2. **Ajouter la Validation des PSBTs**
   - Fonction utilitaire pour valider le format hex
   - Vérification de la structure basique du PSBT (optionnel, nécessite décodage)

3. **Améliorer la Gestion d'Erreur**
   - Catégorisation des erreurs (réseau, signature refusée, PSBT invalide)
   - Messages d'erreur contextuels et actionnables

### Priorité Moyenne

4. **Ajouter un Composant de Construction de PSBT**
   - Intégrer `bitcoinjs-lib` pour construire des PSBTs côté client
   - Interface pour définir inputs/outputs, frais, etc.
   - Export du PSBT en hex pour utilisation dans les autres composants

5. **Documentation Complète**
   - README avec exemples d'utilisation
   - Documentation des options PSBT supportées
   - Guide de déploiement

### Priorité Basse

6. **Tests Automatisés**
   - Tests unitaires pour les utilitaires (`utils.ts`)
   - Tests d'intégration pour les composants (mock de `window.unisat`)

7. **Amélioration UX**
   - Loading states plus visibles
   - Historique des transactions signées
   - Export/import de PSBTs (fichiers)

---

---

## Phase 6 : Compréhension Holistique Approfondie

### Détails d'Implémentation Critiques

#### Détection de l'Extension Unisat

**Pattern de Polling** (`App.tsx:147-182`) :
```typescript
for (let i = 1; i < 10 && !unisat; i += 1) {
  await new Promise((resolve) => setTimeout(resolve, 100 * i));
  unisat = (window as any).unisat;
}
```

**Analyse** :
- Polling progressif : délais croissants (100ms, 200ms, 300ms... jusqu'à 900ms)
- Maximum 9 tentatives avant abandon
- **Point critique** : Si l'extension n'est pas détectée, l'app affiche un bouton d'installation
- **Vulnérabilité potentielle** : Pas de mécanisme de re-détection si l'extension est installée après le chargement initial

#### Gestion des Événements Wallet

**Événements Écoutés** :
1. `accountsChanged` : Déclenché quand l'utilisateur change de compte dans le wallet
2. `networkChanged` : Déclenché quand le réseau change (livenet/testnet) - **LEGACY**
3. `chainChanged` : Déclenché quand la chaîne change (nouveau standard, remplace networkChanged)

**Pattern de Nettoyage** :
- Utilisation de `removeListener` dans le cleanup du `useEffect`
- **Bon point** : Prévention des fuites mémoire

**Logique de Prévention de Double Déclenchement** :
```typescript
const selfRef = useRef<{ accounts: string[] }>({ accounts: [] });
if (self.accounts[0] === _accounts[0]) {
  return; // prevent from triggering twice
}
```
- **Raison** : Les événements peuvent se déclencher plusieurs fois
- **Vulnérabilité** : Ne vérifie que le premier compte, ne gère pas les multi-comptes

#### Balance V1 vs V2

**Balance V1 (Legacy)** :
```typescript
{ confirmed: number, unconfirmed: number, total: number }
```
- Structure classique Bitcoin
- Affichée mais pas utilisée dans l'UI principale

**Balance V2 (Actuel)** :
```typescript
{ available: number, unavailable: number, total: number }
```
- Structure optimisée pour les inscriptions/runes
- `unavailable` = fonds verrouillés dans des inscriptions non transférables
- **Utilisée dans l'affichage principal**

**Pattern** : Les deux sont récupérées en parallèle, seules les erreurs sont loggées (pas d'interruption)

#### Gestion des Erreurs - Patterns Hétérogènes

**Pattern 1 : App.tsx - Gestion Silencieuse**
```typescript
try {
  const accounts = await unisat.getAccounts();
  setAccounts(accounts);
} catch (e) {
  console.log('getAccounts error', e); // Log seulement, pas d'affichage utilisateur
}
```
- **Raison** : `getBasicInfo()` récupère plusieurs infos, une erreur sur une ne doit pas bloquer les autres
- **Inconvénient** : L'utilisateur ne sait pas si certaines infos sont manquantes

**Pattern 2 : Composants - Affichage Inline**
```typescript
try {
  const txid = await unisat.sendBitcoin(toAddress, satoshis);
  setResult({ success: true, error: "", data: txid });
} catch (e) {
  setResult({ success: false, error: (e as any).message, data: "" });
}
```
- Erreur affichée dans le composant même
- **Limitation** : Pas de catégorisation (réseau, signature refusée, etc.)

**Pattern 3 : SignPsbtsCard / MultiSignMessageCard - Double Feedback**
```typescript
try {
  const signatures = await unisat.signPsbts(psbtHexs, options);
  setResults(signatures);
  message.success('All PSBTs signed successfully!'); // Notification Ant Design
} catch (e) {
  setError((e as any).message);
  message.error('Failed to sign PSBTs'); // Notification + état local
}
```
- **Meilleur pattern** : Feedback immédiat (notification) + état persistant (affichage dans le composant)

#### Typage TypeScript - Faiblesses

**Usage de `(window as any).unisat`** :
- ❌ Perte complète du typage pour l'API Unisat
- ❌ Pas d'autocomplétion IDE
- ❌ Pas de vérification de types à la compilation
- **Risque** : Erreurs de runtime non détectées

**Recommandation** : Créer une interface TypeScript pour l'API Unisat :
```typescript
interface UnisatWallet {
  requestAccounts(): Promise<string[]>;
  signPsbt(psbtHex: string, options?: SignPsbtOptions): Promise<string>;
  signPsbts(psbtHexs: string[], options?: SignPsbtOptions[]): Promise<string[]>;
  // ... etc
}
```

#### Gestion du Réseau Legacy vs Nouveau Standard

**Problème Identifié** (`App.tsx:325-349`) :
- Support des réseaux legacy (`livenet`, `testnet`) via `getNetwork()`
- Mais message d'avertissement : "unisat.getNetwork is legacy. Please use unisat.getChain instead"
- **Incohérence** : L'app utilise encore `getNetwork()` tout en affichant cet avertissement

**Logique de Switch** :
- `switchNetwork()` pour legacy
- `switchChain()` pour nouveau standard
- **Risque de confusion** : Deux méthodes pour faire la même chose selon le contexte

#### Structure des Composants - Détails Subtils

**Composants avec Loading State** :
- ✅ `SignPsbtsCard` : `loading` state + `disabled` sur le bouton
- ✅ `MultiSignMessageCard` : `loading` state + `disabled` sur le bouton
- ❌ **Autres composants** : Pas de loading state, seulement "Requesting..." dans le message d'erreur

**Composants avec Validation** :
- ✅ `SignPsbtsCard` : `disabled={psbts.some((psbt) => !psbt.psbtHex)}`
- ✅ `MultiSignMessageCard` : `disabled={messages.some((msg) => !msg.text)}`
- ❌ **Autres composants** : Aucune validation avant soumission

**Pattern de Documentation** :
- Tous les composants incluent un lien vers la documentation Unisat
- Format : `https://docs.unisat.io/dev/unisat-developer-center/unisat-wallet#[method]`
- **Bon point** : Référence externe toujours accessible

#### Patterns de State Management

**État Centralisé dans App.tsx** :
- Wallet info (accounts, balance, network, chain)
- **Non partagé** : Chaque composant fonctionne indépendamment
- **Conséquence** : Pas de synchronisation entre composants

**État Local par Composant** :
- Chaque composant maintient son propre état de résultat
- **Avantage** : Isolation complète
- **Inconvénient** : Pas de partage de données entre composants (ex: PSBT signé dans SignPsbtCard ne peut pas être directement utilisé dans PushPsbtCard)

#### Utilitaires - Détails d'Implémentation

**`satoshisToAmount()`** (`utils.ts:3-6`) :
- Utilise `bignumber.js` pour la précision
- Conversion : `val / 100000000` (8 décimales)
- **Format** : `.toFixed(8)` - toujours 8 décimales

**`amountToSatoshis()`** (`utils.ts:8-11`) :
- Conversion inverse
- **Retourne** : `number` (risque de perte de précision pour très grandes valeurs)

**`copyToClipboard()`** (`utils.ts:13-31`) :
- Fallback pour navigateurs non-secure context
- Utilise `document.execCommand('copy')` si `navigator.clipboard` indisponible
- **Bon point** : Compatibilité large

#### Configuration des Chaînes - Détails

**Structure TypeChain** (`const.ts:15-25`) :
- `enum` : Identifiant unique
- `label` : Nom affiché
- `icon` : Chemin vers l'icône (non vérifié si existe)
- `unit` : Unité monétaire (BTC, tBTC, sBTC, FB, tFB)
- `networkType` : MAINNET ou TESTNET
- `endpoints` : URLs API (non utilisées dans l'app)
- `mempoolSpaceUrl` : URL de l'explorateur (non utilisée)
- `unisatUrl` : URL du wallet (non utilisée)
- `ordinalsUrl` : URL de l'explorateur Ordinals (non utilisée)

**Chaînes Supportées** :
1. BITCOIN_MAINNET (BTC)
2. BITCOIN_TESTNET (tBTC)
3. BITCOIN_TESTNET4 (tBTC) - Beta
4. BITCOIN_SIGNET (sBTC)
5. FRACTAL_BITCOIN_MAINNET (FB)
6. FRACTAL_BITCOIN_TESTNET (tFB)

**Pattern de Sélection** :
- Radio buttons pour choisir la chaîne
- Changement via `switchChain()` qui retourne la nouvelle chaîne
- **Erreur gérée** : `messageApi.error()` si échec

#### Points d'Architecture Subtils

**Collapse Component** (`App.tsx:399-406`) :
- Tous les composants fonctionnels sont dans un `Collapse` (accordéon)
- `defaultActiveKey={[]}` : Tout fermé par défaut
- `onChange={() => { // todo }}` : **TODO non implémenté**
- **Raison** : Permet d'organiser beaucoup de fonctionnalités sans surcharger l'UI

**Responsive Design** :
- Media queries dans `App.css` pour mobile/tablette
- Flexbox pour layout adaptatif
- **Bon point** : Design mobile-first

**CSS Global** (`index.css`) :
- Override de styles Ant Design pour word-wrap
- Support du copy/paste de longs hex strings
- **Détail important** : `word-break: break-all` sur les liens pour éviter débordement

---

## Conclusion

Ce repository est une **application de démonstration fonctionnelle** mais **basique** pour tester l'API Unisat Wallet. L'architecture est simple et claire, ce qui facilite les modifications futures. Cependant, **les fonctionnalités PSBT avancées (options) ne sont pas complètement exploitées**, notamment dans `SignPsbtsCard` où les options sont déclarées mais jamais configurées.

### Modèle Mental Complet du Projet

**Architecture Globale** :
- Application React monolithique avec état local
- Pas de routing (SPA simple)
- Pas de state management externe
- Communication 100% via `window.unisat` (pas de backend)

**Flux Principal** :
1. Détection extension → 2. Connexion wallet → 3. Affichage info → 4. Sélection fonction → 5. Interaction wallet → 6. Affichage résultat

**Points Critiques pour Modifications** :
- Les PSBTs sont toujours des strings hex (pas d'objets)
- Les options PSBT existent dans la structure mais ne sont pas configurables
- Pas de validation des entrées utilisateur (sauf 2 composants)
- Gestion d'erreur hétérogène (patterns différents selon composants)
- Typage TypeScript incomplet (`window as any`)

**Pour des modifications et déploiements futurs**, il sera essentiel de :
1. Implémenter la configuration des options PSBT
2. Ajouter la validation des entrées utilisateur
3. Améliorer la gestion d'erreur (standardiser)
4. Créer des types TypeScript pour l'API Unisat
5. Documenter les fonctionnalités et les options disponibles

L'application est prête pour des améliorations incrémentales sans nécessiter de refonte majeure de l'architecture. **La simplicité de l'architecture actuelle facilite les modifications**, mais nécessite une attention particulière aux détails d'implémentation pour éviter les régressions.

