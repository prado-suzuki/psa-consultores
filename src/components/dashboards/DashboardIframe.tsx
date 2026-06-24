import { RefreshCw } from 'lucide-react';
import { EMBED_REASON_LABEL, type EmbedResolution } from '@/hooks/useDashboardEmbedUrl';

/**
 * Render presentational do iframe de um dashboard + estados (loading / fail-closed / ok).
 * Fonte única do iframe — reusado pelo consumidor (DashboardEmbedView) e pelo preview admin.
 */
interface DashboardIframeProps {
  embed: EmbedResolution | undefined;
  isLoading: boolean;
  title: string;
  height?: number;
  /** Largura fixa do iframe (default 1440). Use "100%" no preview em tela cheia. */
  width?: number | string;
}

export function DashboardIframe({ embed, isLoading, title, height = 1080, width = 1440 }: DashboardIframeProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!embed?.ok || !embed.url) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
        <p className="text-sm text-amber-700">
          {EMBED_REASON_LABEL[embed?.reason ?? ''] ?? 'Não foi possível carregar este dashboard.'}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-auto flex justify-center">
      <iframe
        key={embed.url}
        width={width}
        height={height}
        src={embed.url}
        title={title}
        frameBorder={0}
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  );
}
