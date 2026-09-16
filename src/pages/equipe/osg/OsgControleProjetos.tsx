import { useEffect, useMemo, useRef, useState } from 'react';

import { AreaLoader } from '@/components/equipe/AreaLoader';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { ControleDeProjetosTabela } from '@/components/equipe/osg/controle/ControleDeProjetosTabela';
import { ControleDeProjetosToolbar } from '@/components/equipe/osg/controle/ControleDeProjetosToolbar';
import { ProjetoDeleteDialog } from '@/components/equipe/projetos-cadastro/ProjetoDeleteDialog';
import { ProjetoDialog } from '@/components/equipe/projetos-cadastro/ProjetoDialog';
import { ProjetosCadastroContext } from '@/components/equipe/projetos-cadastro/ProjetosCadastroContext';
import { Card, CardContent } from '@/components/ui/card';
import { useProjetosCadastroController } from '@/hooks/useProjetosCadastroController';
import { useDomainOsgControleProjetos } from '@/hooks/useDomainOsgControleProjetos';
import { useTelaDeTrabalhoLargo } from '@/hooks/useSidebarRecolhimentoController';
import {
  FILTROS_VAZIOS,
  ORDEM_INICIAL,
  GRUPO_SEM_PROJETO,
  agruparPorExecutor,
  filtrarControle,
  opcoesDoControle,
  ordenarControle,
  proximaOrdemDoControle,
  type ColunaDoControle,
  type FiltrosDoControle,
  type LinhaDoControle,
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

  // O MESMO controller da tela de Projetos. É ele que traz o `ProjetoDialog`
  // inteiro para cá, com as mutations de lá: o que se edita neste modal aparece
  // nas duas telas porque é o mesmo código gravando na mesma tabela. Formulário
  // próprio aqui seria uma segunda verdade sobre `org_projects`.
  const projetos = useProjetosCadastroController('osg');
  const [filtros, setFiltros] = useState<FiltrosDoControle>(FILTROS_VAZIOS);
  // Abre por Data Fim, o prazo mais próximo em cima de cada grupo. O terceiro
  // clique num cabeçalho volta para a ordem de referência (cliente, área,
  // produto), que é outra coisa — ver `ORDEM_INICIAL`.
  const [ordem, setOrdem] = useState<OrdemDoControle>(ORDEM_INICIAL);

  const visiveis = useMemo(
    () => ordenarControle(filtrarControle(linhas, filtros), ordem),
    [linhas, filtros, ordem],
  );
  const opcoes = useMemo(() => opcoesDoControle(linhas), [linhas]);
  const vencidas = useMemo(() => visiveis.filter((linha) => linha.prazoVencido).length, [visiveis]);
  const grupos = useMemo(() => agruparPorExecutor(visiveis), [visiveis]);

  // Todo grupo abre ABERTO, menos o "sem projeto aberto", que tem 127 das 169
  // linhas em produção e empurraria todo o resto para fora da tela. Guardado por
  // CHAVE de grupo, e não por índice, para o conjunto sobreviver à mudança de
  // filtro que reordena os grupos.
  const [fechados, setFechados] = useState<Set<string>>(new Set([GRUPO_SEM_PROJETO]));
  const abertos = useMemo(
    () => new Set(grupos.map((grupo) => grupo.executor).filter((nome) => !fechados.has(nome))),
    [grupos, fechados],
  );

  /**
   * O produto que a linha pediu, esperando a OS dele carregar.
   *
   * Existe porque o prefill NÃO cabe num gesto só, e a primeira versão tentou:
   * o controller tem um efeito que, ao trocar a OS, limpa produto e serviço de
   * propósito (os dois pertencem à OS anterior) e busca as datas em `clienteOS`,
   * que só carrega depois que o cliente entra no formulário. Definir cliente, OS
   * e produto no mesmo clique fazia o efeito apagar o produto e não achar as
   * datas — o modal abria com o produto errado e o período vazio.
   *
   * Então a intenção fica guardada aqui e é aplicada quando o controller já sabe
   * responder. Quem manda na invalidação continua sendo ele.
   */
  const pendente = useRef<{ osId: string; produtoId: string } | null>(null);

  const { clienteOS, selectedOsId, selectedOsProdutos, setSelectedOsId, setSelectedProdutoId } =
    projetos;

  // Etapa 2: a OS já está na lista do cliente, então dá para selecioná-la.
  useEffect(() => {
    const alvo = pendente.current;
    if (!alvo || selectedOsId === alvo.osId) return;
    if (!clienteOS.some((os) => os.id === alvo.osId)) return;
    setSelectedOsId(alvo.osId);
  }, [clienteOS, selectedOsId, setSelectedOsId]);

  // Etapa 3: os produtos da OS chegaram, e o efeito do controller já limpou o
  // campo. Agora a escolha da linha vale.
  useEffect(() => {
    const alvo = pendente.current;
    if (!alvo || selectedOsId !== alvo.osId) return;
    if (!selectedOsProdutos.some((produto) => produto.produto_segmento_id === alvo.produtoId)) return;
    setSelectedProdutoId(alvo.produtoId);
    pendente.current = null;
  }, [selectedOsId, selectedOsProdutos, setSelectedProdutoId]);

  /**
   * Clique na linha: edita o projeto daquele produto, ou abre a criação já
   * apontada para ele.
   *
   * Os dois caminhos existem porque 127 dos 169 produtos contratados não têm
   * projeto nenhum em produção — para eles, "delegar o responsável" é criar o
   * projeto, não preencher um campo.
   */
  const abrirLinha = (linha: LinhaDoControle) => {
    const existente = projetos.projects.find(
      (projeto) =>
        projeto.ordem_servico_id === linha.osId && projeto.produto_segmento_id === linha.produtoId,
    );
    if (existente) {
      pendente.current = null;
      projetos.handleOpenModal(existente);
      return;
    }
    // Etapa 1: só o cliente e o nome. A OS e o produto ficam pendentes, porque
    // o controller ainda não tem como resolver nenhum dos dois.
    pendente.current = { osId: linha.osId, produtoId: linha.produtoId };
    projetos.handleOpenModal();
    projetos.setFormData((anterior) => ({
      ...anterior,
      name: linha.produtoNome,
      external_client_id: linha.clienteId,
    }));
  };

  return (
    <OsgLayout title="Controle de Projetos" subtitle="Onde cada cliente está, por ordem de serviço">
      <ProjetosCadastroContext.Provider value={projetos}>
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
                grupos={grupos}
                ordem={ordem}
                onOrdenar={(campo: ColunaDoControle) =>
                  setOrdem((atual) => proximaOrdemDoControle(atual, campo))
                }
                abertos={abertos}
                onAbrirLinha={abrirLinha}
                onAlternar={(executor) =>
                  setFechados((atuais) => {
                    const proximo = new Set(atuais);
                    if (proximo.has(executor)) proximo.delete(executor);
                    else proximo.add(executor);
                    return proximo;
                  })
                }
              />
            </>
          )}
          </CardContent>
        </Card>
        <ProjetoDialog />
        <ProjetoDeleteDialog />
      </ProjetosCadastroContext.Provider>
    </OsgLayout>
  );
};

export default OsgControleProjetos;
