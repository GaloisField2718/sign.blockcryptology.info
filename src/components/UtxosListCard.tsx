import React, { useState, useEffect, useRef } from "react";
import { Button, Card, Input, Alert, Spin, Typography, Space, Checkbox, Tag, Tooltip } from "antd";
import { SearchOutlined, ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { satoshisToAmount } from "../utils";
import { useUtxoSelection } from "../contexts/UtxoSelectionContext";
import { useUtxos } from "../hooks/useUtxos";

const { Text, Link } = Typography;

interface UtxosListCardProps {
  defaultAddress?: string;
}

export function UtxosListCard({ defaultAddress = "" }: UtxosListCardProps) {
  const [address, setAddress] = useState(defaultAddress);
  const [fetchStatus, setFetchStatus] = useState(false);
  const isUserModifiedRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const { toggleUtxo, isUtxoSelected } = useUtxoSelection();

  const {
    utxos,
    loading,
    error,
    fetchUtxos,
    fetchUtxoStatus,
    refreshUtxos,
    clearError,
  } = useUtxos({
    fetchStatus: fetchStatus,
    onError: (err) => {
      console.error("UTXO fetch error:", err);
    },
  });

  // Initialiser avec l'adresse par défaut UNIQUEMENT au premier montage
  useEffect(() => {
    if (!hasInitializedRef.current && defaultAddress && defaultAddress.trim() !== "") {
      setAddress(defaultAddress);
      hasInitializedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-load when address is available
  useEffect(() => {
    if (address && address.trim() && !isUserModifiedRef.current) {
      const trimmedAddress = address.trim();
      const bitcoinAddressRegex = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/;
      if (bitcoinAddressRegex.test(trimmedAddress)) {
        fetchUtxos(trimmedAddress);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFetchUtxos = async () => {
    if (!address.trim()) {
      return;
    }
    await fetchUtxos(address.trim());
  };

  const handleRefreshStatus = async () => {
    if (!address.trim() || utxos.length === 0) {
      return;
    }

    setFetchStatus(true);
    // Fetch status for all UTXOs
    for (const utxo of utxos) {
      if (!utxo.status) {
        await fetchUtxoStatus(utxo.txid, utxo.vout, address.trim());
      }
    }
    setFetchStatus(false);
  };

  // Séparer les UTXOs par statut
  const unspentUtxos = utxos.filter((utxo) => !utxo.isSpent && !utxo.isLocked);
  const lockedUtxos = utxos.filter((utxo) => utxo.isLocked === true);
  const spentUtxos = utxos.filter((utxo) => utxo.isSpent === true && !utxo.isLocked);
  const unknownStatusUtxos = utxos.filter((utxo) => utxo.isSpent === undefined && utxo.isLocked === undefined);

  // Calculer les totaux (avec vérification de sécurité)
  const totalUnspent = unspentUtxos.reduce((sum, utxo) => {
    const satoshi = typeof utxo.satoshi === 'number' && !isNaN(utxo.satoshi) ? utxo.satoshi : 0;
    return sum + satoshi;
  }, 0);
  const totalSpent = spentUtxos.reduce((sum, utxo) => {
    const satoshi = typeof utxo.satoshi === 'number' && !isNaN(utxo.satoshi) ? utxo.satoshi : 0;
    return sum + satoshi;
  }, 0);
  const totalUnknown = unknownStatusUtxos.reduce((sum, utxo) => {
    const satoshi = typeof utxo.satoshi === 'number' && !isNaN(utxo.satoshi) ? utxo.satoshi : 0;
    return sum + satoshi;
  }, 0);

  const formatOutpointDisplay = (txid: string, vout: number): { txid: string; vout: string } => {
    return {
      txid: txid || "",
      vout: vout.toString() || "0",
    };
  };

  const renderUtxoItem = (
    utxo: typeof utxos[0],
    idx: number,
    showStatus: boolean = true
  ) => {
    // Safety check: ensure satoshi is a valid number
    const satoshi = typeof utxo.satoshi === 'number' && !isNaN(utxo.satoshi) 
      ? utxo.satoshi 
      : 0;
    
    const { txid, vout } = formatOutpointDisplay(utxo.txid, utxo.vout);
    const btcAmount = satoshisToAmount(satoshi);
    const outpoint = `${utxo.txid}:${utxo.vout}`;
    const isSelected = isUtxoSelected(outpoint);
    const isSpent = utxo.isSpent === true;
    const statusUnknown = utxo.isSpent === undefined;

    return (
      <div
        key={idx}
        style={{
          marginBottom: 8,
          padding: "8px",
          backgroundColor: isSelected
            ? "rgba(24, 144, 255, 0.1)"
            : isSpent
            ? "rgba(255, 77, 79, 0.05)"
            : "var(--bg-card)",
          borderRadius: "6px",
          fontFamily: "monospace",
          fontSize: "13px",
          border: isSelected
            ? "1px solid #1890ff"
            : isSpent
            ? "1px solid rgba(255, 77, 79, 0.3)"
            : "1px solid transparent",
          cursor: isSpent ? "not-allowed" : "pointer",
          opacity: isSpent ? 0.6 : 1,
        }}
        onClick={() => {
          if (!isSpent) {
            const satoshi = typeof utxo.satoshi === 'number' && !isNaN(utxo.satoshi) ? utxo.satoshi : 0;
            toggleUtxo({
              outpoint,
              value: satoshi,
              address: address.trim(),
            });
          }
        }}
      >
        <Space>
          {!isSpent && (
            <Checkbox
              checked={isSelected}
              onChange={() => {
                const satoshi = typeof utxo.satoshi === 'number' && !isNaN(utxo.satoshi) ? utxo.satoshi : 0;
                toggleUtxo({
                  outpoint,
                  value: satoshi,
                  address: address.trim(),
                });
              }}
              onClick={(e) => e.stopPropagation()}
            />
          )}
          {showStatus && (
            <>
              {isSpent ? (
                <Tooltip title="This UTXO has been spent">
                  <Tag color="red" icon={<CloseCircleOutlined />}>
                    Spent
                  </Tag>
                </Tooltip>
              ) : statusUnknown ? (
                <Tooltip title="Status unknown - click refresh to check">
                  <Tag color="default">Unknown</Tag>
                </Tooltip>
              ) : (
                <Tooltip title="This UTXO is available">
                  <Tag color="green" icon={<CheckCircleOutlined />}>
                    Unspent
                  </Tag>
                </Tooltip>
              )}
            </>
          )}
          <Link
            href={`https://nullpool.space/tx/${txid}:${vout}`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            {txid}:{vout}
          </Link>{" "}
          <Text strong>{satoshi.toLocaleString()} sats</Text>{" "}
          <Text type="secondary">(=)</Text>{" "}
          <Text strong>{btcAmount} BTC</Text>
          {utxo.scriptPk && (
            <Tooltip title={`ScriptPK: ${utxo.scriptPk}`}>
              <Text type="secondary" style={{ fontSize: "11px", marginLeft: 8 }}>
                [scriptPk]
              </Text>
            </Tooltip>
          )}
        </Space>
      </div>
    );
  };

  return (
    <Card
      size="small"
      title="UTXOs List"
      className="utxos-list-card-fluo"
      style={{
        margin: 10,
        transition: "all 0.3s ease",
        position: "relative",
        overflow: "hidden",
      }}
      extra={
        utxos.length > 0 && (
          <Space>
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={handleRefreshStatus}
              loading={fetchStatus}
              disabled={loading}
            >
              Check Status
            </Button>
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={refreshUtxos}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        )
      }
    >
      {loading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background:
              "linear-gradient(90deg, var(--accent) 0%, var(--accent-hover) 50%, var(--accent) 100%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s ease-in-out infinite",
          }}
        />
      )}

      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold", marginBottom: 8 }}>Bitcoin Address:</div>
        <Space.Compact style={{ width: "100%" }}>
          <Input
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              isUserModifiedRef.current = true;
              clearError();
            }}
            placeholder="Enter Bitcoin address (e.g., bc1...)"
            style={{ fontFamily: "monospace" }}
            onPressEnter={handleFetchUtxos}
            disabled={loading}
            allowClear
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleFetchUtxos}
            loading={loading}
            disabled={!address.trim() || loading}
          >
            Load UTXOs
          </Button>
        </Space.Compact>
      </div>

      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginTop: 10, textAlign: "left" }}
          closable
          onClose={clearError}
        />
      )}

      {loading && (
        <div
          style={{
            marginTop: 20,
            padding: 24,
            textAlign: "center",
            border: `2px solid var(--accent)`,
            borderRadius: "12px",
            backgroundColor: "rgba(255, 125, 71, 0.08)",
            boxShadow: "inset 0 2px 4px rgba(255, 125, 71, 0.1)",
          }}
        >
          <Spin size="large" style={{ color: "var(--accent)" }} />
          <div
            style={{
              marginTop: 12,
              color: "var(--accent)",
              fontWeight: "bold",
              fontSize: "14px",
            }}
          >
            Loading UTXOs...
          </div>
          <div
            style={{
              marginTop: 8,
              color: "var(--text-secondary)",
              fontSize: "12px",
            }}
          >
            Fetching data from sdk.txspam.lol
          </div>
        </div>
      )}

      {!loading && utxos.length > 0 && (
        <div style={{ marginTop: 20, textAlign: "left" }}>
          {/* Unspent UTXOs */}
          {unspentUtxos.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontWeight: "bold",
                  fontSize: "16px",
                  marginBottom: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <CheckCircleOutlined style={{ color: "#52c41a" }} />
                Available Balance (Unspent):
              </div>
              <div>
                {unspentUtxos.map((utxo, idx) =>
                  renderUtxoItem(utxo, idx, true)
                )}
                <div
                  style={{
                    marginTop: 10,
                    padding: "10px",
                    backgroundColor: "rgba(82, 196, 26, 0.1)",
                    borderRadius: "6px",
                    fontWeight: "bold",
                  }}
                >
                  Total: {totalUnspent.toLocaleString()} sats (
                  {satoshisToAmount(totalUnspent)} BTC)
                </div>
              </div>
            </div>
          )}

          {/* Unknown Status UTXOs */}
          {unknownStatusUtxos.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontWeight: "bold",
                  fontSize: "16px",
                  marginBottom: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Tag color="default">?</Tag>
                Unknown Status:
                <Button
                  size="small"
                  type="link"
                  icon={<ReloadOutlined />}
                  onClick={handleRefreshStatus}
                  loading={fetchStatus}
                  style={{ padding: 0, height: "auto" }}
                >
                  Check Status
                </Button>
              </div>
              <div>
                {unknownStatusUtxos.map((utxo, idx) =>
                  renderUtxoItem(utxo, idx, true)
                )}
                <div
                  style={{
                    marginTop: 10,
                    padding: "10px",
                    backgroundColor: "rgba(140, 140, 140, 0.1)",
                    borderRadius: "6px",
                    fontWeight: "bold",
                  }}
                >
                  Total: {totalUnknown.toLocaleString()} sats (
                  {satoshisToAmount(totalUnknown)} BTC)
                </div>
              </div>
            </div>
          )}

          {/* Spent UTXOs */}
          {spentUtxos.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div
                style={{
                  fontWeight: "bold",
                  fontSize: "16px",
                  marginBottom: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <CloseCircleOutlined style={{ color: "#ff4d4f" }} />
                Spent UTXOs:
              </div>
              <div>
                {spentUtxos.map((utxo, idx) =>
                  renderUtxoItem(utxo, idx, true)
                )}
                <div
                  style={{
                    marginTop: 10,
                    padding: "10px",
                    backgroundColor: "rgba(255, 77, 79, 0.1)",
                    borderRadius: "6px",
                    fontWeight: "bold",
                  }}
                >
                  Total: {totalSpent.toLocaleString()} sats (
                  {satoshisToAmount(totalSpent)} BTC)
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && utxos.length === 0 && !error && address && (
        <div
          style={{
            marginTop: 20,
            textAlign: "center",
            color: "var(--text-secondary)",
          }}
        >
          Enter an address and click "Load UTXOs" to fetch the UTXO list
        </div>
      )}
    </Card>
  );
}
