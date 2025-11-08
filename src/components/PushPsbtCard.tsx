import React, { useState } from "react";
import { Button, Card, Input, Alert } from "antd";

export function PushPsbtCard() {
  const [psbtHex, setPsbtHex] = useState("");
  const [result, setResult] = useState({
    success: false,
    error: "",
    data: "",
  });
  const [loading, setLoading] = useState(false);

  const doc_url =
    "https://docs.unisat.io/dev/unisat-developer-center/unisat-wallet#pushpsbt";

  const handlePushPsbt = async () => {
    if (!psbtHex.trim()) {
      setResult({
        success: false,
        error: "Please enter a PSBT hex",
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
      // pushPsbt should automatically finalize the PSBT if not finalized,
      // then broadcast it to the Bitcoin network
      // According to Unisat documentation, pushPsbt handles finalization internally
      const txid = await (window as any).unisat.pushPsbt(psbtHex);

      setResult({
        success: true,
        error: "",
        data: txid,
      });
    } catch (e: any) {
      const errorMessage =
        e?.message || e?.toString() || "Unknown error occurred";

      // Check if error is related to finalization
      const isFinalizationError =
        errorMessage.toLowerCase().includes("not finalized") ||
        errorMessage.toLowerCase().includes("finalize") ||
        errorMessage.toLowerCase().includes("finalized");

      setResult({
        success: false,
        error: isFinalizationError
          ? `Finalization Error: ${errorMessage}\n\nNote: pushPsbt should automatically finalize the PSBT before broadcasting. If you see this error, the PSBT may be invalid or require additional signatures.`
          : errorMessage,
        data: "",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card size="small" title="Push Psbt Hex" style={{ margin: 10 }}>
      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>Docs:</div>
        <a href={doc_url} target="_blank" rel="noreferrer">
          {doc_url}
        </a>
      </div>

      <Alert
        message="Automatic Finalization"
        description="pushPsbt automatically finalizes the PSBT (if not already finalized) before broadcasting it to the Bitcoin network. You can push both finalized and non-finalized PSBTs."
        type="info"
        showIcon
        style={{ marginTop: 10, textAlign: "left" }}
      />

      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>PSBT Hex:</div>
        <Input.TextArea
          value={psbtHex}
          onChange={(e) => {
            setPsbtHex(e.target.value);
          }}
          placeholder="Enter PSBT hex string (finalized or non-finalized)"
          autoSize={{ minRows: 3, maxRows: 8 }}
          style={{ fontFamily: "monospace", marginTop: "8px" }}
        />
      </div>

      {result.error && !result.success && (
        <Alert
          message="Error"
          description={
            <div style={{ whiteSpace: "pre-wrap" }}>{result.error}</div>
          }
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
          message="Transaction Broadcast Successfully"
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
        onClick={handlePushPsbt}
        loading={loading}
        disabled={!psbtHex.trim()}
      >
        Finalize & Broadcast PSBT
      </Button>
    </Card>
  );
}
