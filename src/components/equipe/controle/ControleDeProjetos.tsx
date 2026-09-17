import { useEffect, useMemo, useRef, useState } from 'react';

import { AreaLoader } from '@/components/equipe/AreaLoader';
import { ControleDeProjetosTabela } from '@/components/equipe/controle/ControleDeProjetosTabela';
import { ControleDeProjetosToolbar } from '@/components/equipe/controle/ControleDeProjetosToolbar';
import { ProjetoDeleteDialog } from '@/components/equipe/projetos-cadastro/ProjetoDeleteDialog';
import { ProjetoDialog } from '@/components/equipe/projetos-cadastro/ProjetoDialog';
import { ProjetosCadastroContext } from '@/components/equipe/projetos-cadastro/ProjetosCadastroContext';
import { Card, CardContent } from '@/components/ui/card';
import { useDomainControleProjetos } from '@/hooks/useDomainControleProjetos';
import { useProjetosCadastroController } from '@/hooks/useProjetosCadastroController';
import { AREAS } from '@/lib/nomeDaArea';
import {
  AGRUPAMENTO_PADRAO,
  FILTROS_VAZIOS,
  GRUPO_SEM_PROJETO,
  ORDEM_INICIAL,
  agruparControle,
  filtrarControle,
  opcoesDoControle,
  ordenarControle,
  proximaOrdemDoControle,
  type AgrupamentoDoControle,
  type AreaDoControle,
  type ColunaDoControle,
  type FiltrosDoControle,
  type LinhaDoControle,
  type OrdemDoControle,
} from '@/lib/controleDeProjetos';

/**
 * O miolo do Controle de Projetos, servindo OSG e Tax.
 *
 * A TELA INTEIRA MORA AQUI, e as duas páginas são só o invólucro de área: elas
 * escolhem o layout (que é quem sabe da barra e do cabeçalho) e passam a área.
 * Cópia por área é o que esta base já pagou três vezes — o fundo de página em
 * cinco layouts, o título em seis, o nome da área em nove pontos —, e a frase
 * que ficou daquelas três vale aqui: decisão repetida por arquivo diverge, e
 * não avisa.
 *
 * O grão é o PRODUTO CONTRATADO da OS, e o que muda entre as duas áreas é só o
 * cluster que o hook resolve. O resto — filtros, ordenação, agrupamento, o
 * modal — é o mesmo código.
 *
 * SOBRE O MODAL: é o MESMO `ProjetoDialog` da tela de Projetos, montado sobre o
 * `ProjetosCadastroContext` com o controller de lá. O que se edita aqui aparece
 * nas duas telas porque é o mesmo código gravando na mesma tabela; formulário
 * próprio seria uma segunda verdade sobre `org_projects`.
 */
export function ControleDeProjetos({ area }: { area: AreaDoControle }) {
  const { linhas, isLoading, error } = useDomainControleProjetos(area);
  const projetos = useProjetosCadastroController(area);

  const [filtros, setFiltros] = useState<FiltrosDoControle>(FILTROS_VAZIOS);
  // Abre por Data Fim, o prazo mais próximo em cima. O terceiro clique num
  // cabeçalho volta para a ordem de referência (cliente, área, produto), que é
  // outra coisa — ver `ORDEM_INICIAL`.
  const [ordem, setOrdem] = useState<OrdemDoControle>(ORDEM_INICIAL);
  // Abre PLANA. O agrupamento é escolha da barra — ver `agruparControle`.
  const [agrupamento, setAgrupamento] = useState<AgrupamentoDoControle>(AGRUPAMENTO_PADRAO);

  const visiveis = useMemo(
    () => ordenarControle(filtrarControle(linhas, filtros), ordem),
    [linhas, filtros, ordem],
  );
  const opcoes = useMemo(() => opcoesDoControle(linhas), [linhas]);
  const vencidas = useMemo(() => visiveis.filter((linha) => linha.prazoVencido).length, [visiveis]);
  const grupos = useMemo(() => agruparControle(visiveis, agrupamento), [visiveis, agrupamento]);

  /**
   * Os grupos FECHADOS, e não os abertos: grupo que a pessoa nunca tocou abre
   * aberto, então o conjunto vazio é o estado certo ao ligar o agrupamento.
   *
   * A exceção é o "sem projeto aberto" do critério executor, que tem 127 das
   * 169 linhas da OSG em produção e, aberto, empurraria todo o resto para fora
   * da tela. O cabeçalho com a contagem já diz o tamanho sem custar a rolagem.
   *
   * Guardado por CHAVE, e não por índice, para sobreviver ao filtro que
   * reordena os grupos — e zerado ao trocar de critério, porque as chaves de um
   * critério não querem dizer nada no outro.
   */
  const [fechados, setFechados] = useState<Set<string>>(new Set());
  useEffect(
    () => setFechados(new Set(agrupamento === 'executor' ? [GRUPO_SEM_PROJETO] : [])),
    [agrupamento],
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
   * Os dois caminhos existem porque 127 dos 169 produtos contratados da OSG não
   * têm projeto nenhum em produção — para eles, "delegar o responsável" é criar
   * o projeto, não preencher um campo.
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
    <ProjetosCadastroContext.Provider value={projetos}>
      <Card>
        <CardContent className="space-y-4 p-6">
          {error ? (
            <p className="py-8 text-center text-sm text-destructive">
              Não foi possível carregar as ordens de serviço. Recarregue a página.
            </p>
          ) : isLoading ? (
            <div className="flex justify-center py-12">
              <AreaLoader area={area} size={24} label="Carregando ordens de serviço" />
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
                agrupamento={agrupamento}
                setAgrupamento={setAgrupamento}
              />
              <ControleDeProjetosTabela
                linhas={visiveis}
                grupos={grupos}
                ordem={ordem}
                onOrdenar={(campo: ColunaDoControle) =>
                  setOrdem((atual) => proximaOrdemDoControle(atual, campo))
                }
                fechados={fechados}
                onAlternar={(chave) =>
                  setFechados((atuais) => {
                    const proximo = new Set(atuais);
                    if (proximo.has(chave)) proximo.delete(chave);
                    else proximo.add(chave);
                    return proximo;
                  })
                }
                onAbrirLinha={abrirLinha}
                agrupadoPorCliente={agrupamento === 'cliente'}
                nomeDaArea={AREAS[area].nome}
              />
            </>
          )}
        </CardContent>
      </Card>
      <ProjetoDialog />
      <ProjetoDeleteDialog />
    </ProjetosCadastroContext.Provider>
  );
}
