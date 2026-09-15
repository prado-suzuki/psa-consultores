import { AdmFinLayout } from '@/components/equipe/adm-fin/AdmFinLayout';
import { TabelaFaturamentoOs } from '@/components/equipe/adm-fin/TabelaFaturamentoOs';
import { useDomainFaturamentoOs } from '@/hooks/useDomainFaturamentoOs';

/**
 * Dashboard da Adm & Fin: as OS na ordem em que entraram, com os dados de
 * faturamento de cada uma.
 *
 * É a aba de Faturamento do cadastro de cliente virada do avesso. Lá se pergunta
 * "como fatura esta OS deste cliente" e a resposta exige abrir o cliente e
 * escolher a OS; aqui a pergunta é "o que entrou, e em que ordem", que é a de
 * quem fatura — e essa a outra tela não responde por nenhum caminho.
 *
 * SEM RECORTE DE CLUSTER, pelo mesmo motivo da tela de Clientes desta área: a
 * Adm & Fin fatura para o grupo inteiro (ver `AdmFinClientes`). Quem limita o que
 * cada pessoa enxerga é a RLS, não um filtro de tela.
 */
const AdmFinDashboard = () => {
  const { linhas, isLoading, error } = useDomainFaturamentoOs();

  return (
    <AdmFinLayout
      title="Dashboard"
      subtitle="Ordens de serviço e faturamento — as mais recentes no topo"
    >
      <TabelaFaturamentoOs linhas={linhas} isLoading={isLoading} error={error} />
    </AdmFinLayout>
  );
};

export default AdmFinDashboard;
