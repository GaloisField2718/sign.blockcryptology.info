import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface SelectedUtxo {
  outpoint: string; // Format: "txid:vout"
  value: number; // Satoshis
  address: string; // Bitcoin address
}

interface UtxoSelectionContextType {
  selectedUtxos: SelectedUtxo[];
  addUtxo: (utxo: SelectedUtxo) => void;
  removeUtxo: (outpoint: string) => void;
  clearUtxos: () => void;
  isUtxoSelected: (outpoint: string) => boolean;
  toggleUtxo: (utxo: SelectedUtxo) => void;
}

const UtxoSelectionContext = createContext<UtxoSelectionContextType | undefined>(undefined);

export function UtxoSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedUtxos, setSelectedUtxos] = useState<SelectedUtxo[]>([]);

  const addUtxo = (utxo: SelectedUtxo) => {
    setSelectedUtxos((prev) => {
      if (prev.some((u) => u.outpoint === utxo.outpoint)) {
        return prev; // Already selected
      }
      return [...prev, utxo];
    });
  };

  const removeUtxo = (outpoint: string) => {
    setSelectedUtxos((prev) => prev.filter((u) => u.outpoint !== outpoint));
  };

  const clearUtxos = () => {
    setSelectedUtxos([]);
  };

  const isUtxoSelected = (outpoint: string) => {
    return selectedUtxos.some((u) => u.outpoint === outpoint);
  };

  const toggleUtxo = (utxo: SelectedUtxo) => {
    if (isUtxoSelected(utxo.outpoint)) {
      removeUtxo(utxo.outpoint);
    } else {
      addUtxo(utxo);
    }
  };

  return (
    <UtxoSelectionContext.Provider
      value={{
        selectedUtxos,
        addUtxo,
        removeUtxo,
        clearUtxos,
        isUtxoSelected,
        toggleUtxo,
      }}
    >
      {children}
    </UtxoSelectionContext.Provider>
  );
}

export function useUtxoSelection() {
  const context = useContext(UtxoSelectionContext);
  if (context === undefined) {
    throw new Error('useUtxoSelection must be used within a UtxoSelectionProvider');
  }
  return context;
}



