import React, { useState, useEffect, useRef } from "react";
import { Button, Card, Input, Alert, Spin, Typography, Space } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { satoshisToAmount } from "../utils";
import { API_BASE_URL } from "../config";

const { Text, Link } = Typography;

interface RuneBalance {
  name: string;
  balance: string;
}

interface Utxo {
  outpoint: string;
  value: number;
  runes: RuneBalance[];
  inscriptions: string[];
}

interface UtxosResponse {
  data: Utxo[];
}

interface UtxosListCardProps {
  defaultAddress?: string;
}

export function UtxosListCard({ defaultAddress = "" }: UtxosListCardProps) {
  const [address, setAddress] = useState(defaultAddress);
  const [apiKey, setApiKey] = useState("");
  const [utxos, setUtxos] = useState<Utxo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);
  const isUserModifiedRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const isApiKeyUserModifiedRef = useRef(false); // Track if user manually entered API key

  // Initialiser avec l'adresse par défaut UNIQUEMENT au premier montage, SI elle n'a pas été modifiée
  useEffect(() => {
    // Ne s'exécute qu'une seule fois au montage
    if (!hasInitializedRef.current && defaultAddress && defaultAddress.trim() !== "") {
      setAddress(defaultAddress);
      hasInitializedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Seulement au montage - ne pas réexécuter même si defaultAddress change

  // Fonction pour récupérer la clé API depuis PostgREST
  const fetchStoredApiKey = async (addr: string) => {
    if (!addr || !addr.trim()) return;

    const bitcoinAddressRegex = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/;
    if (!bitcoinAddressRegex.test(addr.trim())) return;

    try {
      // PostgREST API: GET /address_api_keys?address=eq.{address}&select=api_key
      const encodedAddress = encodeURIComponent(addr.trim());
      const response = await fetch(
        `${API_BASE_URL}/address_api_keys?address=eq.${encodedAddress}&select=api_key`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        // PostgREST retourne un tableau
        if (Array.isArray(data) && data.length > 0 && data[0].api_key) {
          setApiKey(data[0].api_key);
          return true;
        }
      }
    } catch (error) {
      // Silently fail - backend may not be available or no key stored
      console.debug('No stored API key found or backend unavailable:', error);
    }
    return false;
  };

  // Fonction pour sauvegarder la clé API dans PostgREST
  const saveApiKey = async (addr: string, key: string) => {
    if (!addr || !key || !addr.trim() || !key.trim()) {
      console.warn('saveApiKey: Missing address or apiKey', { addr, hasKey: !!key });
      return;
    }

    const bitcoinAddressRegex = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/;
    if (!bitcoinAddressRegex.test(addr.trim())) {
      console.warn('saveApiKey: Invalid Bitcoin address format', addr);
      return;
    }

    try {
      // PostgREST API: POST /address_api_keys avec Prefer: resolution=merge-duplicates pour UPSERT
      const response = await fetch(`${API_BASE_URL}/address_api_keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates', // UPSERT (insert or update on conflict)
        },
        body: JSON.stringify({
          address: addr.trim(),
          api_key: key.trim(),
        }),
      });

      if (response.ok || response.status === 201 || response.status === 204) {
        console.log('✅ API key saved successfully for address:', addr.trim());
        return true;
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to save API key:', response.status, response.statusText, errorText);
        return false;
      }
    } catch (error) {
      // Backend may not be available - log but don't block user
      console.error('❌ Failed to save API key (backend unavailable):', error);
      return false;
    }
  };

  // Récupérer la clé API quand l'adresse change UNIQUEMENT si l'utilisateur n'a pas modifié la clé manuellement
  useEffect(() => {
    // Ne charger la clé stockée QUE si l'utilisateur n'a pas encore modifié manuellement la clé
    if (isApiKeyUserModifiedRef.current) return; // L'utilisateur a déjà saisi sa clé, ne pas l'écraser
    
    // Attendre un peu avant de récupérer la clé (debounce)
    const trimmedAddress = address.trim();
    if (!trimmedAddress || apiKey.trim()) return; // Ne rien faire si pas d'adresse ou clé déjà remplie
    
    const bitcoinAddressRegex = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/;
    if (!bitcoinAddressRegex.test(trimmedAddress)) return;

    // Debounce pour éviter de faire trop de requêtes pendant la saisie
    const timer = setTimeout(() => {
      fetchStoredApiKey(trimmedAddress);
    }, 500); // Attendre 500ms après la dernière modification

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  const fetchUtxos = async () => {
    if (!address.trim()) {
      setError("Please enter a Bitcoin address");
      return;
    }

    if (!apiKey.trim()) {
      setError("Please enter your ordiscan.com API key");
      return;
    }

    // Validation basique d'adresse Bitcoin
    const bitcoinAddressRegex = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/;
    if (!bitcoinAddressRegex.test(address.trim())) {
      setError("Invalid Bitcoin address format");
      return;
    }

    setLoading(true);
    setError("");
    setUtxos([]);

    try {
      // Appel API ordiscan.com avec clé API requise
      const response = await fetch(
        `https://api.ordiscan.com/v1/address/${address.trim()}/utxos`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey.trim()}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            "API key required. Please configure your ordiscan.com API key."
          );
        }
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data: UtxosResponse = await response.json();
      setUtxos(data.data || []);

      // Sauvegarder la clé API SAISIE PAR L'UTILISATEUR après un appel API réussi
      // On utilise la valeur actuelle du state apiKey (celle saisie par l'utilisateur)
      const currentApiKey = apiKey.trim();
      const currentAddress = address.trim();
      
      console.log('🔍 Tentative de sauvegarde:', { 
        address: currentAddress, 
        hasApiKey: !!currentApiKey,
        apiKeyLength: currentApiKey.length 
      });
      
      if (currentAddress && currentApiKey) {
        console.log('💾 Sauvegarde de la clé API pour:', currentAddress);
        const saved = await saveApiKey(currentAddress, currentApiKey);
        if (saved) {
          console.log('✅ Votre clé API a été sauvegardée avec succès pour:', currentAddress);
        } else {
          console.error('❌ Échec de la sauvegarde de la clé API pour:', currentAddress);
        }
      } else {
        console.warn('⚠️ Impossible de sauvegarder: adresse ou clé API manquante', {
          hasAddress: !!currentAddress,
          hasApiKey: !!currentApiKey
        });
      }
    } catch (e: any) {
      const errorMessage =
        e?.message || e?.toString() || "Failed to fetch UTXOs";
      setError(errorMessage);
      setUtxos([]);
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  };

  // Auto-load when address and API key are available and card is opened
  useEffect(() => {
    if (address && address.trim() && apiKey && apiKey.trim() && !hasLoaded && !loading) {
      const bitcoinAddressRegex = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/;
      if (bitcoinAddressRegex.test(address.trim())) {
        fetchUtxos();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, apiKey]);

  const availableUtxos = utxos.filter(
    (utxo) => utxo.inscriptions.length === 0 && utxo.runes.length === 0
  );
  const lockedUtxos = utxos.filter(
    (utxo) => utxo.inscriptions.length > 0 || utxo.runes.length > 0
  );

  const totalAvailable = availableUtxos.reduce(
    (sum, utxo) => sum + utxo.value,
    0
  );
  const totalLocked = lockedUtxos.reduce((sum, utxo) => sum + utxo.value, 0);

  const formatOutpoint = (outpoint: string): { txid: string; vout: string } => {
    const parts = outpoint.split(":");
    return {
      txid: parts[0] || "",
      vout: parts[1] || "0",
    };
  };

  return (
    <Card
      size="small"
      title="UTXOs List"
      className="utxos-list-card-fluo"
      style={{
        margin: 10,
        // Pas de border/style inline ici - tout est géré par la classe CSS utxos-list-card-fluo
        transition: "all 0.3s ease",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {loading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: "linear-gradient(90deg, var(--accent) 0%, var(--accent-hover) 50%, var(--accent) 100%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s ease-in-out infinite",
          }}
        />
      )}
      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold", marginBottom: 8 }}>
          ordiscan.com API Key:
        </div>
        <Input.Password
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            isApiKeyUserModifiedRef.current = true; // L'utilisateur modifie la clé manuellement
          }}
          placeholder="Enter your ordiscan.com API key"
          style={{ marginBottom: 10 }}
          disabled={loading}
        />
      </div>

      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold", marginBottom: 8 }}>Bitcoin Address:</div>
        <Space.Compact style={{ width: "100%" }}>
          <Input
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              isUserModifiedRef.current = true;
              setError(""); // Clear error when user starts typing
            }}
            placeholder="Enter Bitcoin address (e.g., bc1...)"
            style={{ fontFamily: "monospace" }}
            onPressEnter={fetchUtxos}
            disabled={loading}
            allowClear
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={fetchUtxos}
            loading={loading}
            disabled={!address.trim() || !apiKey.trim() || loading}
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
          onClose={() => setError("")}
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
            Fetching data from ordiscan.com
          </div>
        </div>
      )}

      {!loading && utxos.length > 0 && (
        <div style={{ marginTop: 20, textAlign: "left" }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: "bold", fontSize: "16px", marginBottom: 10 }}>
              Available Balance:
            </div>
            {availableUtxos.length === 0 ? (
              <Text type="secondary">No available UTXOs</Text>
            ) : (
              <div>
                {availableUtxos.map((utxo, idx) => {
                  const { txid, vout } = formatOutpoint(utxo.outpoint);
                  const btcAmount = satoshisToAmount(utxo.value);
                  return (
                    <div
                      key={idx}
                      style={{
                        marginBottom: 8,
                        padding: "8px",
                        backgroundColor: "var(--bg-card)",
                        borderRadius: "6px",
                        fontFamily: "monospace",
                        fontSize: "13px",
                      }}
                    >
                      <Link
                        href={`https://nullpool.space/tx/${txid}:${vout}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {txid}:{vout}
                      </Link>{" "}
                      <Text strong>{utxo.value.toLocaleString()} sats</Text>{" "}
                      <Text type="secondary">(=)</Text>{" "}
                      <Text strong>{btcAmount} BTC</Text>
                    </div>
                  );
                })}
                <div
                  style={{
                    marginTop: 10,
                    padding: "10px",
                    backgroundColor: "rgba(255, 125, 71, 0.1)",
                    borderRadius: "6px",
                    fontWeight: "bold",
                  }}
                >
                  Total: {totalAvailable.toLocaleString()} sats (
                  {satoshisToAmount(totalAvailable)} BTC)
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 20 }}>
            <div style={{ fontWeight: "bold", fontSize: "16px", marginBottom: 10 }}>
              Locked Balance:
            </div>
            {lockedUtxos.length === 0 ? (
              <Text type="secondary">No locked UTXOs</Text>
            ) : (
              <div>
                {lockedUtxos.map((utxo, idx) => {
                  const { txid, vout } = formatOutpoint(utxo.outpoint);
                  const btcAmount = satoshisToAmount(utxo.value);
                  return (
                    <div
                      key={idx}
                      style={{
                        marginBottom: 12,
                        padding: "10px",
                        backgroundColor: "rgba(255, 125, 71, 0.05)",
                        borderRadius: "6px",
                        border: `1px solid rgba(255, 125, 71, 0.2)`,
                      }}
                    >
                      <div style={{ marginBottom: 6, fontFamily: "monospace", fontSize: "13px" }}>
                        <Link
                          href={`https://ordiscan.com/tx/${txid}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {txid}:{vout}
                        </Link>{" "}
                        <Text strong>{utxo.value.toLocaleString()} sats</Text>{" "}
                        <Text type="secondary">(=)</Text>{" "}
                        <Text strong>{btcAmount} BTC</Text>
                      </div>
                      {utxo.inscriptions.length > 0 && (
                        <div style={{ marginTop: 6, fontSize: "12px" }}>
                          <Text type="secondary">Inscriptions: </Text>
                          {utxo.inscriptions.map((inscriptionId, i) => (
                            <Link
                              key={i}
                              href={`https://ordiscan.com/inscription/${inscriptionId}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ marginLeft: 4 }}
                            >
                              {inscriptionId.slice(0, 8)}...
                            </Link>
                          ))}
                        </div>
                      )}
                      {utxo.runes.length > 0 && (
                        <div style={{ marginTop: 6, fontSize: "12px" }}>
                          <Text type="secondary">Runes: </Text>
                          {utxo.runes.map((rune, i) => (
                            <span key={i} style={{ marginLeft: 4 }}>
                              <Text strong>{rune.name}</Text>{" "}
                              <Text type="secondary">({rune.balance})</Text>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div
                  style={{
                    marginTop: 10,
                    padding: "10px",
                    backgroundColor: "rgba(255, 125, 71, 0.1)",
                    borderRadius: "6px",
                    fontWeight: "bold",
                  }}
                >
                  Total: {totalLocked.toLocaleString()} sats (
                  {satoshisToAmount(totalLocked)} BTC)
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && utxos.length === 0 && !error && address && (
        <div style={{ marginTop: 20, textAlign: "center", color: "var(--text-secondary)" }}>
          Enter an address and click "Load UTXOs" to fetch the UTXO list
        </div>
      )}
    </Card>
  );
}

