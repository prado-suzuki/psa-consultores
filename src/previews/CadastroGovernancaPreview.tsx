/**
 * Mockup do cadastro de governança — EDU-14.
 *
 * Tela de mentira: nada salva, nada consulta banco, nada valida. Serve para a
 * consultoria olhar e dizer o que falta, o que sobra e se o nome está certo,
 * antes de existir código de produção.
 *
 * Não tem rota no `App.tsx` de propósito. Abre por
 * `/cadastro-governanca-preview.html`, no mesmo molde da prévia do Sísifo.
 *
 * Estética: tokens do tema da OSG (`osg-canvas` de fundo, `osg-moss` de acento,
 * a escala taupe `osg-50..700`, `osg-highlighter` no marca-texto). A lista de
 * campos e a origem de cada um estão em `docs/osg/campos-governanca.md`.
 */
import { Fragment } from 'react';
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
  GRUPOS_BENEFICIARIO,
  ORGAOS,
  PAPEIS_NA_DECISAO,
  RESPOSTAS_CRITERIO,
  type Campo,
} from './cadastroGovernancaDados';
import '@/index.css';

/** Cabeçalho de seção. `pasta` diz de onde no mapeamento aquela seção veio. */
const Secao = ({
  marca,
  titulo,
  pasta,
  children,
}: {
  marca: string;
  titulo: string;
  pasta: string;
  children: React.ReactNode;
}) => (
  <section className="mt-11">
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-osg-100 pb-2">
      <span className="min-w-5 font-mono text-base font-bold text-osg-moss">{marca}</span>
      <h2 className="text-xl font-semibold tracking-tight text-osg-700">{titulo}</h2>
      <span className="ml-auto text-right text-[11.5px] leading-tight text-osg-300">{pasta}</span>
    </div>
    {children}
  </section>
);

const Nota = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-4 mt-3 max-w-[70ch] text-[13.5px] leading-relaxed text-osg-500">{children}</p>
);

/** Marca de "este dado o sistema já tem". Informação útil na leitura. */
const JaExiste = () => (
  <span
    className="ml-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-osg-moss align-middle"
    title="O sistema já guarda este dado"
  />
);

const CampoLeitura = ({ campo }: { campo: Campo }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[11px] font-semibold uppercase tracking-wider text-osg-500">
      {campo.rotulo}
      {campo.existe && <JaExiste />}
    </span>
    <span
      className={`flex min-h-9 items-center border border-osg-100 bg-osg-50/60 px-2.5 py-1.5 text-[14.5px] ${
        campo.vazio ? 'italic text-osg-300' : 'text-osg-700'
      }`}
    >
      {campo.valor}
    </span>
  </div>
);

const Campos = ({ campos }: { campos: Campo[] }) => (
  <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 border border-osg-100 bg-white p-5">
    {campos.map((c) => (
      <CampoLeitura key={c.rotulo} campo={c} />
    ))}
  </div>
);

/** Célula de grade: lista suspensa com o vocabulário inteiro, para poder ser lido. */
const Escolha = ({ valor, opcoes, rotulo }: { valor: string; opcoes: readonly string[]; rotulo: string }) => (
  <select
    aria-label={rotulo}
    defaultValue={valor}
    className="w-full min-w-[130px] border border-osg-100 bg-osg-50/60 px-1.5 py-1 text-[13px] text-osg-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-osg-moss"
  >
    {opcoes.map((o) => (
      <option key={o}>{o}</option>
    ))}
  </select>
);

const Rolagem = ({ children }: { children: React.ReactNode }) => (
  <div className="overflow-x-auto border border-osg-100 bg-white">{children}</div>
);

const Cabecalho = ({ titulos, ultimoADireita }: { titulos: string[]; ultimoADireita?: boolean }) => (
  <thead>
    <tr className="bg-osg-50">
      {titulos.map((t, i) => (
        <th
          key={t}
          className={`whitespace-nowrap border-b border-osg-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-osg-moss ${
            ultimoADireita && i === titulos.length - 1 ? 'text-right' : 'text-left'
          }`}
        >
          {t}
        </th>
      ))}
    </tr>
  </thead>
);

export const CadastroGovernancaPreview = () => {
  const orgaosAtivos = ORGAOS.filter((o) => o.existe);

  return (
    <main className="min-h-screen bg-osg-canvas px-5 pb-24 font-sans text-osg-700">
      <div className="mx-auto max-w-[1040px]">
        <header className="flex flex-col gap-1.5 border-b-2 border-osg-moss pt-11 pb-6">
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-osg-moss">
            PSA · OSG · mockup, nada aqui funciona
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-osg-700">Cadastro de Governança</h1>
          <p className="max-w-[62ch] text-osg-500">
            Rascunho de tela para conferir o conteúdo do cadastro. O desenho e as cores não estão
            em discussão.
          </p>
        </header>

        <div className="mt-7 flex flex-col gap-3 border border-osg-100 border-t-[3px] border-t-osg-moss bg-white p-5">
          <p className="max-w-[68ch]">
            <strong className="font-semibold">O que precisamos de vocês:</strong> percorrer seção
            por seção e responder três coisas em cada uma. Falta campo? Sobra campo? O nome é o que
            vocês usam no dia a dia?
          </p>
          <p className="max-w-[68ch] text-[14px] text-osg-500">
            As seções de 1 a 6 são os seis documentos da governança, na ordem em que o trabalho
            acontece. As duas do começo, A e B, não são documento: guardam o que se repete em
            vários deles, para preencher uma vez só em vez de repetir em cada um.
          </p>
          <div className="flex flex-wrap items-center gap-2 border-t border-osg-50 pt-3 text-[13px] text-osg-500">
            <span className="inline-flex items-center">
              <JaExiste />
            </span>
            <span>
              o ponto verde marca o dado que o sistema <strong className="font-semibold">já guarda</strong> hoje.
              O resto precisa ser criado.
            </span>
          </div>
          <p className="text-[13px] text-osg-300">
            Nomes e valores são de um cliente fictício. A estrutura é a dos documentos reais.
          </p>
        </div>

        <Secao marca="A" titulo="Órgãos de governança" pasta="não é documento · alimenta 1, 2, 3 e 4">
          <Nota>
            Quais instâncias existem neste cliente. É o que define as colunas da Matriz de Alçadas.
            A dúvida aberta é se esta lista é fixa ou se sai da estrutura de cada cliente, seguindo
            a cascata conselho, diretoria, administradores do contrato social.
          </Nota>
          <div className="flex flex-wrap gap-2 border border-osg-100 bg-white p-5">
            {ORGAOS.map((o) => (
              <span
                key={o.nome}
                className={`inline-flex items-center gap-2 border px-3 py-1.5 text-[13.5px] ${
                  o.existe
                    ? 'border-osg-moss bg-osg-moss/10 font-semibold text-osg-moss'
                    : 'border-osg-100 bg-osg-50/60 text-osg-500'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 border ${
                    o.existe ? 'border-osg-moss bg-osg-moss' : 'border-osg-300'
                  }`}
                />
                {o.nome}
              </span>
            ))}
          </div>
        </Secao>

        <Secao marca="B" titulo="Grupos de pessoas" pasta="não é documento · alimenta 2 e 3">
          <Nota>
            Como as pessoas se organizam neste cliente. Muda de cliente para cliente: três
            documentos entregues trazem três conjuntos diferentes de grupos, então o rótulo é
            escrito pelo consultor e não escolhido de uma lista.
          </Nota>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(290px,1fr))] gap-4">
            {GRUPOS_BENEFICIARIO.map((g, i) => (
              <div key={g.rotulo} className="flex flex-col gap-4 border border-osg-100 bg-white p-5">
                <CampoLeitura campo={{ rotulo: `Grupo de beneficiário · ${i + 1}`, valor: g.rotulo }} />
                <CampoLeitura campo={{ rotulo: 'Pessoas do grupo', valor: g.pessoas, existe: true }} />
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Campos
              campos={[
                { rotulo: 'Ramo ou Descendentes de', valor: 'RAMO Campos' },
                { rotulo: 'Vota em bloco', valor: 'Sim' },
              ]}
            />
          </div>
        </Secao>

        <Secao
          marca="1"
          titulo="Matriz de Alçadas"
          pasta="pastas 01_Diagnostico_de_Governanca e 04_Matriz_de_Alcadas"
        >
          <Nota>
            Antes chamada de Diagnóstico de Governança e de Questionário de Governança: os três
            nomes são o mesmo documento, e ficou decidido usar Matriz de Alçadas. Cada linha é um
            assunto, cada coluna é um órgão, e a célula diz o que aquele órgão faz naquele assunto.
            São {ASSUNTOS_MATRIZ.length} assuntos e {PAPEIS_NA_DECISAO.length} palavras possíveis
            na célula: abra uma para ver a lista inteira.
          </Nota>
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

        <Secao marca="2" titulo="Acordo de Quotistas" pasta="pasta 02_Acordo_de_Quotistas">
          <Nota>
            Só os parâmetros que mudam de cliente para cliente. O texto das cláusulas não entra no
            cadastro. Os dois últimos campos existem porque, na doação com reserva de usufruto,
            quem detém a quota não é necessariamente quem vota.
          </Nota>
          <Campos campos={CAMPOS_ACORDO} />
        </Secao>

        <Secao
          marca="3"
          titulo="Protocolo de Remuneração"
          pasta="pasta 03_Protocolo_de_Remuneracao · colunas vêm de B"
        >
          <Nota>
            Cada linha é um benefício, cada coluna é um grupo de pessoas, e a célula diz se aquele
            grupo tem direito. São {FAMILIAS_PROTOCOLO.length} famílias. A resposta tem três valores
            e não é sim ou não, porque nos documentos reais a maioria das respostas é negativa e
            precisa ficar registrada como decisão, não como campo em branco.
          </Nota>
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
          <div className="mt-4">
            <Campos campos={CAMPOS_PROTOCOLO_GERAIS} />
          </div>
        </Secao>

        <Secao
          marca="4"
          titulo="Regimento Interno do Conselho"
          pasta="pasta 05_Regimento_Interno_do_Conselho"
        >
          <Nota>
            O procedimento interno diz que este documento é artesanal e pode não ter campo
            estruturável. O exemplo real tem {CAMPOS_REGIMENTO.length} parâmetros objetivos, todos
            abaixo. Vale conferir se algum falta.
          </Nota>
          <Campos campos={CAMPOS_REGIMENTO} />
        </Secao>

        <Secao marca="5" titulo="AC Reflexo" pasta="pasta 06_AC_Reflexo_Governanca_Participacoes">
          <Nota>
            A alteração do contrato social que leva a governança para dentro do contrato. Ela não
            inventa parâmetro: repete o que o Regimento e a Ata já definiram, e por isso quase tudo
            aqui é repetição das outras seções. O nome é interno e pode não ser o melhor para a
            tela.
          </Nota>
          <Campos campos={CAMPOS_AC_REFLEXO} />
        </Secao>

        <Secao
          marca="6"
          titulo="Instalação do Conselho e da Diretoria"
          pasta="pasta 07_Instalacao_Conselho_Diretoria"
        >
          <Nota>
            Produz dois documentos, a Ata de Eleição e o Termo de Posse. A mesa diretora conduz a
            reunião e não é a mesma coisa que o presidente do conselho, por isso aparecem separadas.
          </Nota>
          <Rolagem>
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <Cabecalho titulos={['Pessoa', 'Cargo', 'É sócio', 'Início do mandato', 'Fim do mandato']} />
              <tbody>
                {ELEITOS.map((e) => (
                  <tr key={e.pessoa}>
                    <th className="whitespace-nowrap border-b border-osg-50 px-3 py-2 text-left font-normal text-osg-700">
                      {e.pessoa}
                    </th>
                    <td className="border-b border-osg-50 px-3 py-2 text-osg-500">{e.cargo}</td>
                    <td className="border-b border-osg-50 px-3 py-2 text-osg-500">{e.socio}</td>
                    <td className="border-b border-osg-50 px-3 py-2 tabular-nums text-osg-500">{e.inicio}</td>
                    <td className="border-b border-osg-50 px-3 py-2 tabular-nums text-osg-500">{e.fim}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Rolagem>
          <div className="mt-4">
            <Campos campos={CAMPOS_INSTALACAO} />
          </div>
        </Secao>

        <footer className="mt-14 flex flex-col gap-3 border-t border-osg-100 pt-5 text-[13.5px] text-osg-500">
          <p className="max-w-[68ch]">
            <strong className="font-semibold">Duas decisões que dependem de vocês.</strong> Primeira:
            a lista de órgãos da seção A é fixa ou sai da estrutura de cada cliente? Segunda: o
            Diagnóstico produz três coisas que não estão em documento nenhum, a qualidade que une os
            sócios, o organograma macro e os interesses profissionais de cada um. Elas entram como
            texto livre no cadastro ou ficam fora?
          </p>
          <p className="max-w-[68ch] text-osg-300">
            Mockup do levantamento de campos da governança. Nada aqui salva, consulta ou valida.
          </p>
        </footer>
      </div>
    </main>
  );
};

const raiz = document.getElementById('root');
if (raiz) createRoot(raiz).render(<CadastroGovernancaPreview />);

export default CadastroGovernancaPreview;
