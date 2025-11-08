import * as bitcoin from "bitcoinjs-lib";
import { Psbt, initEccLib } from "bitcoinjs-lib";
import * as secp256k1 from "@bitcoinerlab/secp256k1";
import { ChainType } from "../const";

// Initialize ECC library for bitcoinjs-lib v6 (required for Taproot support)
// @bitcoinerlab/secp256k1 is a wrapper for @noble/secp256k1 compatible with bitcoinjs-lib
initEccLib(secp256k1);

export interface UtxoInput {
  txid: string;
  vout: number;
  value: number; // Satoshis
  address: string;
  scriptPk?: string; // Optional scriptPubKey hex
}

export interface Output {
  address: string;
  amount: number; // Satoshis
}

export interface BuildPsbtOptions {
  inputs: UtxoInput[];
  outputs: Output[];
  changeAddress: string;
  feeRate: number; // Satoshis per vbyte (default: 1)
  network?: bitcoin.Network;
}

/**
 * Get bitcoinjs-lib network from ChainType
 */
export function getNetworkFromChainType(chainType: ChainType): bitcoin.Network {
  switch (chainType) {
    case ChainType.BITCOIN_MAINNET:
    case ChainType.FRACTAL_BITCOIN_MAINNET:
      return bitcoin.networks.bitcoin;
    case ChainType.BITCOIN_TESTNET:
    case ChainType.BITCOIN_TESTNET4:
    case ChainType.FRACTAL_BITCOIN_TESTNET:
      return bitcoin.networks.testnet;
    case ChainType.BITCOIN_SIGNET:
      return bitcoin.networks.testnet; // Signet uses testnet network in bitcoinjs-lib
    default:
      return bitcoin.networks.bitcoin; // Default to mainnet
  }
}

/**
 * Build input if not already duplicated in PSBT
 * Returns true if input was added, false if already exists
 */
export function buildInputIfNotDuplicated(
  psbt: Psbt,
  input: UtxoInput,
  network: bitcoin.Network
): boolean {
  // Check if input already exists
  const existingInputs = psbt.txInputs;
  const isDuplicate = existingInputs.some(
    (existing) =>
      existing.hash.reverse().toString("hex") === input.txid &&
      existing.index === input.vout
  );

  if (isDuplicate) {
    return false; // Input already exists
  }

  // Add input to PSBT
  try {
    // Convert txid from hex string to Buffer (reverse for bitcoinjs-lib)
    const txidBuffer = Buffer.from(input.txid, "hex").reverse();

    // If scriptPk is provided, use it; otherwise derive from address
    let scriptPubKey: Buffer;
    if (input.scriptPk) {
      scriptPubKey = Buffer.from(input.scriptPk, "hex");
    } else {
      // Derive scriptPubKey from address
      const addressObj = bitcoin.address.toOutputScript(input.address, network);
      scriptPubKey = addressObj;
    }

    psbt.addInput({
      hash: txidBuffer,
      index: input.vout,
      witnessUtxo: {
        script: scriptPubKey,
        value: input.value,
      },
    });

    return true; // Input added successfully
  } catch (error) {
    throw new Error(
      `Failed to add input ${input.txid}:${input.vout}: ${error}`
    );
  }
}

/**
 * Calculate transaction fee in satoshis
 * Fee = (estimated vbytes) * feeRate
 * Supports decimal feeRate values (e.g., 0.1, 0.6, 3.4)
 */
export function calculateFee(
  inputs: UtxoInput[],
  outputs: Output[],
  feeRate: number
): number {
  // Base transaction size: 10 bytes (version + locktime + input count + output count)
  let baseSize = 10;

  // Each input: ~148 bytes (for P2WPKH/P2WSH)
  // Simplified: assume all inputs are segwit
  const inputSize = 148;
  const totalInputSize = inputs.length * inputSize;

  // Each output: 8 bytes (value) + 1 byte (script length) + ~25 bytes (P2PKH) or ~34 bytes (P2WPKH)
  // Simplified: assume average 34 bytes per output
  const outputSize = 34;
  const totalOutputSize = outputs.length * outputSize;

  // Witness data: ~107 bytes per input (for P2WPKH)
  const witnessSize = 107;
  const totalWitnessSize = inputs.length * witnessSize;

  // Total vbytes = (base + inputs + outputs + witness) / 4 (rounded up)
  const totalVBytes = Math.ceil(
    (baseSize + totalInputSize + totalOutputSize + totalWitnessSize) / 4
  );

  // Calculate fee with decimal feeRate support
  // Round to nearest satoshi
  return Math.round(totalVBytes * feeRate);
}

/**
 * Build PSBT with selected UTXOs and outputs
 */
export function buildPsbt(options: BuildPsbtOptions): {
  psbt: Psbt;
  fee: number;
  changeAmount: number;
} {
  const {
    inputs,
    outputs,
    changeAddress,
    feeRate = 1, // Default 1 sat/vB
    network = bitcoin.networks.bitcoin,
  } = options;

  // Validate inputs
  if (!inputs || inputs.length === 0) {
    throw new Error("At least one input is required");
  }

  if (!outputs || outputs.length === 0) {
    throw new Error("At least one output is required");
  }

  // No validation for change address - psbt.addOutput() will handle address conversion internally
  // This allows all address types including Taproot without requiring ECC library

  // Calculate total input value
  const totalInputValue = inputs.reduce((sum, input) => sum + input.value, 0);

  // Calculate total output value
  const totalOutputValue = outputs.reduce(
    (sum, output) => sum + output.amount,
    0
  );

  // Create PSBT
  const psbt = new Psbt({ network });

  // Add inputs (with duplicate check)
  let addedInputs = 0;
  for (const input of inputs) {
    if (buildInputIfNotDuplicated(psbt, input, network)) {
      addedInputs++;
    }
  }

  if (addedInputs === 0) {
    throw new Error("No inputs were added (all duplicates?)");
  }

  // Add outputs
  // psbt.addOutput() handles address conversion internally, including Taproot addresses
  for (const output of outputs) {
    try {
      // Basic validation for non-Taproot addresses
      if (!output.address.startsWith("bc1p") && !output.address.startsWith("tb1p") && !output.address.startsWith("bcrt1p")) {
        bitcoin.address.toOutputScript(output.address, network);
      }
      
      // psbt.addOutput() will handle the address conversion, including Taproot
      psbt.addOutput({
        address: output.address,
        value: output.amount,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid output address ${output.address}: ${errorMsg}`);
    }
  }

  // Calculate fee (with change output estimated)
  // We need to estimate fee including potential change output
  const estimatedFee = calculateFee(inputs, outputs, feeRate);
  
  // Calculate change amount
  const changeAmount = totalInputValue - totalOutputValue - estimatedFee;

  // Add change output if change > dust threshold (546 sats)
  // psbt.addOutput() handles address conversion internally, including Taproot addresses
  if (changeAmount > 546) {
    try {
      // psbt.addOutput() will handle the address conversion, including Taproot
      psbt.addOutput({
        address: changeAddress,
        value: changeAmount,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to add change output: ${errorMsg}`);
    }
  } else if (changeAmount < 0) {
    throw new Error(
      `Insufficient funds: need ${Math.abs(changeAmount)} more satoshis`
    );
  }

  // Recalculate fee with actual outputs (including change)
  const finalOutputs = changeAmount > 546 ? outputs.length + 1 : outputs.length;
  const finalFee = calculateFee(
    inputs,
    [...outputs, ...(changeAmount > 546 ? [{ address: changeAddress, amount: changeAmount }] : [])],
    feeRate
  );

  return {
    psbt,
    fee: finalFee,
    changeAmount: changeAmount > 546 ? changeAmount : 0,
  };
}

/**
 * Convert PSBT to hex string for Unisat wallet
 */
export function psbtToHex(psbt: Psbt): string {
  return psbt.toHex();
}

