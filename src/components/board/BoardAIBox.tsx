import React, { useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { renderSimpleBoldMarkdown } from '@/lib/safeBoldMarkdown';

interface BoardAIBoxProps {
  edgeFn?: string;
  payload?: Record<string, any>;
  data?: { sintese: string; bullets: string[] } | null;
  onGenerate?: () => void;
  loading?: boolean;
  label?: string;
  className?: string;
}

export const BoardAIBox: React.FC<BoardAIBoxProps> = ({
  edgeFn, payload, data: externalData, onGenerate, loading: externalLoading,
  label = 'Análise de IA', className = '',
}) => {
  const [internalData, setInternalData] = useState<{ sintese: string; bullets: string[] } | null>(null);
  const [internalLoading, setInternalLoading] = useState(false);

  const data = externalData ?? internalData;
  const loading = externalLoading ?? internalLoading;

  const handleGenerate = async () => {
    if (onGenerate) { onGenerate(); return; }
    if (!edgeFn) return;
    setInternalLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke(edgeFn, { body: payload });
      if (error) throw error;
      setInternalData(result);
    } catch {
      setInternalData({ sintese: 'Não foi possível gerar a análise no momento.', bullets: [] });
    }
    setInternalLoading(false);
  };

  return (
    <div className={`ai-box ${className}`} data-reveal>
      <div className="ai-lbl">
        <Sparkles style={{ width: 11, height: 11 }} />
        {label}
        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{
            marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--board-v4-accent)', fontSize: 11, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <RefreshCw style={{ width: 11, height: 11 }} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Gerando...' : 'Gerar'}
        </button>
      </div>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[80, 60, 70].map((w, i) => (
            <div key={i} style={{ height: 10, borderRadius: 4, background: 'rgba(75,99,247,.08)', width: `${w}%`, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="ai-text">{renderSimpleBoldMarkdown(data.sintese)}</div>
          {data.bullets.length > 0 && (
            <div className="ai-bullets">
              {data.bullets.map((b, i) => <div key={i} className="ai-b">{b}</div>)}
            </div>
          )}
        </>
      ) : (
        <div className="ai-text" style={{ color: 'var(--board-v4-ink3)' }}>Clique em "Gerar" para obter a análise com IA.</div>
      )}
    </div>
  );
};
