import React, { useState } from "react";
import { Button, Card, Input, Alert, Descriptions, Typography, Divider } from "antd";
import * as bitcoin from "bitcoinjs-lib";
import { Psbt } from "bitcoinjs-lib";

const { Text, Title } = Typography;

interface DecodedOutput {
  index: number;
  value: number;
  address?: string;
  scriptPubKey: string;
  opReturn?: {
    hex: string;
    text: string;
  };
}

interface DecodedData {
  type: "PSBT" | "Transaction";
  version?: number;
  locktime?: number;
  inputs: Array<{
    txid: string;
    vout: number;
    sequence: number;
  }>;
  outputs: DecodedOutput[];
  psbtVersion?: number;
  isFinalized?: boolean;
}

export function DecodePsbtTxCard() {
  const [hexInput, setHexInput] = useState("");
  const [decodedData, setDecodedData] = useState<DecodedData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const doc_url =
    "https://docs.unisat.io/dev/unisat-developer-center/unisat-wallet#signpsbt";

  const hexToBuffer = (hex: string): Buffer => {
    // Remove whitespace and ensure even length
    const cleanHex = hex.replace(/\s+/g, "").trim();
    if (cleanHex.length % 2 !== 0) {
      throw new Error("Invalid hex string: odd length");
    }
    return Buffer.from(cleanHex, "hex");
  };

  const detectType = (input: string): "PSBT" | "RAWTX" | "INVALID" => {
    const clean = input.replace(/\s+/g, "").trim();
    
    // Check if it's base64 PSBT (starts with 'cHNidA' which is "psbt" in base64)
    if (clean.startsWith("cHNidA")) {
      return "PSBT";
    }
    
    // Try as hex first
    try {
      const buffer = hexToBuffer(clean);
      if (buffer.length === 0) {
        return "INVALID";
      }
      
      const firstByte = buffer[0].toString(16).padStart(2, "0");
      
      if (firstByte === "70") {
        return "PSBT";
      } else if (firstByte === "02") {
        return "RAWTX";
      } else {
        return "INVALID";
      }
    } catch {
      // If not valid hex, try as base64
      try {
        const base64Buffer = Buffer.from(clean, "base64");
        if (base64Buffer.length === 0) {
          return "INVALID";
        }
        
        const firstByte = base64Buffer[0].toString(16).padStart(2, "0");
        
        if (firstByte === "70") {
          return "PSBT";
        } else if (firstByte === "02") {
          return "RAWTX";
        } else {
          return "INVALID";
        }
      } catch {
        return "INVALID";
      }
    }
  };

  const isPSBT = (input: string): boolean => {
    return detectType(input) === "PSBT";
  };

  const extractOPReturn = (script: Buffer): { hex: string; text: string } | null => {
    // OP_RETURN is 0x6a
    if (script.length === 0 || script[0] !== 0x6a) {
      return null;
    }

    // OP_RETURN format: 0x6a [push opcode] [data]
    // Data starts after OP_RETURN (0x6a) and the push opcode
    let dataStart = 1;
    if (script.length > 1) {
      const pushOpcode = script[1];
      // OP_PUSHDATA1 (0x4c), OP_PUSHDATA2 (0x4d), OP_PUSHDATA4 (0x4e)
      if (pushOpcode === 0x4c) {
        dataStart = 3; // 0x6a + 0x4c + 1 byte length
      } else if (pushOpcode === 0x4d) {
        dataStart = 4; // 0x6a + 0x4d + 2 bytes length
      } else if (pushOpcode === 0x4e) {
        dataStart = 6; // 0x6a + 0x4e + 4 bytes length
      } else if (pushOpcode <= 0x4b) {
        // Direct push opcode (0x01 to 0x4b)
        dataStart = 2; // 0x6a + push opcode
      }
    }

    if (script.length <= dataStart) {
      return null;
    }

    const data = script.slice(dataStart);
    const hex = data.toString("hex");
    
    // Try to decode as UTF-8 text
    let text = "";
    try {
      text = data.toString("utf8");
      // Check if it's valid UTF-8 and printable
      if (!/^[\x20-\x7E\n\r\t]*$/.test(text)) {
        text = ""; // Not printable ASCII
      }
    } catch {
      text = "";
    }

    return { hex, text };
  };

  const decodeTransaction = (hex: string): DecodedData => {
    const buffer = hexToBuffer(hex);
    const tx = bitcoin.Transaction.fromBuffer(buffer);

    const outputs: DecodedOutput[] = tx.outs.map((out, index) => {
      const script = out.script;
      const opReturn = extractOPReturn(script);
      
      let address: string | undefined;
      try {
        // Try to extract address from script
        if (script.length > 0 && script[0] === 0x6a) {
          // OP_RETURN, no address
          address = undefined;
        } else {
          // Try different payment types
          const paymentTypes = [
            () => bitcoin.payments.p2pkh({ output: script }),
            () => bitcoin.payments.p2sh({ output: script }),
            () => bitcoin.payments.p2wpkh({ output: script }),
            () => bitcoin.payments.p2wsh({ output: script }),
          ];
          
          for (const getPayment of paymentTypes) {
            try {
              const payment = getPayment();
              if (payment.address) {
                address = payment.address;
                break;
              }
            } catch {
              // Continue to next payment type
            }
          }
        }
      } catch {
        address = undefined;
      }

      return {
        index,
        value: out.value,
        address,
        scriptPubKey: script.toString("hex"),
        opReturn: opReturn || undefined,
      };
    });

    const inputs = tx.ins.map((input) => ({
      txid: Buffer.from(input.hash).reverse().toString("hex"),
      vout: input.index,
      sequence: input.sequence,
    }));

    return {
      type: "Transaction",
      version: tx.version,
      locktime: tx.locktime,
      inputs,
      outputs,
    };
  };

  const decodePSBT = (input: string): DecodedData => {
    let psbt: Psbt;
    
    try {
      // Try as hex first
      const cleanHex = input.replace(/\s+/g, "").trim();
      try {
        const buffer = hexToBuffer(cleanHex);
        psbt = Psbt.fromBuffer(buffer);
      } catch {
        // Try as base64
        const base64Buffer = Buffer.from(cleanHex, "base64");
        psbt = Psbt.fromBuffer(base64Buffer);
      }
    } catch (e: any) {
      throw new Error(`Failed to parse PSBT: ${e.message}`);
    }

    // Extract transaction from PSBT
    const tx = psbt.extractTransaction(true); // true = extract even if not finalized
    
    const outputs: DecodedOutput[] = tx.outs.map((out, index) => {
      const script = out.script;
      const opReturn = extractOPReturn(script);
      
      let address: string | undefined;
      try {
        if (script.length > 0 && script[0] === 0x6a) {
          address = undefined;
        } else {
          // Try to decode address using payments API
          const payment = bitcoin.payments.p2pkh({ output: script });
          if (!payment.address) {
            const payment2 = bitcoin.payments.p2sh({ output: script });
            if (!payment2.address) {
              const payment3 = bitcoin.payments.p2wpkh({ output: script });
              if (!payment3.address) {
                const payment4 = bitcoin.payments.p2wsh({ output: script });
                address = payment4.address || undefined;
              } else {
                address = payment3.address;
              }
            } else {
              address = payment2.address;
            }
          } else {
            address = payment.address;
          }
        }
      } catch {
        address = undefined;
      }

      return {
        index,
        value: out.value,
        address,
        scriptPubKey: script.toString("hex"),
        opReturn: opReturn || undefined,
      };
    });

    const inputs = tx.ins.map((input) => ({
      txid: Buffer.from(input.hash).reverse().toString("hex"),
      vout: input.index,
      sequence: input.sequence,
    }));

    // Check if PSBT is finalized
    let isFinalized = true;
    try {
      psbt.finalizeAllInputs();
    } catch {
      isFinalized = false;
    }

    return {
      type: "PSBT",
      version: tx.version,
      locktime: tx.locktime,
      inputs,
      outputs,
      psbtVersion: 0, // PSBT version (not easily accessible from bitcoinjs-lib)
      isFinalized,
    };
  };

  const handleDecode = async () => {
    if (!hexInput.trim()) {
      setError("Please enter a PSBT or Transaction hex");
      setDecodedData(null);
      return;
    }

    setLoading(true);
    setError("");
    setDecodedData(null);

    try {
      const detectedType = detectType(hexInput);
      
      if (detectedType === "INVALID") {
        setError("INVALID Bitcoin TX: Transaction must start with 0x70 (PSBT) or 0x02 (RAWTX)");
        setDecodedData(null);
        return;
      }

      let decoded: DecodedData;
      
      if (detectedType === "PSBT") {
        decoded = decodePSBT(hexInput);
      } else {
        // RAWTX
        decoded = decodeTransaction(hexInput);
      }

      setDecodedData(decoded);
    } catch (e: any) {
      const errorMessage =
        e?.message || e?.toString() || "Failed to decode PSBT/Transaction";
      setError(errorMessage);
      setDecodedData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (satoshis: number): string => {
    return `${satoshis.toLocaleString()} sats (${(satoshis / 100000000).toFixed(8)} BTC)`;
  };

  return (
    <Card size="small" title="Decode PSBT/Tx" style={{ margin: 10 }}>
      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>Docs:</div>
        <a href={doc_url} target="_blank" rel="noreferrer">
          {doc_url}
        </a>
      </div>

      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>PSBT/Transaction Hex:</div>
        <Input.TextArea
          value={hexInput}
          onChange={(e) => {
            setHexInput(e.target.value);
          }}
          placeholder="Enter PSBT (base64 or hex) or Transaction hex string"
          autoSize={{ minRows: 3, maxRows: 8 }}
          style={{ fontFamily: "monospace", marginTop: "8px" }}
        />
      </div>

      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginTop: 10, textAlign: "left" }}
          closable
          onClose={() => {
            setError("");
          }}
        />
      )}

      {decodedData && (
        <div style={{ marginTop: 20, textAlign: "left" }}>
          <Title level={5} style={{ marginTop: 0 }}>
            Decoded {decodedData.type}
          </Title>

          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="Type">
              {decodedData.type}
            </Descriptions.Item>
            {decodedData.version !== undefined && (
              <Descriptions.Item label="Version">
                {decodedData.version}
              </Descriptions.Item>
            )}
            {decodedData.locktime !== undefined && (
              <Descriptions.Item label="Locktime">
                {decodedData.locktime}
              </Descriptions.Item>
            )}
            {decodedData.type === "PSBT" && decodedData.isFinalized !== undefined && (
              <Descriptions.Item label="Finalized">
                {decodedData.isFinalized ? "Yes" : "No"}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Inputs Count">
              {decodedData.inputs.length}
            </Descriptions.Item>
            <Descriptions.Item label="Outputs Count">
              {decodedData.outputs.length}
            </Descriptions.Item>
          </Descriptions>

          <Divider />

          <Title level={5}>Inputs</Title>
          {decodedData.inputs.map((input, idx) => (
            <Card
              key={idx}
              size="small"
              style={{ marginBottom: 10 }}
              title={`Input ${idx + 1}`}
            >
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="Previous TXID">
                  <Text copyable style={{ fontFamily: "monospace" }}>
                    {input.txid}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Vout">
                  {input.vout}
                </Descriptions.Item>
                <Descriptions.Item label="Sequence">
                  {input.sequence.toString(16)} (hex: 0x{input.sequence.toString(16).padStart(8, "0")})
                </Descriptions.Item>
              </Descriptions>
            </Card>
          ))}

          <Divider />

          <Title level={5}>Outputs</Title>
          {decodedData.outputs.map((output, idx) => (
            <Card
              key={idx}
              size="small"
              style={{ marginBottom: 10 }}
              title={`Output ${idx + 1}`}
            >
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="Value">
                  {formatValue(output.value)}
                </Descriptions.Item>
                {output.address && (
                  <Descriptions.Item label="Address">
                    <Text copyable style={{ fontFamily: "monospace" }}>
                      {output.address}
                    </Text>
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Script PubKey">
                  <Text copyable style={{ fontFamily: "monospace" }}>
                    {output.scriptPubKey}
                  </Text>
                </Descriptions.Item>
                {output.opReturn && (
                  <>
                    <Descriptions.Item label="OP_RETURN Data (Hex)">
                      <Text copyable style={{ fontFamily: "monospace" }}>
                        {output.opReturn.hex}
                      </Text>
                    </Descriptions.Item>
                    {output.opReturn.text && (
                      <Descriptions.Item label="OP_RETURN Data (Text)">
                        <div
                          style={{
                            fontFamily: "monospace",
                            backgroundColor: "#f5f5f5",
                            padding: "8px",
                            borderRadius: "4px",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {output.opReturn.text}
                        </div>
                      </Descriptions.Item>
                    )}
                  </>
                )}
              </Descriptions>
            </Card>
          ))}
        </div>
      )}

      <Button
        type="primary"
        block
        style={{ marginTop: 10 }}
        onClick={handleDecode}
        loading={loading}
        disabled={!hexInput.trim()}
      >
        Decode
      </Button>
    </Card>
  );
}

