import React, { useState, useEffect } from "react";
import { Button, Card, Input, Space, Divider, Alert, Typography, Tag, message } from "antd";
import { PlusOutlined, DeleteOutlined, WalletOutlined, CopyOutlined } from "@ant-design/icons";
import { useUtxoSelection } from "../contexts/UtxoSelectionContext";
import { satoshisToAmount, amountToSatoshis, copyToClipboard } from "../utils";
import {
  buildPsbt,
  psbtToHex,
  getNetworkFromChainType,
  UtxoInput,
  Output,
} from "../services/psbtBuilder";
import { ChainType } from "../const";

const { Text } = Typography;

interface OutputForm {
  address: string;
  amount: string;
}

export function SendUtxosCard() {
  const [outputs, setOutputs] = useState<OutputForm[]>([
    { address: "", amount: "" },
  ]);
  const [feeRate, setFeeRate] = useState<string>("1"); // Default 1 sat/vB
  const [result, setResult] = useState({
    success: false,
    error: "",
    data: "",
  });
  const [loading, setLoading] = useState(false);
  const [psbtHex, setPsbtHex] = useState<string>("");
  const [calculatedFee, setCalculatedFee] = useState<number>(0);
  const [changeAmount, setChangeAmount] = useState<number>(0);
  const { selectedUtxos, clearUtxos } = useUtxoSelection();

  // Get current chain from wallet
  const [chainType, setChainType] = useState<ChainType>(
    ChainType.BITCOIN_MAINNET
  );
  const [changeAddress, setChangeAddress] = useState<string>("");

  useEffect(() => {
    const unisat = (window as any).unisat;
    if (unisat) {
      unisat.getChain().then((chain: { enum: ChainType }) => {
        setChainType(chain.enum);
      });
      unisat.getAccounts().then((accounts: string[]) => {
        if (accounts.length > 0) {
          setChangeAddress(accounts[0]);
        }
      });
    }
  }, []);

  const addOutput = () => {
    setOutputs([...outputs, { address: "", amount: "" }]);
  };

  const removeOutput = (index: number) => {
    const newOutputs = [...outputs];
    newOutputs.splice(index, 1);
    setOutputs(newOutputs);
  };

  const updateOutput = (
    index: number,
    field: "address" | "amount",
    value: string
  ) => {
    const newOutputs = [...outputs];
    newOutputs[index] = {
      ...newOutputs[index],
      [field]: value,
    };
    setOutputs(newOutputs);
  };

  const handleBuildPsbt = async () => {
    // Validation
    if (selectedUtxos.length === 0) {
      setResult({
        success: false,
        error: "Please select at least one UTXO from the UTXOs List",
        data: "",
      });
      return;
    }

    const emptyOutputs = outputs.filter(
      (out) => !out.address.trim() || !out.amount.trim()
    );
    if (emptyOutputs.length > 0) {
      setResult({
        success: false,
        error: "Please fill in all address and amount fields",
        data: "",
      });
      return;
    }

    if (!changeAddress.trim()) {
      setResult({
        success: false,
        error: "Change address is required",
        data: "",
      });
      return;
    }

    setLoading(true);
    setResult({
      success: false,
      error: "",
      data: "",
    });

    try {
      // Convert selected UTXOs to UtxoInput format
      const inputs: UtxoInput[] = selectedUtxos.map((utxo) => {
        const [txid, vout] = utxo.outpoint.split(":");
        return {
          txid,
          vout: parseInt(vout, 10),
          value: utxo.value,
          address: utxo.address,
        };
      });

      // Convert outputs to Output format
      const psbtOutputs: Output[] = outputs.map((out) => ({
        address: out.address.trim(),
        amount: amountToSatoshis(parseFloat(out.amount) || 0),
      }));

      // Get network
      const network = getNetworkFromChainType(chainType);

      // Build PSBT with user-specified fee rate
      const feeRateNum = parseFloat(feeRate) || 0.9;
      if (feeRateNum < 0.01) {
        throw new Error("Fee rate must be at least 0.01 sat/vB");
      }
      const { psbt, fee, changeAmount: change } = buildPsbt({
        inputs,
        outputs: psbtOutputs,
        changeAddress: changeAddress.trim(),
        feeRate: feeRateNum,
        network,
      });

      // Convert to hex
      const hex = psbtToHex(psbt);
      setPsbtHex(hex);
      setCalculatedFee(fee);
      setChangeAmount(change);

      setResult({
        success: true,
        error: "",
        data: "PSBT built successfully",
      });
    } catch (e: any) {
      const errorMessage =
        e?.message || e?.toString() || "Unknown error occurred";
      setResult({
        success: false,
        error: errorMessage,
        data: "",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignPsbt = async () => {
    if (!psbtHex) {
      setResult({
        success: false,
        error: "Please build PSBT first",
        data: "",
      });
      return;
    }

    setLoading(true);
    setResult({
      success: false,
      error: "",
      data: "",
    });

    try {
      const unisat = (window as any).unisat;
      const signedPsbt = await unisat.signPsbt(psbtHex, {
        autoFinalized: false, // Don't finalize, allow broadcast later
      });

      setPsbtHex(signedPsbt);
      setResult({
        success: true,
        error: "",
        data: "PSBT signed successfully",
      });
    } catch (e: any) {
      const errorMessage =
        e?.message || e?.toString() || "Unknown error occurred";
      setResult({
        success: false,
        error: errorMessage,
        data: "",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcast = async () => {
    if (!psbtHex) {
      setResult({
        success: false,
        error: "Please build and sign PSBT first",
        data: "",
      });
      return;
    }

    setLoading(true);
    setResult({
      success: false,
      error: "",
      data: "",
    });

    try {
      const unisat = (window as any).unisat;
      const txid = await unisat.pushPsbt(psbtHex);

      setResult({
        success: true,
        error: "",
        data: txid,
      });
    } catch (e: any) {
      const errorMessage =
        e?.message || e?.toString() || "Unknown error occurred";
      setResult({
        success: false,
        error: errorMessage,
        data: "",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalSelectedValue = selectedUtxos.reduce(
    (sum, utxo) => sum + utxo.value,
    0
  );
  const totalOutputValue = outputs.reduce(
    (sum, out) => sum + (amountToSatoshis(parseFloat(out.amount) || 0)),
    0
  );

  return (
    <Card size="small" title="Send UTXOs" style={{ margin: 10 }}>
      {/* Selected UTXOs Section */}
      {selectedUtxos.length > 0 ? (
        <div style={{ textAlign: "left", marginTop: 10 }}>
          <div style={{ fontWeight: "bold", marginBottom: 10 }}>
            Selected UTXOs ({selectedUtxos.length}):
          </div>
          <div
            style={{
              padding: "12px",
              backgroundColor: "#e6f7ff",
              border: "1px solid #91d5ff",
              borderRadius: "6px",
              marginBottom: 10,
            }}
          >
            {selectedUtxos.map((utxo, idx) => {
              const [txid, vout] = utxo.outpoint.split(":");
              return (
                <div
                  key={idx}
                  style={{
                    marginBottom: idx < selectedUtxos.length - 1 ? "8px" : 0,
                    fontSize: "12px",
                    fontFamily: "monospace",
                  }}
                >
                  <Tag color="blue">{txid.slice(0, 16)}...:{vout}</Tag>
                  <Text strong>{utxo.value.toLocaleString()} sats</Text>{" "}
                  <Text type="secondary">
                    ({satoshisToAmount(utxo.value)} BTC)
                  </Text>
                </div>
              );
            })}
            <div style={{ marginTop: "8px", fontSize: "12px" }}>
              <Text strong>
                Total Selected: {totalSelectedValue.toLocaleString()} sats (
                {satoshisToAmount(totalSelectedValue)} BTC)
              </Text>
            </div>
            <Button
              type="link"
              size="small"
              onClick={clearUtxos}
              style={{ padding: 0, marginTop: "4px" }}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      ) : (
        <Alert
          message="No UTXOs Selected"
          description="Please select UTXOs from the UTXOs List above to build a PSBT."
          type="warning"
          showIcon
          style={{ marginBottom: 10 }}
        />
      )}

      {/* Outputs Section */}
      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold", marginBottom: 10 }}>Outputs:</div>

        {outputs.map((output, index) => (
          <div key={index} style={{ marginBottom: 15 }}>
            <Space direction="vertical" style={{ width: "100%" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontWeight: "bold" }}>Output {index + 1}:</span>
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => removeOutput(index)}
                  disabled={outputs.length <= 1}
                />
              </div>
              <div>
                <div style={{ fontWeight: "bold", marginBottom: 5 }}>
                  Address:
                </div>
                <Input
                  value={output.address}
                  onChange={(e) =>
                    updateOutput(index, "address", e.target.value)
                  }
                  placeholder="Enter Bitcoin address"
                  style={{ fontFamily: "monospace" }}
                  disabled={selectedUtxos.length === 0}
                />
              </div>
              <div>
                <div style={{ fontWeight: "bold", marginBottom: 5 }}>
                  Amount (BTC):
                </div>
                <Input
                  value={output.amount}
                  onChange={(e) =>
                    updateOutput(index, "amount", e.target.value)
                  }
                  placeholder="Enter amount in BTC"
                  type="number"
                  step="0.00000001"
                  disabled={selectedUtxos.length === 0}
                />
              </div>
            </Space>

            {index < outputs.length - 1 && (
              <Divider style={{ margin: "15px 0" }} />
            )}
          </div>
        ))}

        <Button
          type="dashed"
          onClick={addOutput}
          style={{ width: "100%", marginTop: 10 }}
          icon={<PlusOutlined />}
          disabled={selectedUtxos.length === 0}
        >
          Add Output
        </Button>
      </div>

      {/* Fee Configuration - User Input */}
      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold", marginBottom: 5 }}>
          Fee Rate (sat/vB) <Text type="secondary">(default: 1)</Text>:
        </div>
        <Input
          value={feeRate}
          onChange={(e) => {
            const value = e.target.value;
            // Allow empty or valid numbers >= 1
            if (value === "" || (!isNaN(parseInt(value, 10)) && parseInt(value, 10) >= 1)) {
              setFeeRate(value);
            }
          }}
          placeholder="1"
          type="number"
          min="1"
          disabled={selectedUtxos.length === 0}
        />
        <div style={{ fontSize: "12px", color: "#8c8c8c", marginTop: 4 }}>
          Enter the fee rate in satoshis per virtual byte (vB). Minimum: 1 sat/vB
        </div>
      </div>

      {/* Change Address */}
      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold", marginBottom: 5 }}>
          Change Address:
        </div>
        <Input
          value={changeAddress}
          onChange={(e) => setChangeAddress(e.target.value)}
          placeholder="Enter change address"
          style={{ fontFamily: "monospace" }}
          disabled={selectedUtxos.length === 0}
        />
      </div>

      {/* Summary - Only shown after PSBT is built */}
      {calculatedFee > 0 && (
        <div style={{ textAlign: "left", marginTop: 10 }}>
          <Alert
            message="Transaction Summary"
            description={
              <div>
                <div>
                  <Text strong>Inputs:</Text> {totalSelectedValue.toLocaleString()} sats
                </div>
                <div>
                  <Text strong>Outputs:</Text> {totalOutputValue.toLocaleString()} sats
                </div>
                <div>
                  <Text strong>Fee Rate:</Text> {feeRate || "1"} sat/vB
                </div>
                <div>
                  <Text strong>Fee:</Text> {calculatedFee.toLocaleString()} sats
                </div>
                {changeAmount > 0 && (
                  <div>
                    <Text strong>Change:</Text> {changeAmount.toLocaleString()} sats
                  </div>
                )}
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 10 }}
          />
        </div>
      )}

      {/* PSBT Hex Display - After Build, Before Sign */}
      {psbtHex && result.data === "PSBT built successfully" && (
        <div style={{ textAlign: "left", marginTop: 10 }}>
          <div style={{ fontWeight: "bold", marginBottom: 5 }}>
            PSBT Hex (Ready for Signature):
          </div>
          <Space.Compact style={{ width: "100%" }}>
            <Input.TextArea
              value={psbtHex}
              readOnly
              rows={4}
              style={{
                fontFamily: "monospace",
                fontSize: "11px",
                backgroundColor: "#f5f5f5",
              }}
            />
            <Button
              icon={<CopyOutlined />}
              onClick={async () => {
                try {
                  await copyToClipboard(psbtHex);
                  message.success("PSBT copied to clipboard!");
                } catch (error) {
                  message.error("Failed to copy PSBT");
                }
              }}
              style={{ height: "auto" }}
            >
              Copy
            </Button>
          </Space.Compact>
          <div style={{ fontSize: "12px", color: "#8c8c8c", marginTop: 4 }}>
            You can copy this PSBT and sign it in the "Sign PSBT" card below, or use the "Sign PSBT" button here.
          </div>
        </div>
      )}

      {/* Signed PSBT Hex Display */}
      {psbtHex && result.data === "PSBT signed successfully" && (
        <div style={{ textAlign: "left", marginTop: 10 }}>
          <div style={{ fontWeight: "bold", marginBottom: 5 }}>
            Signed PSBT Hex:
          </div>
          <Space.Compact style={{ width: "100%" }}>
            <Input.TextArea
              value={psbtHex}
              readOnly
              rows={4}
              style={{
                fontFamily: "monospace",
                fontSize: "11px",
                backgroundColor: "#f5f5f5",
              }}
            />
            <Button
              icon={<CopyOutlined />}
              onClick={async () => {
                try {
                  await copyToClipboard(psbtHex);
                  message.success("Signed PSBT copied to clipboard!");
                } catch (error) {
                  message.error("Failed to copy PSBT");
                }
              }}
              style={{ height: "auto" }}
            >
              Copy
            </Button>
          </Space.Compact>
        </div>
      )}

      {/* Error/Success Messages */}
      {result.error && !result.success && (
        <Alert
          message="Error"
          description={result.error}
          type="error"
          showIcon
          style={{ marginTop: 10, textAlign: "left" }}
          closable
          onClose={() => {
            setResult({ ...result, error: "" });
          }}
        />
      )}

      {result.success && result.data !== "PSBT built successfully" && result.data !== "PSBT signed successfully" && (
        <Alert
          message="Transaction Broadcasted Successfully"
          description={
            <div>
              <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
                Transaction ID (Txid):
              </div>
              <div
                style={{
                  wordWrap: "break-word",
                  fontFamily: "monospace",
                  backgroundColor: "#f5f5f5",
                  padding: "8px",
                  borderRadius: "4px",
                }}
              >
                {result.data}
              </div>
            </div>
          }
          type="success"
          showIcon
          style={{ marginTop: 10, textAlign: "left" }}
        />
      )}

      {/* Action Buttons */}
      <Space direction="vertical" style={{ width: "100%", marginTop: 10 }}>
        <Button
          type="primary"
          block
          onClick={handleBuildPsbt}
          loading={loading}
          disabled={
            selectedUtxos.length === 0 ||
            outputs.some((out) => !out.address.trim() || !out.amount.trim()) ||
            !changeAddress.trim() ||
            !feeRate ||
            parseInt(feeRate, 10) < 1
          }
          icon={<WalletOutlined />}
        >
          Build PSBT
        </Button>

        {psbtHex && (
          <>
            <Button
              type="default"
              block
              onClick={handleSignPsbt}
              loading={loading}
              disabled={!psbtHex}
            >
              Sign PSBT
            </Button>

            <Button
              type="default"
              block
              onClick={handleBroadcast}
              loading={loading}
              disabled={!psbtHex}
            >
              Broadcast Transaction
            </Button>
          </>
        )}
      </Space>
    </Card>
  );
}

