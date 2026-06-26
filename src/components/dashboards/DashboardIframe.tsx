import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { EMBED_REASON_LABEL, type EmbedResolution } from '@/hooks/useDashboardEmbedUrl';
import { DASHBOARD_ASPECT_RATIO } from '@/config/dashboardPages';
import { DashboardLoadingOverlay } from './DashboardLoadingOverlay';

const SANDBOX = 'allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox';

/**
 * Controla o overlay de "carregando": fica visível desde a troca de URL até o
 * onLoad do iframe, respeitando um mínimo (pra esconder o relatório "se montando"
 * depois do load) e um teto de segurança caso o onLoad não dispare.
 */
function useIframeLoading(url: string, enabled: boolean, minMs = 3200, maxMs = 8000) {
  const [loading, setLoading] = useState(enabled);
  const startRef = useRef(0);

  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    setLoading(true);
    startRef.current = Date.now();
    const cap = setTimeout(() => setLoading(false), maxMs);
    return () => clearTimeout(cap);
  }, [url, enabled, maxMs]);

  const onLoad = () => {
    if (!enabled) return;
    const elapsed = Date.now() - startRef.current;
    const remaining = Math.max(0, minMs - elapsed);
    setTimeout(() => setLoading(false), remaining);
  };

  return { loading, onLoad };
}

/** Iframe em LARGURA CHEIA (grande), altura = largura ÷ aspect, rola na vertical. */
function FittedIframe({ url, title, aspect, showLoading }: { url: string; title: string; aspect: number; showLoading: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const { loading, onLoad } = useIframeLoading(url, showLoading);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="relative h-full w-full">
      <div ref={ref} className="h-full w-full overflow-y-auto overflow-x-hidden">
        {w > 0 && (
          <iframe
            key={url}
            src={url}
            title={title}
            width={w}
            height={Math.round(w / aspect) + 48}
            frameBorder={0}
            style={{ border: 0, display: 'block' }}
            allowFullScreen
            loading="lazy"
            onLoad={onLoad}
            sandbox={SANDBOX}
          />
        )}
      </div>
      {showLoading && loading && <DashboardLoadingOverlay />}
    </div>
  );
}

/**
 * Iframe responsivo em LARGURA CHEIA (consumidor): largura = 100% do contêiner,
 * altura = largura ÷ aspect. Sem contêiner de scroll próprio — a PÁGINA rola.
 * Não sobra faixa lateral.
 */
function ResponsiveIframe({ url, title, aspect, showLoading }: {
  url: string; title: string; aspect: number; showLoading: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const { loading, onLoad } = useIframeLoading(url, showLoading);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      {w > 0 && (
        <iframe
          key={url}
          src={url}
          title={title}
          width={w}
          height={Math.round(w / aspect) + 48}
          frameBorder={0}
          style={{ border: 0, display: 'block' }}
          allowFullScreen
          loading="lazy"
          onLoad={onLoad}
          sandbox={SANDBOX}
        />
      )}
      {showLoading && loading && <DashboardLoadingOverlay />}
    </div>
  );
}

/**
 * Render presentational do iframe de um dashboard + estados (loading / fail-closed / ok).
 * Fonte única do iframe — reusado pelo consumidor (DashboardEmbedView) e pelo preview admin.
 */
interface DashboardIframeProps {
  embed: EmbedResolution | undefined;
  isLoading: boolean;
  title: string;
  /** Preenche um contêiner de ALTURA FIXA (preview popup) com scroll interno. Senão, largura cheia responsiva (a página rola). */
  fill?: boolean;
  /** Proporção (largura ÷ altura) da página do relatório. */
  aspect?: number;
  /** Mostra o overlay animado de "Carregando relatório…" sobre o iframe. */
  showLoading?: boolean;
}

export function DashboardIframe({
  embed, isLoading, title, fill = false,
  aspect = DASHBOARD_ASPECT_RATIO, showLoading = false,
}: DashboardIframeProps) {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center py-16">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!embed?.ok || !embed.url) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
          <p className="text-sm text-amber-700">
            {EMBED_REASON_LABEL[embed?.reason ?? ''] ?? 'Não foi possível carregar este dashboard.'}
          </p>
        </div>
      </div>
    );
  }

  if (fill) {
    return <FittedIframe url={embed.url} title={title} aspect={aspect} showLoading={showLoading} />;
  }

  return <ResponsiveIframe url={embed.url} title={title} aspect={aspect} showLoading={showLoading} />;
}
