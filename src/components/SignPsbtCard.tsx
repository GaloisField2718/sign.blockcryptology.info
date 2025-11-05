import React, { useState } from "react";
import { Button, Card, Input, Space, Alert } from "antd";

export function SignPsbtCard() {
  const [psbtHex, setPsbtHex] = useState("");
  const [result, setResult] = useState({
    success: false,
    error: "",
    data: "",
  });
  const [loading, setLoading] = useState<string | null>(null);

  const doc_url =
    "https://docs.unisat.io/dev/unisat-developer-center/unisat-wallet#signpsbt";

  const handleSignPsbt = async (
    autoFinalize: boolean,
    broadcast: boolean
  ) => {
    if (!psbtHex.trim()) {
      setResult({
        success: false,
        error: "Please enter a PSBT hex",
        data: "",
      });
      return;
    }

    const loadingKey = `${autoFinalize}-${broadcast}`;
    setLoading(loadingKey);
    setResult({
      success: false,
      error: "",
      data: "",
    });

    try {
      const options: any = {
        autoFinalize,
        broadcast,
      };

      const psbtResult = await (window as any).unisat.signPsbt(
        psbtHex,
        options
      );

      setResult({
        success: true,
        error: "",
        data: psbtResult,
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
      setLoading(null);
    }
  };

  return (
    <Card size="small" title="Sign Psbt" style={{ margin: 10 }}>
      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>Docs:</div>
        <a href={doc_url} target="_blank" rel="noreferrer">
          {doc_url}
        </a>
      </div>

      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>PsbtHex:</div>
        <Input.TextArea
          value={psbtHex}
          onChange={(e) => {
            setPsbtHex(e.target.value);
          }}
          placeholder="Enter PSBT hex string"
          autoSize={{ minRows: 3, maxRows: 8 }}
          style={{ fontFamily: "monospace" }}
        />
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
        <div style={{ textAlign: "left", marginTop: 10 }}>
          <div style={{ fontWeight: "bold" }}>Signed PSBT Hex:</div>
          <div
            style={{
              wordWrap: "break-word",
              fontFamily: "monospace",
              backgroundColor: "#f5f5f5",
              padding: "8px",
              borderRadius: "4px",
              marginTop: "8px",
            }}
          >
            {result.data}
          </div>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <div style={{ fontWeight: "bold", marginBottom: 10 }}>
          Sign with Options:
        </div>
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Button
            type="primary"
            block
            loading={loading === "true-true"}
            onClick={() => handleSignPsbt(true, true)}
            disabled={!psbtHex.trim()}
          >
            Sign (autoFinalize: true, broadcast: true)
          </Button>

          <Button
            block
            loading={loading === "true-false"}
            onClick={() => handleSignPsbt(true, false)}
            disabled={!psbtHex.trim()}
          >
            Sign (autoFinalize: true, broadcast: false)
          </Button>

          <Button
            block
            loading={loading === "false-false"}
            onClick={() => handleSignPsbt(false, false)}
            disabled={!psbtHex.trim()}
          >
            Sign (autoFinalize: false, broadcast: false)
          </Button>
        </Space>
      </div>
    </Card>
  );
}
