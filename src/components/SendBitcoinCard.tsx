import React, { useState } from "react";
import { Button, Card, Input, Space, Divider, Alert } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";

interface Output {
  address: string;
  amount: string;
}

export function SendBitcoinCard() {
  const [outputs, setOutputs] = useState<Output[]>([
    { address: "", amount: "1000" },
  ]);
  const [result, setResult] = useState({
    success: false,
    error: "",
    data: "",
  });
  const [loading, setLoading] = useState(false);

  const doc_url =
    "https://docs.unisat.io/dev/unisat-developer-center/unisat-wallet#sendbitcoin";

  const addOutput = () => {
    setOutputs([...outputs, { address: "", amount: "1000" }]);
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

  const handleSend = async () => {
    // Validation
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

    setLoading(true);
    setResult({
      success: false,
      error: "",
      data: "",
    });

    try {
      // Si un seul output, utiliser l'API simple
      // Sinon, utiliser un tableau d'outputs
      let txid;
      if (outputs.length === 1) {
        txid = await (window as any).unisat.sendBitcoin(
          outputs[0].address,
          parseInt(outputs[0].amount)
        );
      } else {
        // Format: [{ address: string, satoshis: number }]
        const outputsArray = outputs.map((out) => ({
          address: out.address,
          satoshis: parseInt(out.amount),
        }));
        txid = await (window as any).unisat.sendBitcoin(outputsArray);
      }

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

  return (
    <Card size="small" title="Send Bitcoin" style={{ margin: 10 }}>
      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>Docs:</div>
        <a href={doc_url} target="_blank" rel="noreferrer">
          {doc_url}
        </a>
      </div>

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
                />
              </div>
              <div>
                <div style={{ fontWeight: "bold", marginBottom: 5 }}>
                  Amount (satoshis):
                </div>
                <Input
                  value={output.amount}
                  onChange={(e) =>
                    updateOutput(index, "amount", e.target.value)
                  }
                  placeholder="Enter amount in satoshis"
                  type="number"
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
        >
          Add Output
        </Button>
      </div>

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

      {result.success && (
        <Alert
          message="Transaction Sent Successfully"
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

      <Button
        type="primary"
        block
        style={{ marginTop: 10 }}
        onClick={handleSend}
        loading={loading}
        disabled={outputs.some(
          (out) => !out.address.trim() || !out.amount.trim()
        )}
      >
        Send Bitcoin
      </Button>
    </Card>
  );
}
