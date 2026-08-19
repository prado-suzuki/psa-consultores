/**
 * Mockup do cadastro de governança — EDU-14.
 *
 * Tela de mentira: nada salva, nada consulta banco, nada valida. Serve para a
 * consultoria olhar e dizer o que falta, o que sobra e se o nome está certo,
 * antes de existir código de produção.
 *
 * Não tem rota no `App.tsx` de propósito. Abre por
 * `/mockup-cadastro-governanca.html`, no mesmo molde da prévia do Sísifo.
 *
 * COMPOSIÇÃO: segue o padrão de formulário do sistema, o `SecaoFormulario` do
 * cadastro de cliente — seção numerada com dois dígitos, título em caixa alta
 * miúda, barra de acento à esquerda, rótulo EM CIMA do campo e caixa de valor
 * arredondada, em grade de duas colunas. As cores são os tokens da OSG (`osg-canvas` de
 * fundo, `osg-moss` de acento, a escala `osg-50..700`). A lista de campos e a
 * origem de cada um estão em `docs/osg/campos-governanca.md`.
 */
import { Fragment, useState } from 'react';
import { createRoot } from 'react-dom/client';

import {
  ASSUNTOS_MATRIZ,
  CAMPOS_AC_REFLEXO,
  CAMPOS_ACORDO,
  CAMPOS_INSTALACAO,
  CAMPOS_PROTOCOLO_GERAIS,
  CAMPOS_REGIMENTO,
  ELEITOS,
  FAMILIAS_PROTOCOLO,
  GLOSSARIO_PAPEIS,
  GLOSSARIO_RESPOSTAS,
  GRUPOS_BENEFICIARIO,
  ORGAOS,
  PAPEIS_NA_DECISAO,
  RESPOSTAS_CRITERIO,
} from './cadastroGovernancaDados';
import '@/index.css';

import {
  Cabecalho, CampoLeitura, Campos, Escolha, EtiquetaOrigem, Explicando, Glossario, Nota, resumo,
  Rolagem, Secao,
} from './cadastroGovernancaUi';

export const CadastroGovernancaPreview = () => {
  const [explicando, setExplicando] = useState(true);
  const orgaosAtivos = ORGAOS.filter((o) => o.existe);

  return (
    <Explicando.Provider value={explicando}>
      {/*
        `osg-theme` é o que estava faltando, e era a causa de a tela não parecer a
        OSG: as superfícies do tema (fundo areia, branco quente dos cartões, muted
        bege, vermelho carmim, foco musgo) são definidas DENTRO dessa classe no
        `index.css`. Sem ela, `bg-osg-canvas` não resolvia e `bg-background` caía
        no tema neutro padrão, azulado.
      */}
      <main className="osg-theme min-h-screen bg-canvas px-5 pb-24 font-sans text-foreground">
        <div className="mx-auto max-w-[1040px]">
          <header className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-osg-moss pt-10 pb-5">
            <div className="flex flex-col gap-1">
              <span className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-osg-moss">
                PSA · OSG · mockup, nada aqui funciona
              </span>
              <h1 className="text-2xl font-semibold tracking-tight text-osg-700">
                Cadastro de Governança
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setExplicando((v) => !v)}
              className="rounded-md border border-osg-moss bg-osg-moss/10 px-3 py-1.5 text-[12px] font-semibold text-osg-moss"
            >
              {explicando ? 'esconder explicações' : 'explicar campos'}
            </button>
          </header>

          {/* Legenda das três origens. Uma linha, porque a tela é para ler campo. */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-osg-500">
            <span className="flex items-center gap-1.5">
              <EtiquetaOrigem origem="existe" /> o sistema já guarda
            </span>
            <span className="flex items-center gap-1.5">
              <EtiquetaOrigem origem="derivado" /> sai de outro campo
            </span>
            <span className="flex items-center gap-1.5">
              <EtiquetaOrigem origem="novo" /> precisa ser criado
            </span>
            <span className="ml-auto text-osg-300">Cliente fictício; a estrutura é a dos documentos reais.</span>
          </div>

          <Secao
            numero="A"
            titulo="Órgãos de governança"
            produz="nada; alimenta as seções 1, 2 e 3"
            entidade="o cliente / grupo"
            contagem="4 instâncias, marcar quais existem"
            pasta="não é documento"
          >
            <Nota>
              Quais instâncias de decisão existem neste cliente. É o que define as colunas da
              Matriz de Alçadas. A dúvida aberta é se esta lista é fixa ou se sai da estrutura de
              cada cliente, seguindo a cascata conselho, diretoria, administradores do contrato
              social.
            </Nota>
            <div className="flex flex-wrap gap-2 rounded-md border border-osg-100 bg-background p-4">
              {ORGAOS.map((o) => (
                <span
                  key={o.nome}
                  className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-[13px] ${
                    o.existe
                      ? 'border-osg-moss bg-osg-moss/10 font-semibold text-osg-moss'
                      : 'border-osg-100 bg-osg-50/60 text-osg-500'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 rounded border ${
                      o.existe ? 'border-osg-moss bg-osg-moss' : 'border-osg-300'
                    }`}
                  />
                  {o.nome}
                </span>
              ))}
            </div>
          </Secao>

          <Secao
            numero="B"
            titulo="Grupos de pessoas"
            produz="nada; alimenta as seções 2 e 3"
            entidade="as pessoas do cliente"
            contagem="1 rótulo e 1 lista por grupo, mais 2 gerais"
            pasta="não é documento"
          >
            <Nota>
              Como as pessoas se organizam neste cliente. Muda de cliente para cliente: três
              documentos entregues trazem três conjuntos diferentes de grupos, então o rótulo é
              escrito pelo consultor e não escolhido de uma lista. O ramo é o que o Acordo de
              Quotistas usa para ordenar quem tem preferência de compra.
            </Nota>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {GRUPOS_BENEFICIARIO.map((g, i) => (
                <div key={g.rotulo} className="flex flex-col gap-3.5 rounded-md border border-osg-100 bg-muted/70 p-4">
                  <CampoLeitura
                    campo={{
                      rotulo: `Grupo · ${i + 1}`,
                      valor: g.rotulo,
                      explicacao: 'O nome que a família dá a esse conjunto de pessoas. Vira uma coluna do Protocolo.',
                    }}
                  />
                  <CampoLeitura
                    campo={{
                      rotulo: 'Pessoas do grupo',
                      valor: g.pessoas,
                      explicacao: 'Quem está nesse grupo. As pessoas já estão cadastradas; aqui só se diz quem entra onde.',
                      origem: 'existe',
                      tabela: 'pessoa',
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-3">
              <Campos
                campos={[
                  {
                    rotulo: 'Ramo ou Descendentes de',
                    valor: 'RAMO Campos',
                    explicacao: 'Cada filho do fundador origina um ramo. O Acordo de Quotistas usa o ramo para ordenar quem compra a parte de quem sai.',
                  },
                  {
                    rotulo: 'Vota em bloco',
                    valor: 'Sim',
                    explicacao: 'Se o ramo precisa votar unido, com uma posição só. Impede que um primo isolado decida contra o próprio ramo.',
                  },
                ]}
              />
            </div>
          </Secao>

          <Secao
            numero="01"
            titulo="Matriz de Alçadas"
            produz="Matriz de Alçadas"
            entidade="o cliente / grupo"
            contagem={`${ASSUNTOS_MATRIZ.length} assuntos × ${orgaosAtivos.length} órgãos · nenhum já no sistema`}
            pasta="pastas 01 e 04"
          >
            <Nota>
              O documento-eixo, e a primeira tela do fluxo. Antes chamada de Diagnóstico de
              Governança e de Questionário de Governança: os três nomes são o mesmo documento, e
              ficou decidido usar Matriz de Alçadas. Cada linha é um assunto da empresa, cada coluna
              é um órgão, e a célula diz o que aquele órgão faz naquele assunto. A coluna da direita
              é o valor até onde a decisão pode ir sem subir de instância.
            </Nota>
            <Glossario
              titulo="As catorze palavras da célula, e elas não são sinônimos"
              itens={GLOSSARIO_PAPEIS.map((p) => ({ termo: p.papel, significa: p.significa }))}
            />
            <Rolagem>
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <Cabecalho titulos={['Assunto', ...orgaosAtivos.map((o) => o.nome), 'Alçada']} ultimoADireita />
                <tbody>
                  {ASSUNTOS_MATRIZ.map((linha) => (
                    <tr key={linha.assunto}>
                      <th className="border-b border-osg-50 px-3 py-2 text-left font-normal text-osg-700">
                        {linha.assunto}
                      </th>
                      {linha.papeis.map((papel, i) => (
                        <td key={i} className="border-b border-osg-50 px-3 py-2">
                          <Escolha valor={papel} opcoes={PAPEIS_NA_DECISAO} rotulo="Papel na decisão" />
                        </td>
                      ))}
                      <td className="whitespace-nowrap border-b border-osg-50 px-3 py-2 text-right tabular-nums text-osg-500">
                        {linha.alcada ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Rolagem>
          </Secao>

          <Secao
            numero="02"
            titulo="Acordo de Quotistas"
            produz="Acordo de Quotistas"
            entidade="a holding e os sócios"
            contagem={resumo(CAMPOS_ACORDO)}
            pasta="pasta 02"
          >
            <Nota>
              As regras entre os sócios: como se vota, quem pode comprar a parte de quem sai, quanto
              ela vale e onde a briga é resolvida. Só os parâmetros que mudam de cliente para
              cliente; o texto das cláusulas não entra no cadastro.
            </Nota>
            <Campos campos={CAMPOS_ACORDO} />
          </Secao>


          <Secao
            numero="03"
            titulo="Protocolo de Remuneração"
            produz="Protocolo de Remuneração"
            entidade="os grupos de pessoas da seção B"
            contagem={`${FAMILIAS_PROTOCOLO.length} famílias de benefício · ${resumo(CAMPOS_PROTOCOLO_GERAIS)} de regra geral`}
            pasta="pasta 03"
          >
            <Nota>
              O que cada grupo da família recebe da empresa, além de salário: carro, plano de saúde,
              casa, viagem, empréstimo. Cada linha é um benefício, cada coluna é um grupo, e a
              célula diz se aquele grupo tem direito.
            </Nota>
            <Glossario
              titulo="Por que a resposta tem três valores e não é sim ou não"
              itens={GLOSSARIO_RESPOSTAS.map((r) => ({ termo: r.resposta, significa: r.significa }))}
            />
            <Rolagem>
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <Cabecalho titulos={['Critério', ...GRUPOS_BENEFICIARIO.map((g) => g.rotulo), 'Valor']} ultimoADireita />
                <tbody>
                  {FAMILIAS_PROTOCOLO.map((f) => (
                    <Fragment key={f.familia}>
                      <tr className="bg-osg-50/70">
                        <th
                          colSpan={GRUPOS_BENEFICIARIO.length + 2}
                          className="border-b border-osg-100 px-3 py-1.5 text-left text-[13px] font-semibold uppercase tracking-wider text-osg-500"
                        >
                          {f.familia}
                        </th>
                      </tr>
                      {f.criterios.map((c) => (
                        <tr key={c.criterio}>
                          <th className="border-b border-osg-50 px-3 py-2 text-left font-normal text-osg-700">
                            {c.criterio}
                          </th>
                          {c.respostas.map((r, i) => (
                            <td key={i} className="border-b border-osg-50 px-3 py-2">
                              <Escolha valor={r} opcoes={RESPOSTAS_CRITERIO} rotulo="Resposta" />
                            </td>
                          ))}
                          <td className="whitespace-nowrap border-b border-osg-50 px-3 py-2 text-right tabular-nums text-osg-500">
                            {c.valor ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </Rolagem>
            <div className="mt-3">
              <Campos campos={CAMPOS_PROTOCOLO_GERAIS} />
            </div>
          </Secao>

          <Secao
            numero="04"
            titulo="Regimento Interno do Conselho"
            produz="Regimento Interno"
            entidade="o conselho de administração"
            contagem={resumo(CAMPOS_REGIMENTO)}
            pasta="pasta 05"
          >
            <Nota>
              Como o conselho funciona por dentro: quantos membros, de quanto em quanto tempo se
              reúne, quantos votos decidem, o que faz alguém perder a cadeira. O procedimento
              interno diz que este documento é artesanal e pode não ter campo estruturável; o
              exemplo real tem {CAMPOS_REGIMENTO.length} parâmetros objetivos, todos abaixo.
            </Nota>
            <Campos campos={CAMPOS_REGIMENTO} />
          </Secao>

          <Secao
            numero="05"
            titulo="AC Reflexo"
            produz="Alteração Contratual"
            entidade="a holding"
            contagem={resumo(CAMPOS_AC_REFLEXO)}
            pasta="pasta 06"
          >
            <Nota>
              A alteração do contrato social que leva a governança para dentro do contrato, porque
              sem isso as regras não valem contra terceiros nem na Junta Comercial. Ela não inventa
              parâmetro: repete o que o Regimento e a Ata já definiram. O nome é interno e pode não
              ser o melhor para a tela.
            </Nota>
            <Campos campos={CAMPOS_AC_REFLEXO} />
          </Secao>


          <footer className="mt-12 flex flex-col gap-3 border-t border-osg-100 pt-5 text-[13px] text-osg-500">
            {/*
              Achado medido no próprio modelo VF: das 14 palavras do vocabulário,
              12 aparecem nas 21 linhas e duas não aparecem em nenhuma. Ou a
              consultoria usa em cliente que não estava na amostra, ou o
              vocabulário tem sobra.
            */}
            <p className="max-w-[76ch]">
              <strong className="font-semibold">Duas palavras do vocabulário podem estar
              sobrando.</strong>{' '}
              Contamos as 21 linhas do modelo: <em>garante</em> e{' '}
              <em>fornece informações</em> não aparecem em nenhuma célula. Vocês usam essas duas em
              algum cliente, ou elas podem sair da lista?
            </p>
            <p className="max-w-[76ch]">
              <strong className="font-semibold">Duas decisões que dependem de vocês.</strong>{' '}
              Primeira: a lista de órgãos da seção A é fixa ou sai da estrutura de cada cliente?
              Segunda: o Diagnóstico produz três coisas que não estão em documento nenhum, a
              qualidade que une os sócios, o organograma macro e os interesses profissionais de cada
              um. Elas entram como texto livre no cadastro ou ficam fora?
            </p>
            <p className="max-w-[76ch] text-osg-300">
              Mockup do levantamento de campos da governança. Nada aqui salva, consulta ou valida.
            </p>
          </footer>
        </div>
      </main>
    </Explicando.Provider>
  );
};

const raiz = document.getElementById('root');
if (raiz) createRoot(raiz).render(<CadastroGovernancaPreview />);

export default CadastroGovernancaPreview;
