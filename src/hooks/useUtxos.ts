/**
 * React Hook for UTXO Management
 * 
 * Custom hook pour gérer les UTXOs avec l'API SDK txspam.lol
 */

import { useState, useCallback, useRef } from 'react';
import { txspamApi, TxspamUtxo, UtxoStatus, isValidBitcoinAddress } from '../services/txspamApi';
import { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_CALLS } from '../config';

// ========== Types ==========

export interface UtxoWithStatus extends TxspamUtxo {
  status?: UtxoStatus;
  isSpent?: boolean;
  isLocked?: boolean;  // Market-locked UTXO
}

export interface UseUtxosOptions {
  autoFetch?: boolean;
  fetchStatus?: boolean;
  onError?: (error: Error) => void;
}

export interface UseUtxosReturn {
  utxos: UtxoWithStatus[];
  loading: boolean;
  error: string | null;
  fetchUtxos: (address: string) => Promise<void>;
  fetchUtxoStatus: (txid: string, vout: number, address: string) => Promise<void>;
  refreshUtxos: () => Promise<void>;
  clearError: () => void;
  currentAddress: string | null;
}

// ========== Rate Limiting ==========

const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(address: string): boolean {
  const now = Date.now();
  const addressKey = address.trim().toLowerCase();
  const timestamps = rateLimitMap.get(addressKey) || [];
  const recentTimestamps = timestamps.filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  if (recentTimestamps.length >= RATE_LIMIT_MAX_CALLS) {
    return false;
  }

  recentTimestamps.push(now);
  rateLimitMap.set(addressKey, recentTimestamps);
  return true;
}

function getTimeUntilNextCall(address: string): number {
  const now = Date.now();
  const addressKey = address.trim().toLowerCase();
  const timestamps = rateLimitMap.get(addressKey) || [];

  if (timestamps.length === 0) return 0;

  const recentTimestamps = timestamps
    .filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS)
    .sort((a, b) => a - b);

  if (recentTimestamps.length < RATE_LIMIT_MAX_CALLS) return 0;

  const oldestTimestamp = recentTimestamps[0];
  const timeUntilExpiry = RATE_LIMIT_WINDOW_MS - (now - oldestTimestamp);
  return Math.max(0, Math.ceil(timeUntilExpiry / 1000));
}

// ========== Hook ==========

export function useUtxos(options: UseUtxosOptions = {}): UseUtxosReturn {
  const { fetchStatus = false, onError } = options;
  // Note: autoFetch is reserved for future use

  const [utxos, setUtxos] = useState<UtxoWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentAddressRef = useRef<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchUtxos = useCallback(
    async (address: string) => {
      // Validation
      if (!address || !address.trim()) {
        setError('Please enter a Bitcoin address');
        return;
      }

      if (!isValidBitcoinAddress(address)) {
        setError('Invalid Bitcoin address format');
        return;
      }

      // Rate limiting
      if (!checkRateLimit(address)) {
        const secondsUntilNext = getTimeUntilNextCall(address);
        setError(
          `Rate limit reached. Please wait ${secondsUntilNext} second(s) before trying again.`
        );
        return;
      }

      setLoading(true);
      setError(null);
      currentAddressRef.current = address.trim();

      try {
        const fetchedUtxos = await txspamApi.getUtxos(address.trim());

        // Normalize UTXOs to ensure all required properties are present
        let utxosWithStatus: UtxoWithStatus[] = fetchedUtxos.map((utxo, index) => {
          // Ensure satoshi/value is always a number
          const satoshi = typeof utxo.satoshi === 'number' && !isNaN(utxo.satoshi) 
            ? utxo.satoshi 
            : typeof (utxo as any).value === 'number' && !isNaN((utxo as any).value)
            ? (utxo as any).value
            : 0;
          
          // Ensure txid and vout are strings/numbers
          const txid = utxo.txid || (utxo as any).txId || '';
          const vout = typeof utxo.vout === 'number' && !isNaN(utxo.vout)
            ? utxo.vout 
            : typeof (utxo as any).vout === 'string' 
            ? parseInt((utxo as any).vout, 10) 
            : typeof (utxo as any).vOut === 'number'
            ? (utxo as any).vOut
            : 0;
          
          // Log if satoshi is missing for debugging
          if (satoshi === 0 && (utxo.satoshi === undefined || utxo.satoshi === null)) {
            console.warn(`[useUtxos] UTXO ${index} missing satoshi value:`, utxo);
          }
          
          return {
            txid,
            vout,
            satoshi,
            address: utxo.address || address.trim(),
            scriptPk: utxo.scriptPk || (utxo as any).scriptPk || '',
          };
        });

        if (fetchStatus && fetchedUtxos.length > 0) {
          // Fetch status for all UTXOs
          const statusPromises = fetchedUtxos.map((utxo) =>
            txspamApi
              .getUtxoStatus(utxo.txid, utxo.vout, address.trim())
              .then((status) => ({ outpoint: `${utxo.txid}:${utxo.vout}`, status }))
              .catch((err) => {
                console.warn(`Failed to fetch status for ${utxo.txid}:${utxo.vout}`, err);
                return null;
              })
          );

          const statusResults = await Promise.all(statusPromises);
          const statusMap = new Map(
            statusResults
              .filter((r): r is { outpoint: string; status: UtxoStatus } => r !== null)
              .map((r) => [r.outpoint, r.status])
          );

          utxosWithStatus = fetchedUtxos.map((utxo) => {
            const outpoint = `${utxo.txid}:${utxo.vout}`;
            const status = statusMap.get(outpoint);
            return {
              ...utxo,
              status,
              isSpent: status?.isSpent ?? false,
              isLocked: status?.isLocked ?? false,
            };
          });
        }

        setUtxos(utxosWithStatus);
      } catch (err: any) {
        console.error('[useUtxos] Error in fetchUtxos:', err);
        const errorMessage = err?.message || err?.toString() || 'Failed to fetch UTXOs';
        
        // Add more context to error message
        let detailedError = errorMessage;
        if (err?.status) {
          detailedError = `${errorMessage} (HTTP ${err.status})`;
        }
        if (err?.details?.error) {
          detailedError = err.details.error;
        }
        
        setError(detailedError);
        setUtxos([]);
        onError?.(err);
      } finally {
        setLoading(false);
      }
    },
    [fetchStatus, onError]
  );

  const fetchUtxoStatus = useCallback(
    async (txid: string, vout: number, address: string) => {
      if (!currentAddressRef.current) {
        setError('No address loaded. Please fetch UTXOs first.');
        return;
      }

      try {
        const status = await txspamApi.getUtxoStatus(txid, vout, address);

        setUtxos((prevUtxos) =>
          prevUtxos.map((utxo) => {
            if (utxo.txid === txid && utxo.vout === vout) {
              return {
                ...utxo,
                status,
                isSpent: status.isSpent,
                isLocked: status.isLocked,
              };
            }
            return utxo;
          })
        );
      } catch (err: any) {
        const errorMessage = err?.message || err?.toString() || 'Failed to fetch UTXO status';
        setError(errorMessage);
        onError?.(err);
      }
    },
    [onError]
  );

  const refreshUtxos = useCallback(async () => {
    if (currentAddressRef.current) {
      await fetchUtxos(currentAddressRef.current);
    }
  }, [fetchUtxos]);

  return {
    utxos,
    loading,
    error,
    fetchUtxos,
    fetchUtxoStatus,
    refreshUtxos,
    clearError,
    currentAddress: currentAddressRef.current,
  };
}

