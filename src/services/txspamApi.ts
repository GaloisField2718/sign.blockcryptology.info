/**
 * SDK txspam.lol API Service
 * 
 * Service pour interagir avec l'API SDK txspam.lol
 * Documentation: https://sdk.txspam.lol (Swagger)
 */

import { SDK_TXSPAM_API_URL, SDK_TXSPAM_SECRET_TOKEN } from '../config';

// ========== Types & Interfaces ==========

export interface TxspamUtxo {
  txid: string;
  vout: number;
  satoshi: number;
  address: string;
  scriptPk: string;
}

export interface UtxoStatus {
  txid: string;
  vout: number;
  status: 'unspent' | 'spent' | 'pending' | 'locked';
  isSpent: boolean;
  isLocked?: boolean;  // Market-locked UTXO
}

export interface GetUtxosRequest {
  address: string;
}

export interface GetUtxosResponse {
  success: boolean;
  data: TxspamUtxo[];
  error?: string;
}

export interface GetUtxoStatusRequest {
  address: string;
}

export interface GetUtxoStatusResponse {
  success: boolean;
  data: UtxoStatus;
  error?: string;
}

export interface ApiError {
  success: false;
  error: string;
  code?: number;
}

// ========== API Client ==========

class TxspamApiClient {
  private baseUrl: string;
  private secretToken: string;

  constructor(baseUrl: string, secretToken: string) {
    this.baseUrl = baseUrl;
    this.secretToken = secretToken;
  }

  /**
   * Get default headers for API requests
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };

    // Add secret token if available
    if (this.secretToken) {
      headers['X-Custom-Secret'] = this.secretToken;
      console.log('[txspamApi] Using secret token:', this.secretToken.substring(0, 10) + '...');
    } else {
      console.warn('[txspamApi] ⚠️ No secret token configured - requests may fail with 401');
    }

    return headers;
  }

  /**
   * Handle API response and errors
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    // Clone response to read body multiple times if needed
    const responseClone = response.clone();
    
    if (!response.ok) {
      let errorMessage = `API error: ${response.status} ${response.statusText}`;
      let errorDetails: any = null;
      
      try {
        const errorData = await responseClone.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
        errorDetails = errorData;
      } catch (e) {
        // If response is not JSON, try to get text
        try {
          const text = await responseClone.text();
          console.error('API Error Response (non-JSON):', text);
        } catch {
          // Ignore
        }
      }

      const error = new Error(errorMessage) as any;
      error.status = response.status;
      error.statusText = response.statusText;
      error.details = errorDetails;
      throw error;
    }

    try {
      const data = await response.json();
      return data;
    } catch (e) {
      console.error('Failed to parse JSON response:', e);
      throw new Error(`Invalid JSON response from API: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Get UTXOs for an address
   * 
   * @param address Bitcoin address
   * @returns List of UTXOs
   */
  async getUtxos(address: string): Promise<TxspamUtxo[]> {
    if (!address || !address.trim()) {
      throw new Error('Address is required');
    }

    const url = `${this.baseUrl}/market/v1/brc20/utxos`;
    const requestBody = { address: address.trim() } as GetUtxosRequest;
    
    console.log('[txspamApi] Fetching UTXOs:', { url, address: address.trim() });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      });

      console.log('[txspamApi] Response status:', response.status, response.statusText);
      console.log('[txspamApi] Response headers:', Object.fromEntries(response.headers.entries()));

      const rawData = await this.handleResponse<any>(response);

      console.log('[txspamApi] Raw response data:', rawData);
      console.log('[txspamApi] Response type:', Array.isArray(rawData) ? 'Array' : typeof rawData);
      console.log('[txspamApi] Response keys:', rawData ? Object.keys(rawData) : 'null/undefined');

      // Handle different response formats
      let utxos: TxspamUtxo[] = [];

      // Format 1: Direct array response
      if (Array.isArray(rawData)) {
        console.log('[txspamApi] Response is direct array, length:', rawData.length);
        utxos = rawData;
      }
      // Format 2: SDK txspam.lol format { code: 0, msg: "...", data: { availableUtxos: [...], lockedUtxos: [...] } }
      else if (rawData && typeof rawData === 'object' && rawData.code !== undefined) {
        // code: 0 = success, other codes = error
        if (rawData.code !== 0) {
          const errorMsg = rawData.msg || rawData.error || `API error (code: ${rawData.code})`;
          console.error('[txspamApi] API returned error code:', rawData.code, errorMsg);
          throw new Error(errorMsg);
        }

        // Extract UTXOs from data object
        if (rawData.data && typeof rawData.data === 'object') {
          const availableUtxos = Array.isArray(rawData.data.availableUtxos) ? rawData.data.availableUtxos : [];
          const lockedUtxos = Array.isArray(rawData.data.lockedUtxos) ? rawData.data.lockedUtxos : [];
          
          console.log('[txspamApi] Extracted UTXOs:', {
            available: availableUtxos.length,
            locked: lockedUtxos.length,
            total: availableUtxos.length + lockedUtxos.length
          });

          // IMPORTANT: lockedUtxos only have txid and vout, no satoshi!
          // We need to normalize them to have all required properties
          // The satoshi value will need to be fetched separately or from status endpoint
          const normalizedLockedUtxos = lockedUtxos.map((utxo: any) => ({
            txid: utxo.txid,
            vout: utxo.vout,
            satoshi: utxo.satoshi || 0, // Will be updated when status/details are fetched
            scriptPk: utxo.scriptPk || '',
            address: utxo.address || address.trim(),
            inscriptions: utxo.inscriptions || [],
            isSpent: false, // Locked UTXOs are not spent, just locked
          }));

          // Combine both arrays
          utxos = [...availableUtxos, ...normalizedLockedUtxos];
        } else {
          console.error('[txspamApi] Invalid data structure in response:', rawData);
          throw new Error('Invalid data structure in API response');
        }
      }
      // Format 3: Wrapped response { success: true, data: [...] }
      else if (rawData && typeof rawData === 'object') {
        if (rawData.success === true && Array.isArray(rawData.data)) {
          console.log('[txspamApi] Response has success=true wrapper, data length:', rawData.data.length);
          utxos = rawData.data;
        }
        // Format 4: Error response { success: false, error: "..." }
        else if (rawData.success === false) {
          const errorMsg = rawData.error || 'Failed to fetch UTXOs';
          console.error('[txspamApi] API returned success=false:', errorMsg);
          throw new Error(errorMsg);
        }
        // Format 5: Try to extract from common property names
        else if (Array.isArray(rawData.data)) {
          console.log('[txspamApi] Found array in data property, length:', rawData.data.length);
          utxos = rawData.data;
        } else if (Array.isArray(rawData.utxos)) {
          console.log('[txspamApi] Found array in utxos property, length:', rawData.utxos.length);
          utxos = rawData.utxos;
        } else if (Array.isArray(rawData.results)) {
          console.log('[txspamApi] Found array in results property, length:', rawData.results.length);
          utxos = rawData.results;
        } else {
          console.error('[txspamApi] Cannot extract UTXOs from response:', rawData);
          throw new Error('Invalid response format from API');
        }
      }
      // Format 6: Unexpected format
      else {
        console.error('[txspamApi] Unexpected response format:', rawData);
        throw new Error('Invalid response format from API');
      }

      // Validate and return
      if (!Array.isArray(utxos)) {
        console.warn('[txspamApi] Extracted data is not an array:', utxos);
        return [];
      }

      console.log('[txspamApi] Successfully extracted', utxos.length, 'UTXOs');
      return utxos;
    } catch (error: any) {
      console.error('[txspamApi] Error fetching UTXOs:', {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        details: error.details,
      });
      throw error;
    }
  }

  /**
   * Get status of a specific UTXO
   * 
   * @param txid Transaction ID
   * @param vout Output index
   * @param address Bitcoin address that owns the UTXO
   * @returns UTXO status
   */
  async getUtxoStatus(
    txid: string,
    vout: number,
    address: string
  ): Promise<UtxoStatus> {
    if (!txid || !address || vout === undefined) {
      throw new Error('txid, vout, and address are required');
    }

    const url = `${this.baseUrl}/market/v1/brc20/utxos/${txid}/${vout}/status`;
    const requestBody = { address: address.trim() } as GetUtxoStatusRequest;
    
    console.log('[txspamApi] Fetching UTXO status:', { url, txid, vout, address: address.trim() });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      });

      console.log('[txspamApi] Status response status:', response.status, response.statusText);

      const rawData = await this.handleResponse<any>(response);

      console.log('[txspamApi] Status raw response data:', rawData);

      // Handle SDK txspam.lol format { code: 0, msg: "...", data: { available: true/false, reason?: "..." } }
      if (rawData && typeof rawData === 'object' && rawData.code !== undefined) {
        // code: 0 = success, other codes = error
        if (rawData.code !== 0) {
          const errorMsg = rawData.msg || rawData.message || rawData.error || `API error (code: ${rawData.code})`;
          console.error('[txspamApi] API returned error code:', rawData.code, errorMsg);
          throw new Error(errorMsg);
        }

        // Extract status from data object
        if (rawData.data && typeof rawData.data === 'object') {
          console.log('[txspamApi] Extracted status data:', rawData.data);
          
          // Map the response to UtxoStatus format
          // available: true = unspent, available: false = spent/locked
          const isAvailable = rawData.data.available === true;
          const reason = rawData.data.reason || '';
          const isMarketLocked = reason.includes('locked') || reason.includes('auction');
          
          const status: UtxoStatus = {
            txid: txid,
            vout: vout,
            status: isAvailable ? 'unspent' : (isMarketLocked ? 'locked' : (reason ? 'pending' : 'spent')),
            isSpent: !isAvailable && !isMarketLocked,  // Locked UTXOs are not spent
            isLocked: isMarketLocked,
          };

          return status;
        } else {
          console.error('[txspamApi] Invalid data structure in status response:', rawData);
          throw new Error('Invalid data structure in API status response');
        }
      }
      // Handle legacy format { success: true, data: {...} }
      else if (rawData && typeof rawData === 'object' && rawData.success === true) {
        if (rawData.data) {
          return rawData.data as UtxoStatus;
        } else {
          throw new Error('Missing data in status response');
        }
      }
      // Handle direct status object
      else if (rawData && typeof rawData === 'object' && rawData.status !== undefined) {
        return rawData as UtxoStatus;
      }
      // Unexpected format
      else {
        console.error('[txspamApi] Unexpected status response format:', rawData);
        throw new Error('Invalid response format from status API');
      }
    } catch (error: any) {
      console.error('[txspamApi] Error fetching UTXO status:', {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        details: error.details,
      });
      throw error;
    }
  }

  /**
   * Batch get status for multiple UTXOs
   * 
   * @param utxos Array of {txid, vout, address}
   * @returns Map of outpoint -> status
   */
  async batchGetUtxoStatus(
    utxos: Array<{ txid: string; vout: number; address: string }>
  ): Promise<Map<string, UtxoStatus>> {
    const statusMap = new Map<string, UtxoStatus>();

    // Execute requests in parallel (with reasonable concurrency)
    const batchSize = 10;
    for (let i = 0; i < utxos.length; i += batchSize) {
      const batch = utxos.slice(i, i + batchSize);
      const promises = batch.map((utxo) =>
        this.getUtxoStatus(utxo.txid, utxo.vout, utxo.address)
          .then((status) => {
            const outpoint = `${utxo.txid}:${utxo.vout}`;
            statusMap.set(outpoint, status);
          })
          .catch((error) => {
            console.warn(`Failed to get status for ${utxo.txid}:${utxo.vout}`, error);
          })
      );

      await Promise.all(promises);
    }

    return statusMap;
  }
}

// ========== Singleton Instance ==========

export const txspamApi = new TxspamApiClient(
  SDK_TXSPAM_API_URL,
  SDK_TXSPAM_SECRET_TOKEN
);

// ========== Utility Functions ==========

/**
 * Format outpoint string from txid and vout
 */
export function formatOutpoint(txid: string, vout: number): string {
  return `${txid}:${vout}`;
}

/**
 * Parse outpoint string to txid and vout
 */
export function parseOutpoint(outpoint: string): { txid: string; vout: number } {
  const [txid, voutStr] = outpoint.split(':');
  const vout = parseInt(voutStr || '0', 10);
  return { txid: txid || '', vout };
}

/**
 * Check if an address format is valid
 */
export function isValidBitcoinAddress(address: string): boolean {
  const bitcoinAddressRegex = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/;
  return bitcoinAddressRegex.test(address.trim());
}

