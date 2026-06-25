import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardEmbedView } from '@/components/dashboards/DashboardEmbedView';

/**
 * Visualização interna do PERDCOMP (Digital DEV) — DB-driven, com controle de acesso.
 * Cadastre o(s) dashboard(s) com target_page = "dev_perdcomp".
 *
 * Atenção: se o relatório do Looker já estiver com a Consulta Personalizada de RLS
 * por id_cliente (param vazio = fail-closed), um cadastro com filter_type="nenhum"
 * mostrará VAZIO. Para a visão interna ver tudo, use uma fonte/relatório SEM o
 * filtro de RLS (decisão de Data Studio, fora do código do app).
 */
const PerdcompDashboard = () => {
  const navigate = useNavigate();

  return (
    <DevLayout
      title="Dashboard PERDCOMP"
      subtitle="Visualização incorporada do Looker Studio para acompanhamento do PERDCOMP"
      headerActions={
        <Button variant="outline" onClick={() => navigate('/equipe/dev/perdcomp')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para PERDCOMP
        </Button>
      }
    >
      <Card className="overflow-hidden border-slate-200/70 shadow-sm">
        <CardContent className="p-2 md:p-3">
          <DashboardEmbedView
            targetPage="dev_perdcomp"
            emptyMessage="Nenhum dashboard PERDCOMP liberado para o seu usuário."
          />
        </CardContent>
      </Card>
    </DevLayout>
  );
};

export default PerdcompDashboard;
