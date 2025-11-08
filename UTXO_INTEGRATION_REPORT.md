# UTXO Management Integration Report
## SDK txspam.lol API - Complete Technical Documentation

**Date:** 2025-11-08  
**Status:** ✅ Production Ready  
**API Base URL:** `https://sdk.txspam.lol`

---

## Table of Contents

1. [API Overview](#api-overview)
2. [Available Data Structures](#available-data-structures)
3. [API Endpoints](#api-endpoints)
4. [Current Implementation](#current-implementation)
5. [Next.js Integration Guide](#nextjs-integration-guide)
6. [Code Examples](#code-examples)
7. [Limitations & Considerations](#limitations--considerations)

---

## API Overview

The SDK txspam.lol API provides UTXO (Unspent Transaction Output) management for Bitcoin addresses, with support for BRC-20 tokens and inscriptions. The API uses a RESTful architecture with JSON responses and requires authentication via a secret token.

### Authentication

All requests require the `X-Custom-Secret` header:

```http
X-Custom-Secret: YOUR_SECRET_TOKEN
Content-Type: application/json
```

### Response Format

The API uses a consistent response format:

```typescript
{
  code: number;        // 0 = success, non-zero = error
  msg: string;         // Human-readable message
  data: any;           // Response payload (structure varies by endpoint)
}
```

---

## Available Data Structures

### 1. Available UTXO Object

**Full structure returned by API:**

```typescript
interface AvailableUtxo {
  txid: string;              // Transaction ID (64 hex characters)
  vout: number;              // Output index (0-based)
  satoshi: number;           // Amount in satoshis
  scriptPk: string;          // Script public key (hex)
  address: string;           // Bitcoin address (bech32/legacy)
  inscriptions: string[];    // Array of inscription IDs (empty if none)
  height: number;            // Block height when UTXO was created
  isSpent: boolean;          // Whether UTXO is spent (always false for available)
  isInscription: boolean;    // Whether UTXO contains an inscription
}
```

**Example from real API call:**

```json
{
  "txid": "7d3feb233c2334dbc1984fc9a9bd9cb0b0e95e9511af66a1f1c6cd97222ae120",
  "vout": 1,
  "satoshi": 885,
  "scriptPk": "51205074d7844eb8a887f1ef5676fe4a2f8df77b5e2804153beae6e38af1bac24527",
  "address": "bc1p2p6d0pzwhz5g0u002em0uj303hmhkh3gqs2nh6hxuw90rwkzg5nsatsphn",
  "inscriptions": [],
  "height": 917389,
  "isSpent": false,
  "isInscription": false
}
```

### 2. Locked UTXO Object

**Minimal structure (critical limitation):**

```typescript
interface LockedUtxo {
  txid: string;    // Transaction ID
  vout: number;    // Output index
  // ⚠️ NOTE: satoshi, scriptPk, address, and other fields are NOT included
}
```

**Example from real API call:**

```json
{
  "txid": "ebd7958afb4d75e3ea74dedba18317f25f558b9c51a06b0be2f86805c23b8f34",
  "vout": 0
}
```

**⚠️ Important:** Locked UTXOs do not include `satoshi` value. To get the full UTXO details, you must:
- Query the status endpoint (which may provide limited info)
- Use an external indexer (mempool.space, blockstream.info)
- Query the blockchain directly

### 3. UTXO Status Object

**Structure returned by status endpoint:**

```typescript
interface UtxoStatusResponse {
  code: number;
  msg: string;
  data: {
    available: boolean;      // true = unspent, false = spent/locked
    reason?: string;          // Explanation if unavailable (e.g., "UTXO is locked by auction...")
  };
}
```

**Example from real API call:**

```json
{
  "code": 0,
  "msg": "UTXO status retrieved successfully",
  "data": {
    "available": false,
    "reason": "UTXO is locked by auction fcf4eb32-92d1-48f5-b6de-c466ba43c877"
  }
}
```

### 4. Complete UTXOs Response

**Structure returned by `/market/v1/brc20/utxos` endpoint:**

```typescript
interface UtxosResponse {
  code: number;
  msg: string;
  data: {
    availableUtxos: AvailableUtxo[];  // Full UTXO objects with all fields
    lockedUtxos: LockedUtxo[];        // Minimal objects (txid + vout only)
  };
}
```

**Real API response example:**

```json
{
  "code": 0,
  "msg": "Address UTXOs retrieved successfully.",
  "data": {
    "availableUtxos": [
      {
        "txid": "7d3feb233c2334dbc1984fc9a9bd9cb0b0e95e9511af66a1f1c6cd97222ae120",
        "vout": 1,
        "satoshi": 885,
        "scriptPk": "51205074d7844eb8a887f1ef5676fe4a2f8df77b5e2804153beae6e38af1bac24527",
        "address": "bc1p2p6d0pzwhz5g0u002em0uj303hmhkh3gqs2nh6hxuw90rwkzg5nsatsphn",
        "inscriptions": [],
        "height": 917389,
        "isSpent": false,
        "isInscription": false
      }
      // ... more available UTXOs
    ],
    "lockedUtxos": [
      {
        "txid": "ebd7958afb4d75e3ea74dedba18317f25f558b9c51a06b0be2f86805c23b8f34",
        "vout": 0
      }
      // ... more locked UTXOs (minimal data)
    ]
  }
}
```

---

## API Endpoints

### 1. Get Address UTXOs

**Endpoint:** `POST /market/v1/brc20/utxos`

**Request:**

```typescript
{
  address: string;  // Bitcoin address (bech32, legacy, or P2SH)
}
```

**Response:** See [Complete UTXOs Response](#4-complete-utxos-response)

**Example:**

```bash
curl -X POST "https://sdk.txspam.lol/market/v1/brc20/utxos" \
  -H "Content-Type: application/json" \
  -H "X-Custom-Secret: YOUR_TOKEN" \
  -d '{"address":"bc1p2p6d0pzwhz5g0u002em0uj303hmhkh3gqs2nh6hxuw90rwkzg5nsatsphn"}'
```

### 2. Get UTXO Status

**Endpoint:** `POST /market/v1/brc20/utxos/{txid}/{vout}/status`

**Request:**

```typescript
{
  address: string;  // Bitcoin address that owns the UTXO
}
```

**Response:** See [UTXO Status Object](#3-utxo-status-object)

**Example:**

```bash
curl -X POST "https://sdk.txspam.lol/market/v1/brc20/utxos/ebd7958afb4d75e3ea74dedba18317f25f558b9c51a06b0be2f86805c23b8f34/0/status" \
  -H "Content-Type: application/json" \
  -H "X-Custom-Secret: YOUR_TOKEN" \
  -d '{"address":"bc1p2p6d0pzwhz5g0u002em0uj303hmhkh3gqs2nh6hxuw90rwkzg5nsatsphn"}'
```

---

## Current Implementation

### Architecture

```
Frontend (React)
    ↓
useUtxos Hook (React Hook)
    ↓
txspamApi Service (API Client)
    ↓
SDK txspam.lol API
```

### File Structure

```
src/
├── services/
│   └── txspamApi.ts          # API client service
├── hooks/
│   └── useUtxos.ts           # React hook for UTXO management
├── components/
│   └── UtxosListCard.tsx     # UI component
└── config.ts                  # Configuration (API URL, tokens)
```

### Key Components

#### 1. API Service (`src/services/txspamApi.ts`)

**Responsibilities:**
- Handle API authentication
- Format requests and parse responses
- Normalize different response formats
- Handle errors and edge cases

**Key Methods:**

```typescript
class TxspamApiClient {
  // Get all UTXOs for an address
  async getUtxos(address: string): Promise<TxspamUtxo[]>
  
  // Get status of a specific UTXO
  async getUtxoStatus(txid: string, vout: number, address: string): Promise<UtxoStatus>
  
  // Batch get status for multiple UTXOs
  async batchGetUtxoStatus(utxos: Array<{txid, vout, address}>): Promise<Map<string, UtxoStatus>>
}
```

**Response Format Handling:**

The service handles the SDK txspam.lol format:

```typescript
// Format: { code: 0, msg: "...", data: { availableUtxos: [...], lockedUtxos: [...] } }
if (rawData.code === 0) {
  const availableUtxos = rawData.data.availableUtxos;  // Full objects
  const lockedUtxos = rawData.data.lockedUtxos;        // Minimal objects
  
  // Normalize locked UTXOs (add missing fields)
  const normalizedLockedUtxos = lockedUtxos.map(utxo => ({
    ...utxo,
    satoshi: utxo.satoshi || 0,  // ⚠️ Default to 0 (missing in API response)
    scriptPk: utxo.scriptPk || '',
    address: utxo.address || address.trim(),
  }));
  
  return [...availableUtxos, ...normalizedLockedUtxos];
}
```

#### 2. React Hook (`src/hooks/useUtxos.ts`)

**Responsibilities:**
- Manage UTXO state
- Handle loading and error states
- Implement rate limiting (5 calls per minute per address)
- Normalize UTXO data
- Provide status fetching capabilities

**Usage:**

```typescript
const {
  utxos,              // Array of UTXOs with status
  loading,            // Loading state
  error,              // Error message
  fetchUtxos,         // Fetch UTXOs for an address
  fetchUtxoStatus,   // Fetch status for a specific UTXO
  refreshUtxos,       // Refresh all UTXOs
  clearError,         // Clear error state
} = useUtxos({
  fetchStatus: false,  // Auto-fetch status on load
  onError: (err) => console.error(err),
});
```

**Rate Limiting:**

```typescript
// Frontend rate limiting: 5 calls per minute per address
const RATE_LIMIT_WINDOW_MS = 60000;  // 1 minute
const RATE_LIMIT_MAX_CALLS = 5;
```

#### 3. UI Component (`src/components/UtxosListCard.tsx`)

**Features:**
- Display available and locked UTXOs separately
- Show UTXO status (Unspent, Spent, Unknown)
- Allow UTXO selection for transaction building
- Display totals for each category
- Handle errors and loading states

---

## Next.js Integration Guide

### Step 1: Install Dependencies

```bash
npm install react react-dom
# or
yarn add react react-dom
```

### Step 2: Create API Service

Create `lib/services/txspamApi.ts`:

```typescript
// lib/services/txspamApi.ts

const SDK_TXSPAM_API_URL = process.env.NEXT_PUBLIC_TXSPAM_API_URL || 'https://sdk.txspam.lol';
const SDK_TXSPAM_SECRET_TOKEN = process.env.NEXT_PUBLIC_SECRET_API_TOKEN || '';

export interface TxspamUtxo {
  txid: string;
  vout: number;
  satoshi: number;
  address: string;
  scriptPk: string;
  inscriptions?: string[];
  height?: number;
  isSpent?: boolean;
  isInscription?: boolean;
}

export interface UtxoStatus {
  txid: string;
  vout: number;
  status: 'unspent' | 'spent' | 'pending';
  isSpent: boolean;
}

class TxspamApiClient {
  private baseUrl: string;
  private secretToken: string;

  constructor(baseUrl: string, secretToken: string) {
    this.baseUrl = baseUrl;
    this.secretToken = secretToken;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.secretToken) {
      headers['X-Custom-Secret'] = this.secretToken;
    }

    return headers;
  }

  async getUtxos(address: string): Promise<TxspamUtxo[]> {
    const response = await fetch(`${this.baseUrl}/market/v1/brc20/utxos`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ address: address.trim() }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const rawData = await response.json();

    // Handle SDK txspam.lol format
    if (rawData.code === 0 && rawData.data) {
      const availableUtxos = rawData.data.availableUtxos || [];
      const lockedUtxos = rawData.data.lockedUtxos || [];

      // Normalize locked UTXOs (they only have txid and vout)
      const normalizedLockedUtxos = lockedUtxos.map((utxo: any) => ({
        txid: utxo.txid,
        vout: utxo.vout,
        satoshi: utxo.satoshi || 0,  // ⚠️ Missing in API response
        scriptPk: utxo.scriptPk || '',
        address: utxo.address || address.trim(),
        inscriptions: utxo.inscriptions || [],
      }));

      return [...availableUtxos, ...normalizedLockedUtxos];
    }

    throw new Error('Invalid response format');
  }

  async getUtxoStatus(txid: string, vout: number, address: string): Promise<UtxoStatus> {
    const response = await fetch(
      `${this.baseUrl}/market/v1/brc20/utxos/${txid}/${vout}/status`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ address: address.trim() }),
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const rawData = await response.json();

    if (rawData.code === 0 && rawData.data) {
      const isAvailable = rawData.data.available === true;
      return {
        txid,
        vout,
        status: isAvailable ? 'unspent' : (rawData.data.reason ? 'pending' : 'spent'),
        isSpent: !isAvailable,
      };
    }

    throw new Error('Invalid response format');
  }
}

export const txspamApi = new TxspamApiClient(SDK_TXSPAM_API_URL, SDK_TXSPAM_SECRET_TOKEN);
```

### Step 3: Create React Hook

Create `hooks/useUtxos.ts`:

```typescript
// hooks/useUtxos.ts

'use client';

import { useState, useCallback } from 'react';
import { txspamApi, TxspamUtxo, UtxoStatus } from '@/lib/services/txspamApi';

export interface UtxoWithStatus extends TxspamUtxo {
  status?: UtxoStatus;
  isSpent?: boolean;
}

export function useUtxos() {
  const [utxos, setUtxos] = useState<UtxoWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUtxos = useCallback(async (address: string) => {
    setLoading(true);
    setError(null);

    try {
      const fetchedUtxos = await txspamApi.getUtxos(address);
      
      // Normalize UTXOs
      const normalizedUtxos: UtxoWithStatus[] = fetchedUtxos.map((utxo) => ({
        ...utxo,
        satoshi: utxo.satoshi || 0,
      }));

      setUtxos(normalizedUtxos);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch UTXOs');
      setUtxos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUtxoStatus = useCallback(async (txid: string, vout: number, address: string) => {
    try {
      const status = await txspamApi.getUtxoStatus(txid, vout, address);
      
      setUtxos((prevUtxos) =>
        prevUtxos.map((utxo) =>
          utxo.txid === txid && utxo.vout === vout
            ? { ...utxo, status, isSpent: status.isSpent }
            : utxo
        )
      );
    } catch (err: any) {
      console.error(`Failed to fetch status for ${txid}:${vout}`, err);
    }
  }, []);

  return {
    utxos,
    loading,
    error,
    fetchUtxos,
    fetchUtxoStatus,
  };
}
```

### Step 4: Create UI Component

Create `components/UtxosList.tsx`:

```typescript
// components/UtxosList.tsx

'use client';

import { useState } from 'react';
import { useUtxos } from '@/hooks/useUtxos';

export function UtxosList() {
  const [address, setAddress] = useState('');
  const { utxos, loading, error, fetchUtxos, fetchUtxoStatus } = useUtxos();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (address.trim()) {
      fetchUtxos(address.trim());
    }
  };

  const availableUtxos = utxos.filter((utxo) => !utxo.isSpent);
  const lockedUtxos = utxos.filter((utxo) => utxo.isSpent === true);

  return (
    <div className="p-4">
      <form onSubmit={handleSubmit} className="mb-4">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter Bitcoin address"
          className="px-4 py-2 border rounded"
        />
        <button
          type="submit"
          disabled={loading}
          className="ml-2 px-4 py-2 bg-blue-500 text-white rounded"
        >
          {loading ? 'Loading...' : 'Load UTXOs'}
        </button>
      </form>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      <div>
        <h2 className="text-xl font-bold mb-2">Available UTXOs ({availableUtxos.length})</h2>
        {availableUtxos.map((utxo, idx) => (
          <div key={idx} className="mb-2 p-2 border rounded">
            <div>
              {utxo.txid}:{utxo.vout} - {utxo.satoshi.toLocaleString()} sats
            </div>
            <button
              onClick={() => fetchUtxoStatus(utxo.txid, utxo.vout, utxo.address)}
              className="text-sm text-blue-500"
            >
              Check Status
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <h2 className="text-xl font-bold mb-2">Locked UTXOs ({lockedUtxos.length})</h2>
        {lockedUtxos.map((utxo, idx) => (
          <div key={idx} className="mb-2 p-2 border rounded">
            {utxo.txid}:{utxo.vout} - {utxo.satoshi.toLocaleString()} sats
            {/* ⚠️ Note: satoshi may be 0 for locked UTXOs */}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Step 5: Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_TXSPAM_API_URL=https://sdk.txspam.lol
NEXT_PUBLIC_SECRET_API_TOKEN=your_secret_token_here
```

**Important:** In Next.js, environment variables exposed to the browser must be prefixed with `NEXT_PUBLIC_`.

### Step 6: Use in Page

```typescript
// app/page.tsx or pages/index.tsx

import { UtxosList } from '@/components/UtxosList';

export default function Home() {
  return (
    <main>
      <h1>UTXO Management</h1>
      <UtxosList />
    </main>
  );
}
```

---

## Code Examples

### Example 1: Fetch UTXOs

```typescript
import { txspamApi } from '@/lib/services/txspamApi';

async function loadUtxos(address: string) {
  try {
    const utxos = await txspamApi.getUtxos(address);
    console.log(`Found ${utxos.length} UTXOs`);
    
    // Available UTXOs have full data
    const available = utxos.filter(u => u.satoshi > 0);
    console.log(`Available: ${available.length}`);
    
    // Locked UTXOs may have satoshi = 0
    const locked = utxos.filter(u => u.satoshi === 0);
    console.log(`Locked: ${locked.length}`);
  } catch (error) {
    console.error('Failed to load UTXOs:', error);
  }
}
```

### Example 2: Check UTXO Status

```typescript
import { txspamApi } from '@/lib/services/txspamApi';

async function checkStatus(txid: string, vout: number, address: string) {
  try {
    const status = await txspamApi.getUtxoStatus(txid, vout, address);
    
    if (status.isSpent) {
      console.log('UTXO is spent');
    } else if (status.status === 'pending') {
      console.log('UTXO is pending (locked)');
    } else {
      console.log('UTXO is unspent');
    }
  } catch (error) {
    console.error('Failed to check status:', error);
  }
}
```

### Example 3: Server-Side Fetching (Next.js API Route)

```typescript
// app/api/utxos/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { txspamApi } from '@/lib/services/txspamApi';

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();
    
    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    const utxos = await txspamApi.getUtxos(address);
    
    return NextResponse.json({ utxos });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

---

## Limitations & Considerations

### 1. Locked UTXOs Missing Data

**Problem:** Locked UTXOs in the API response only include `txid` and `vout`. The `satoshi` value is not provided.

**Impact:**
- Locked UTXOs will display `0 sats` until additional data is fetched
- Cannot calculate accurate totals for locked UTXOs
- Cannot use locked UTXOs for transaction building without additional queries

**Workarounds:**
1. Query status endpoint (may provide limited info)
2. Use external indexer (mempool.space, blockstream.info)
3. Query blockchain directly via RPC

### 2. Rate Limiting

**Current Implementation:**
- Frontend rate limiting: 5 calls per minute per address
- No backend rate limiting information provided

**Recommendations:**
- Implement server-side caching
- Use Next.js API routes to proxy requests (adds server-side caching)
- Monitor API response headers for rate limit information

### 3. Error Handling

**Current Error Format:**

```typescript
{
  code: number;      // Non-zero = error
  msg: string;       // Error message
  data: any;         // May contain error details
}
```

**Example Error:**

```json
{
  "code": 403,
  "message": "Forbidden - Invalid or missing secret token.",
  "data": ""
}
```

### 4. CORS Configuration

The API backend handles CORS with a whitelist. Ensure your domain is whitelisted or use Next.js API routes as a proxy.

### 5. Type Safety

**Current Type Definitions:**

```typescript
// Available UTXO (full data)
interface AvailableUtxo {
  txid: string;
  vout: number;
  satoshi: number;
  scriptPk: string;
  address: string;
  inscriptions: string[];
  height: number;
  isSpent: boolean;
  isInscription: boolean;
}

// Locked UTXO (minimal data)
interface LockedUtxo {
  txid: string;
  vout: number;
  // ⚠️ Other fields missing
}
```

**Recommendation:** Use discriminated unions or separate types for available vs locked UTXOs.

---

## Summary

### Available Data

**From `/market/v1/brc20/utxos` endpoint:**

✅ **Available UTXOs:**
- Full transaction details (txid, vout, satoshi, scriptPk, address)
- Inscription information
- Block height
- Spent status

⚠️ **Locked UTXOs:**
- Only txid and vout
- Missing: satoshi, scriptPk, address, inscriptions, height

**From `/market/v1/brc20/utxos/{txid}/{vout}/status` endpoint:**

✅ **Status Information:**
- Available status (true/false)
- Reason for unavailability (if locked)
- Can determine if UTXO is spent, unspent, or pending

### Integration Checklist

- [x] API service implementation
- [x] Response format handling (code/msg/data)
- [x] Locked UTXO normalization
- [x] Status endpoint integration
- [x] Error handling
- [x] Rate limiting (frontend)
- [ ] Server-side caching (recommended)
- [ ] External indexer fallback for locked UTXO details (optional)

### Next Steps for Production

1. **Implement server-side caching** in Next.js API routes
2. **Add external indexer fallback** for locked UTXO satoshi values
3. **Implement retry logic** for failed requests
4. **Add monitoring** for API errors and rate limits
5. **Consider WebSocket** for real-time UTXO status updates (if API supports)

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-08  
**API Version:** 1.0.0

