import { useMemo, useState } from 'react';

import { AreaLoader } from '@/components/equipe/AreaLoader';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { ControleDeProjetosTabela } from '@/components/equipe/osg/controle/ControleDeProjetosTabela';
import { ControleDeProjetosToolbar } from '@/components/equipe/osg/controle/ControleDeProjetosToolbar';
import { Card, CardContent } from '@/components/ui/card';
import { useDomainOsgControleProjetos } from '@/hooks/useDomainOsgControleProjetos';
import { useTelaDeTrabalhoLargo } from '@/hooks/useSidebarRecolhimentoController';
import {
  FILTROS_VAZIOS,
  ORDEM_PADRAO,
  filtrarControle,
  opcoesDoControle,
  ordenarControle,
  proximaOrdemDoControle,
  type ColunaDoControle,
  type FiltrosDoControle,
  type OrdemDoControle,
} from '@/lib/osgControleDeProjetos';

/**
 * Controle de Projetos da OSG — a tela que substitui a planilha
 * `Relação de Projetos - OSG.xlsx` (pasta `05_Controle_de_Projetos` do Drive,
 * que é de onde vem o nome desta tela).
 *
 * O grão é a ORDEM DE SERVIÇO, não o projeto: a planilha tem uma linha por
 * engajamento do cliente, e `org_projects` tem uma linha por produto contratado
 * (Di Domenico tem quatro, todas na mesma OS). Medido em produção em 15/09/2026,
 * ler `ordem_servico` alcança 84 clientes da OSG contra 23 por `org_projects`.
 *
 * Fica em Projetos e não em Gerencial de propósito: a Gerencial está atrás da
 * `LiderRoute`, e quem alimenta a planilha hoje não é líder.
 *
 * SEIS das catorze colunas da planilha estão aqui, e as outras dependem de
 * migration — código do oneproject, área líder, área tax e o bloco de
 * governança. O que falta, e por quê, está em
 * `docs/osg/relacao-de-projetos-planilha-x-ferramenta.md`.
 */
const OsgControleProjetos = () => {
  // Nove colunas: a barra recolhe sozinha, como nas outras telas largas.
  useTelaDeTrabalhoLargo();

  const { linhas, isLoading, error } = useDomainOsgControleProjetos();
  const [filtros, setFiltros] = useState<FiltrosDoControle>(FILTROS_VAZIOS);
  const [ordem, setOrdem] = useState<OrdemDoControle>(ORDEM_PADRAO);

  const visiveis = useMemo(
    () => ordenarControle(filtrarControle(linhas, filtros), ordem),
    [linhas, filtros, ordem],
  );
  const opcoes = useMemo(() => opcoesDoControle(linhas), [linhas]);
  const vencidas = useMemo(() => visiveis.filter((linha) => linha.prazoVencido).length, [visiveis]);

  return (
    <OsgLayout title="Controle de Projetos" subtitle="Onde cada cliente está, por ordem de serviço">
      <Card>
        <CardContent className="space-y-4 p-6">
          {error ? (
            <p className="py-8 text-center text-sm text-destructive">
              Não foi possível carregar as ordens de serviço. Recarregue a página.
            </p>
          ) : isLoading ? (
            <div className="flex justify-center py-12">
              <AreaLoader area="osg" size={24} label="Carregando ordens de serviço" />
            </div>
          ) : (
            <>
              <ControleDeProjetosToolbar
                filtros={filtros}
                setFiltros={setFiltros}
                opcoes={opcoes}
                total={linhas.length}
                visiveis={visiveis.length}
                vencidas={vencidas}
              />
              <ControleDeProjetosTabela
                linhas={visiveis}
                ordem={ordem}
                onOrdenar={(campo: ColunaDoControle) =>
                  setOrdem((atual) => proximaOrdemDoControle(atual, campo))
                }
              />
            </>
          )}
        </CardContent>
      </Card>
    </OsgLayout>
  );
};

export default OsgControleProjetos;
