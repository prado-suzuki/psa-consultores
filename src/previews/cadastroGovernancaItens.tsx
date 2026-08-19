/**
 * Os itens do cadastro de governança: um por documento, mais os dois de base.
 *
 * Ficam fora do preview porque o preview passou a ser só a LISTA e a moldura do
 * modal. Foi essa separação que tirou a tela do formato "formulário corrido":
 * cada item é uma linha da lista e o preenchimento acontece dentro do modal,
 * como nos cadastros de cliente, matrícula, bem e pessoa.
 *
 * A ORDEM aqui é a ordem de leitura da tela, e ela não é mais a numeração das
 * pastas do Drive: primeiro a base, depois os quatro que viram cláusula do
 * contrato social, e por último o único interno. A pasta de origem continua
 * declarada em cada item, para não perder a rastreabilidade.
 */
import { Fragment } from 'react';

import {
  ALTERACOES_CONTRATUAIS,
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
import {
  Cabecalho,
  CampoLeitura,
  Campos,
  Escolha,
  Glossario,
  Nota,
  resumo,
  Rolagem,
  type ItemGovernanca,
} from './cadastroGovernancaUi';

const ORGAOS_ATIVOS = ORGAOS.filter((o) => o.existe);

const Orgaos = () => (
  <>
    <Nota>
      Quais instâncias de decisão existem neste cliente. É o que define as colunas da Matriz de
      Alçadas. A dúvida aberta é se esta lista é fixa ou se sai da estrutura de cada cliente,
      seguindo a cascata conselho, diretoria, administradores do contrato social.
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
  </>
);

const Grupos = () => (
  <>
    <Nota>
      Como as pessoas se organizam neste cliente. Muda de cliente para cliente: três documentos
      entregues trazem três conjuntos diferentes de grupos, então o rótulo é escrito pelo consultor
      e não escolhido de uma lista. O ramo é o que o Acordo de Quotistas usa para ordenar quem tem
      preferência de compra.
    </Nota>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {GRUPOS_BENEFICIARIO.map((g, i) => (
        <div
          key={g.rotulo}
          className="flex flex-col gap-3.5 rounded-md border border-osg-100 bg-muted/70 p-4"
        >
          <CampoLeitura
            campo={{
              rotulo: `Grupo · ${i + 1}`,
              valor: g.rotulo,
              explicacao:
                'O nome que a família dá a esse conjunto de pessoas. Vira uma coluna do Protocolo.',
            }}
          />
          <CampoLeitura
            campo={{
              rotulo: 'Pessoas do grupo',
              valor: g.pessoas,
              explicacao:
                'Quem está nesse grupo. As pessoas já estão cadastradas; aqui só se diz quem entra onde.',
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
            explicacao:
              'Cada filho do fundador origina um ramo. O Acordo de Quotistas usa o ramo para ordenar quem compra a parte de quem sai.',
          },
          {
            rotulo: 'Vota em bloco',
            valor: 'Sim',
            tipo: 'booleano',
            explicacao:
              'Se o ramo precisa votar unido, com uma posição só. Impede que um primo isolado decida contra o próprio ramo.',
          },
        ]}
      />
    </div>
  </>
);

const Matriz = () => (
  <>
    <Nota>
      O documento-eixo, e o primeiro item do fluxo. Antes chamada de Diagnóstico de Governança e de
      Questionário de Governança: os três nomes são o mesmo documento, e ficou decidido usar Matriz
      de Alçadas. Cada linha é um assunto da empresa, cada coluna é um órgão, e a célula diz o que
      aquele órgão faz naquele assunto. A coluna da direita é o valor até onde a decisão pode ir sem
      subir de instância.
    </Nota>
    <Nota>
      No contrato social cada assunto não vira uma cláusula: vira uma <strong>alínea</strong> da
      cláusula de competência do órgão, e a palavra escolhida na célula é o <strong>verbo</strong>{' '}
      dessa alínea. Quem marca <em>aprova</em> em Orçamento gera "Aprovar o orçamento anual"; quem
      marca <em>submete à aprovação</em> gera "Encaminhar à Reunião de Sócios". É por isso que as
      catorze palavras não são sinônimos.
    </Nota>
    <Glossario
      titulo="As catorze palavras da célula, e elas não são sinônimos"
      itens={GLOSSARIO_PAPEIS.map((p) => ({ termo: p.papel, significa: p.significa }))}
    />
    <Rolagem>
      <table className="w-full min-w-[880px] border-collapse text-sm">
        <Cabecalho
          titulos={['Assunto', ...ORGAOS_ATIVOS.map((o) => o.nome), 'Alçada']}
          ultimoADireita
        />
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
                {linha.acima && (
                  <span className="ml-1.5 text-[11px] text-osg-300">acima: {linha.acima}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Rolagem>
  </>
);

/**
 * A pilha de alterações contratuais do cliente.
 *
 * É o único item da governança que se repete: o mesmo cliente tem 4ª, 5ª e 6ª
 * alteração. Sem esta lista o modal daria a entender que existe uma só, e o
 * consultor não teria como saber qual está em elaboração nem o que a anterior já
 * registrou.
 */
const Alteracoes = () => (
  <>
    <Nota>
      Cada alteração é um documento próprio, com número e data. Os campos das outras abas são sempre
      os da alteração <strong>em elaboração</strong>; as registradas ficam aqui como histórico,
      porque é nelas que se confere o que já está na Junta e não precisa ser repetido.
    </Nota>
    <Rolagem>
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <Cabecalho titulos={['Alteração', 'Data', 'O que mudou', 'Situação']} />
        <tbody>
          {ALTERACOES_CONTRATUAIS.map((a) => (
            <tr key={a.numero} className={a.emEdicao ? 'bg-osg-moss/[0.06]' : undefined}>
              <th className="whitespace-nowrap border-b border-osg-50 px-3 py-2 text-left font-semibold text-osg-700">
                {a.numero}
                {a.consolida && (
                  <span className="ml-1.5 font-normal text-[11px] text-osg-300">consolidada</span>
                )}
              </th>
              <td className="whitespace-nowrap border-b border-osg-50 px-3 py-2 tabular-nums text-osg-500">
                {a.data}
              </td>
              <td className="border-b border-osg-50 px-3 py-2 text-osg-700">{a.objeto}</td>
              <td className="whitespace-nowrap border-b border-osg-50 px-3 py-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    a.emEdicao ? 'bg-osg-100 text-osg-600' : 'bg-osg-moss/10 text-osg-moss'
                  }`}
                >
                  {a.situacao}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Rolagem>
    <p className="mt-3 text-[12px] text-muted-foreground">
      No sistema haveria aqui o botão de nova alteração, do mesmo jeito que a lista de bens e a de
      matrículas têm.
    </p>
  </>
);

const Protocolo = () => (
  <>
    <Nota>
      O que cada grupo da família recebe da empresa, além de salário: carro, plano de saúde, casa,
      viagem, empréstimo. Cada linha é um benefício, cada coluna é um grupo, e a célula diz se
      aquele grupo tem direito. Deste documento só a remuneração global desce ao contrato social; o
      valor de cada benefício fica aqui dentro de propósito.
    </Nota>
    <Nota>
      <strong>O nome muda de cliente para cliente, e isso é uma decisão de vocês.</strong> No modelo
      da pasta 03 ele se chama Protocolo de Remuneração. Num cliente real ele se chama{' '}
      <em>Protocolo Familiar</em>, e cobre seis capítulos: bens a integralizar, governança e tomada
      de decisão, pró-labore e distribuição de lucros, custos suportados pela sociedade (veículo,
      combustível, manutenção, seguro), benefícios e viagens, e arbitragem. Ou seja, num cliente
      este documento absorve assunto que o mapeamento coloca na Matriz e no Acordo. Precisamos saber
      se a tela deve ter um nome só ou aceitar o nome que o cliente usa.
    </Nota>
    <Glossario
      titulo="Por que a resposta tem três valores e não é sim ou não"
      itens={GLOSSARIO_RESPOSTAS.map((r) => ({ termo: r.resposta, significa: r.significa }))}
    />
    <Rolagem>
      <table className="w-full min-w-[880px] border-collapse text-sm">
        <Cabecalho
          titulos={['Critério', ...GRUPOS_BENEFICIARIO.map((g) => g.rotulo), 'Valor']}
          ultimoADireita
        />
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
  </>
);

export const ITENS: ItemGovernanca[] = [
  {
    id: 'orgaos',
    numero: 'A',
    titulo: 'Órgãos de governança',
    chamada:
      'Quais instâncias de decisão existem neste cliente. É o que define as colunas da Matriz.',
    produz: 'nada; alimenta a Matriz, o Acordo e o Protocolo',
    entidade: 'o cliente / grupo',
    campos: '4 instâncias, marcar quais existem',
    pasta: 'não é documento',
    destino: 'base',
    preenchido: true,
    abas: [{ valor: 'orgaos', rotulo: 'Órgãos', conteudo: <Orgaos /> }],
  },
  {
    id: 'grupos',
    numero: 'B',
    titulo: 'Grupos de pessoas',
    chamada: 'Como a família se organiza: os grupos que recebem benefício e o ramo de cada um.',
    produz: 'nada; alimenta o Acordo e o Protocolo',
    entidade: 'as pessoas do cliente',
    campos: '1 rótulo e 1 lista por grupo, mais 2 gerais',
    pasta: 'não é documento',
    destino: 'base',
    preenchido: true,
    abas: [{ valor: 'grupos', rotulo: 'Grupos', conteudo: <Grupos /> }],
  },
  {
    id: 'matriz',
    numero: '01',
    titulo: 'Matriz de Alçadas',
    chamada: 'Quem decide o que, e até que valor, em cada assunto da empresa.',
    produz: 'Matriz de Alçadas',
    entidade: 'o cliente / grupo',
    campos: `${ASSUNTOS_MATRIZ.length} assuntos × ${ORGAOS_ATIVOS.length} órgãos · nenhum já no sistema`,
    pasta: 'pastas 01 e 04 do Drive',
    destino: 'contrato',
    preenchido: true,
    ultimaGeracao: '12/03/2026 · versão 2',
    largo: true,
    abas: [{ valor: 'matriz', rotulo: 'Assuntos', conteudo: <Matriz /> }],
  },
  {
    id: 'acordo',
    numero: '02',
    titulo: 'Acordo de Quotistas',
    chamada:
      'As regras entre os sócios: como se vota, quem compra a parte de quem sai e por quanto.',
    produz: 'Acordo de Quotistas',
    entidade: 'a holding e os sócios',
    campos: resumo(CAMPOS_ACORDO),
    pasta: 'pasta 02 do Drive',
    destino: 'contrato',
    preenchido: true,
    ultimaGeracao: '29/09/2025 · assinado com firma reconhecida',
    abas: [
      {
        valor: 'acordo',
        rotulo: 'Parâmetros',
        conteudo: (
          <>
            <Nota>
              Só os parâmetros que mudam de cliente para cliente; o texto das cláusulas não entra no
              cadastro. O contrato social faz <strong>duas coisas</strong> com este acordo: cita ele
              pelo nome, em capítulo próprio, dizendo que está arquivado na sede, e ainda registra
              como cláusula {CAMPOS_ACORDO.filter((c) => c.destino === 'contrato').length} dos{' '}
              {CAMPOS_ACORDO.length} parâmetros abaixo. Os outros {CAMPOS_ACORDO.filter((c) => c.destino !== 'contrato').length}{' '}
              não aparecem em cláusula nenhuma e ficam só no acordo.
            </Nota>
            <Campos campos={CAMPOS_ACORDO} />
          </>
        ),
      },
    ],
  },
  {
    id: 'regimento',
    numero: '03',
    titulo: 'Regimento Interno do Conselho',
    chamada: 'Como o conselho funciona por dentro: tamanho, mandato, quórum e perda de cadeira.',
    produz: 'Regimento Interno',
    entidade: 'o conselho de administração',
    campos: resumo(CAMPOS_REGIMENTO),
    pasta: 'pasta 05 do Drive',
    destino: 'contrato',
    preenchido: true,
    ultimaGeracao: 'vigência 2026 a 2031',
    abas: [
      {
        valor: 'regimento',
        rotulo: 'Parâmetros',
        conteudo: (
          <>
            <Nota>
              O procedimento interno diz que este documento é artesanal e pode não ter campo
              estruturável; o exemplo real tem {CAMPOS_REGIMENTO.length} parâmetros objetivos, todos
              abaixo. Só a periodicidade das reuniões não aparece em cláusula nenhuma: é o corte
              entre o que se registra e o que fica interno.
            </Nota>
            <Campos campos={CAMPOS_REGIMENTO} />
          </>
        ),
      },
    ],
  },
  {
    id: 'ac-reflexo',
    numero: '04',
    titulo: 'AC Reflexo',
    chamada:
      'Transforma as decisões dos itens acima em cláusula registrada na Junta Comercial. Uma por alteração.',
    produz: 'Alteração Contratual',
    entidade: 'a holding',
    campos: `${ALTERACOES_CONTRATUAIS.length} alterações · ${CAMPOS_AC_REFLEXO.length} campos por alteração`,
    pasta: 'pasta 06 do Drive',
    destino: 'contrato',
    preenchido: false,
    ultimaGeracao: '5ª alteração · 18/03/2025',
    largo: true,
    abas: [
      { valor: 'alteracoes', rotulo: 'Alterações do cliente', conteudo: <Alteracoes /> },
      {
        valor: 'ac',
        rotulo: 'A 6ª alteração',
        conteudo: (
          <>
            <Nota>
              Sem ela as regras não valem contra terceiros nem na Junta Comercial. Ela não inventa
              parâmetro: repete o que o Regimento e a Ata já definiram, e é o último passo do fluxo,
              por isso costuma ser o último a ser preenchido. O nome é interno e pode não ser o
              melhor para a tela.
            </Nota>
            <Campos campos={CAMPOS_AC_REFLEXO} />
          </>
        ),
      },
    ],
  },
  {
    id: 'instalacao',
    numero: '05',
    titulo: 'Instalação do Conselho e da Diretoria',
    chamada: 'Quem foi eleito, para que cargo e por quanto tempo, e a reunião que registrou isso.',
    produz: 'Ata de eleição e Termo de Posse',
    entidade: 'as pessoas eleitas',
    campos: `${ELEITOS.length} eleitos · ${CAMPOS_INSTALACAO.length} campos da reunião`,
    pasta: 'pasta 07 do Drive',
    destino: 'contrato',
    preenchido: false,
    largo: true,
    abas: [
      {
        valor: 'eleitos',
        rotulo: 'Quem foi eleito',
        conteudo: (
          <>
            <Nota>
              O item volta com o nome da pasta que vocês já usam. Ele saiu da tela na rodada
              passada, e a consequência foi ficar sem lugar de onde nascer a ata de eleição e o termo
              de posse: são eles que provam quem está no cargo, e o contrato social depende disso
              para nomear a diretoria.
            </Nota>
            <Rolagem>
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <Cabecalho titulos={['Eleito', 'Cargo', 'É sócio', 'Início', 'Fim']} />
                <tbody>
                  {ELEITOS.map((e) => (
                    <tr key={e.pessoa}>
                      <th className="border-b border-osg-50 px-3 py-2 text-left font-normal">
                        <span className="inline-flex items-center gap-1 rounded-md bg-osg-50 px-2 py-0.5 text-[12.5px] text-osg-700">
                          {e.pessoa}
                        </span>
                      </th>
                      <td className="border-b border-osg-50 px-3 py-2 text-osg-700">{e.cargo}</td>
                      <td className="border-b border-osg-50 px-3 py-2 text-osg-500">{e.socio}</td>
                      <td className="whitespace-nowrap border-b border-osg-50 px-3 py-2 tabular-nums text-osg-500">
                        {e.inicio}
                      </td>
                      <td className="whitespace-nowrap border-b border-osg-50 px-3 py-2 tabular-nums text-osg-500">
                        {e.fim}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Rolagem>
            <p className="mt-3 text-[12px] text-muted-foreground">
              O eleito é escolhido entre as pessoas já cadastradas do cliente, e não digitado: é do
              cadastro que sai o gênero para a cláusula concordar, "o conselheiro eleito" ou "a
              conselheira eleita".
            </p>
          </>
        ),
      },
      {
        valor: 'reuniao',
        rotulo: 'A reunião e a ata',
        conteudo: (
          <>
            <Nota>
              Destes dez campos, seis aparecem em cláusula do contrato social e quatro só na ata: o
              tipo de convocação, se a deliberação foi unânime e quem presidiu e secretariou a mesa.
              A etiqueta em cada campo diz qual é qual.
            </Nota>
            <Campos campos={CAMPOS_INSTALACAO} />
          </>
        ),
      },
    ],
  },
  {
    id: 'protocolo',
    numero: '06',
    titulo: 'Protocolo de Remuneração',
    chamada: 'O que cada grupo da família recebe além de salário: carro, saúde, casa, viagem.',
    produz: 'Protocolo de Remuneração',
    entidade: 'os grupos de pessoas do item B',
    campos: `${FAMILIAS_PROTOCOLO.length} famílias de benefício · ${CAMPOS_PROTOCOLO_GERAIS.length} campos de regra geral`,
    pasta: 'pasta 03 do Drive',
    destino: 'interno',
    preenchido: true,
    ultimaGeracao: '09/06/2025',
    largo: true,
    abas: [
      { valor: 'beneficios', rotulo: 'Benefícios por grupo', conteudo: <Protocolo /> },
      {
        valor: 'gerais',
        rotulo: 'Regras gerais',
        conteudo: (
          <>
            <Nota>
              As regras que valem para todos os grupos, e a remuneração global: é o único número
              deste documento que sobe para o contrato social.
            </Nota>
            <Campos campos={CAMPOS_PROTOCOLO_GERAIS} />
          </>
        ),
      },
    ],
  },
];
