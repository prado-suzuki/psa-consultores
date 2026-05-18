import { useMemo, useState } from 'react';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useUserEstrutura } from '@/hooks/useUserEstrutura';
import { buildLookerEmbedUrl } from '@/lib/lookerEmbed';

type Dashboard = {
  id: string;
  label: string;
  embedUrl: string;
  clusterParamNames?: string[];
};

const GERENCIAR_DADOS_DASHBOARDS: Dashboard[] = [
  {
    id: 'controle-uso-envio-documentos',
    label: 'Controle de uso e envio de documentos',
    embedUrl:
      'https://datastudio.google.com/embed/reporting/cfed44c5-e7f6-42b2-a6b4-c6399e33d063/page/p_c97l3bpm3d',
    clusterParamNames: ['ds0.cluster_id'],
  },
  {
    id: 'controle-uso-envio-documentos-detalhado',
    label: 'Controle de uso e envio de documentos (Detalhado)',
    embedUrl:
      'https://datastudio.google.com/embed/reporting/dc399d74-18be-453b-814f-f124f18fdb18/page/p_c97l3bpm3d',
    clusterParamNames: ['ds0.cluster_id'],
  },
];

const GerenciarDadosDashboards = () => {
  const { user } = useAuth();
  const { clusters } = useUserEstrutura(user?.id);
  const clusterId = clusters[0]?.id;

  const [selectedDashboardId, setSelectedDashboardId] = useState<string>(GERENCIAR_DADOS_DASHBOARDS[0].id);
  const selectedDashboard =
    GERENCIAR_DADOS_DASHBOARDS.find((dashboard) => dashboard.id === selectedDashboardId) ??
    GERENCIAR_DADOS_DASHBOARDS[0];

  const iframeUrl = useMemo(
    () => buildLookerEmbedUrl(selectedDashboard.embedUrl, selectedDashboard.clusterParamNames, clusterId),
    [selectedDashboard, clusterId],
  );

  return (
    <DevLayout
      title="Dashboards"
      subtitle="Dashboards ligados a gestao de dados"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0">
            <Label className="text-xs font-medium mb-1 block text-muted-foreground">
              Selecionar Dashboard
            </Label>
            <Select value={selectedDashboard.id} onValueChange={setSelectedDashboardId}>
              <SelectTrigger className="w-[340px] h-10 rounded-full border bg-white/90 px-3 text-left text-sm shadow-none focus:ring-2 focus:ring-ring focus:ring-offset-0">
                <SelectValue placeholder="Selecione um dashboard" />
              </SelectTrigger>
              <SelectContent>
                {GERENCIAR_DADOS_DASHBOARDS.map((dashboard) => (
                  <SelectItem key={dashboard.id} value={dashboard.id}>
                    {dashboard.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="w-full overflow-auto flex justify-center">
          <iframe
            key={`${selectedDashboard.id}-${clusterId ?? 'no-cluster'}`}
            width="1280"
            height="925"
            src={iframeUrl}
            title={selectedDashboard.label}
            frameBorder={0}
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          />
        </div>
      </div>
    </DevLayout>
  );
};

export default GerenciarDadosDashboards;
