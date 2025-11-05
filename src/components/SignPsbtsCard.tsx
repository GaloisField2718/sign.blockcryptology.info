import React, { useState } from 'react';
import { Button, Card, Input, Space, Divider, message, Alert, Checkbox } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface PsbtOptions {
  autoFinalize?: boolean;
  broadcast?: boolean;
}

interface PsbtItem {
  psbtHex: string;
  options: PsbtOptions;
}

export function SignPsbtsCard() {
  const [psbts, setPsbts] = useState<PsbtItem[]>([
    { psbtHex: '', options: { autoFinalize: false, broadcast: false } },
    { psbtHex: '', options: { autoFinalize: false, broadcast: false } },
  ]);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const addPsbt = () => {
    setPsbts([
      ...psbts,
      { psbtHex: '', options: { autoFinalize: false, broadcast: false } },
    ]);
  };

  const removePsbt = (index: number) => {
    const newPsbts = [...psbts];
    newPsbts.splice(index, 1);
    setPsbts(newPsbts);
  };

  const updatePsbt = (index: number, psbtHex: string) => {
    const newPsbts = [...psbts];
    newPsbts[index] = {
      ...newPsbts[index],
      psbtHex,
    };
    setPsbts(newPsbts);
  };

  const updatePsbtOptions = (
    index: number,
    field: keyof PsbtOptions,
    value: boolean
  ) => {
    const newPsbts = [...psbts];
    newPsbts[index] = {
      ...newPsbts[index],
      options: {
        ...newPsbts[index].options,
        [field]: value,
      },
    };
    setPsbts(newPsbts);
  };

  const handleSignPsbts = async () => {
    // Validate all PSBTs have hex
    const emptyPsbts = psbts.filter((psbt) => !psbt.psbtHex.trim());
    if (emptyPsbts.length > 0) {
      setError('Please fill in all PSBT hex strings');
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);

    try {
      const psbtHexs = psbts.map((item) => item.psbtHex);
      const options = psbts.map((item) => item.options);

      const signatures = await (window as any).unisat.signPsbts(
        psbtHexs,
        options
      );
      setResults(signatures);
      message.success('All PSBTs signed successfully!');
    } catch (e: any) {
      const errorMessage =
        e?.message || e?.toString() || 'Failed to sign PSBTs';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const doc_url =
    'https://docs.unisat.io/dev/unisat-developer-center/unisat-wallet#signpsbts';

  return (
    <Card size="small" title="Sign Multiple PSBTs" className="function-card">
      <div style={{ textAlign: 'left', marginTop: 10 }}>
        <div style={{ fontWeight: 'bold' }}>Docs:</div>
        <a
          href={doc_url}
          target="_blank"
          rel="noreferrer"
          style={{ wordBreak: 'break-all' }}
        >
          {doc_url}
        </a>
      </div>

      <div style={{ textAlign: 'left', marginTop: 10 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 10 }}>PSBTs:</div>

        {psbts.map((psbt, index) => (
          <div key={index} style={{ marginBottom: 15 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontWeight: 'bold' }}>PSBT {index + 1}:</span>
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => removePsbt(index)}
                  disabled={psbts.length <= 1}
                />
              </div>
              <TextArea
                value={psbt.psbtHex}
                onChange={(e) => updatePsbt(index, e.target.value)}
                placeholder="Enter PSBT Hex"
                autoSize={{ minRows: 2, maxRows: 6 }}
                style={{ fontFamily: 'monospace' }}
              />
              <div
                style={{
                  backgroundColor: '#f5f5f5',
                  padding: '10px',
                  borderRadius: '4px',
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                  Options:
                </div>
                <Space direction="vertical" size="small">
                  <Checkbox
                    checked={psbt.options.autoFinalize || false}
                    onChange={(e) =>
                      updatePsbtOptions(index, 'autoFinalize', e.target.checked)
                    }
                  >
                    autoFinalize
                  </Checkbox>
                  <Checkbox
                    checked={psbt.options.broadcast || false}
                    onChange={(e) =>
                      updatePsbtOptions(index, 'broadcast', e.target.checked)
                    }
                  >
                    broadcast
                  </Checkbox>
                </Space>
              </div>
            </Space>

            {index < psbts.length - 1 && (
              <Divider style={{ margin: '15px 0' }} />
            )}
          </div>
        ))}

        <Button
          type="dashed"
          onClick={addPsbt}
          style={{ width: '100%', marginTop: 10 }}
          icon={<PlusOutlined />}
        >
          Add PSBT
        </Button>
      </div>

      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginTop: 10, textAlign: 'left' }}
          closable
          onClose={() => setError('')}
        />
      )}

      {results.length > 0 && (
        <div style={{ textAlign: 'left', marginTop: 10 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 10 }}>
            Signed PSBTs:
          </div>
          {results.map((result, index) => (
            <div
              key={index}
              style={{
                wordWrap: 'break-word',
                marginBottom: 10,
                backgroundColor: '#f5f5f5',
                padding: '8px',
                borderRadius: '4px',
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                PSBT {index + 1}:
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                {result}
              </div>
            </div>
          ))}
        </div>
      )}

      <Button
        type="primary"
        style={{ marginTop: 10 }}
        onClick={handleSignPsbts}
        loading={loading}
        disabled={psbts.some((psbt) => !psbt.psbtHex)}
        block
      >
        Sign All PSBTs
      </Button>
    </Card>
  );
}
