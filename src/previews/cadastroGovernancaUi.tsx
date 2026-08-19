/**
 * As peças de apresentação do mockup do cadastro de governança.
 *
 * Saíram do `CadastroGovernancaPreview.tsx` quando ele passou de 600 linhas, que
 * é o teto do AGENTS.md para arquivo de componente. Nenhuma delas tem conteúdo:
 * conteúdo mora em `cadastroGovernancaDados.ts` e a montagem no preview.
 *
 * Tudo aqui veste o kit de estilo real da OSG (`formKit`, `osgFormGrid`), e não
 * classes inventadas — foi o que fez a primeira versão não parecer o sistema.
 */
import { createContext, useContext } from 'react';
import { fieldCls, FieldSection, labelCls } from '@/components/equipe/osg/formKit';
import { formGridCls, formScopeCls } from '@/lib/osgFormGrid';
import { ORIGEM_ROTULO, type Campo, type Origem } from './cadastroGovernancaDados';

/**
 * "Explicar campos" ligado ou desligado.
 *
 * Contexto em vez de propriedade porque a explicação aparece em quatro níveis
 * diferentes (campo, coluna de tabela, glossário e resumo de seção), e passar a
 * chave por todos eles encheria as assinaturas sem ganho.
 */
export const Explicando = createContext(true);

/** Etiqueta de origem: já no sistema, calculado, ou novo. */
export const EtiquetaOrigem = ({ origem, tabela }: { origem?: Origem; tabela?: string }) => {
  const qual = origem ?? 'novo';
  const cor =
    qual === 'existe'
      ? 'border-osg-moss/50 bg-osg-moss/10 font-semibold text-osg-moss'
      : qual === 'derivado'
        ? 'border-osg-300/70 bg-osg-100/70 font-medium text-osg-600'
        // `novo` é a maioria (50 de 61), então não pode gritar. Mas borda
        // osg-100 sobre fundo transparente com texto osg-300 ficava ilegível:
        // borda e texto sobem um degrau, sem virar destaque.
        : 'border-osg-200 bg-background font-medium text-osg-500';

  return (
    <span className={`inline-flex shrink-0 items-baseline gap-1 rounded-full border px-2 py-0.5 text-[10.5px] leading-tight tracking-wide ${cor}`}>
      {ORIGEM_ROTULO[qual]}
      {tabela && <span className="font-mono text-[9px] opacity-80">{tabela}</span>}
    </span>
  );
};

/**
 * Campo, na geometria do formulário do sistema: rótulo EM CIMA do campo, em
 * caixa normal, e a caixa do valor arredondada abaixo dele.
 *
 * Rótulo ao lado foi tentado e quebrou: dentro de painel estreito a largura fixa
 * do rótulo esmagava o valor, e a etiqueta de origem passava por cima do texto.
 * O sistema também não faz assim — ver o modal de editar pessoa.
 */
export const CampoLeitura = ({ campo }: { campo: Campo }) => {
  const explicando = useContext(Explicando);

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-baseline gap-2">
        <span className={labelCls}>{campo.rotulo}</span>
        {/*
          O TIPO fica junto do rótulo, em monoespaçada miúda, porque ele é
          informação de quem vai construir: é o tipo do vocabulário do gerador, e
          é o que decide se o campo aceita número, data ou lista fechada. Sai de
          propósito sem moldura, para não competir com a origem.
        */}
        {campo.tipo && campo.tipo !== 'texto' && (
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{campo.tipo}</span>
        )}
        <span className="ml-auto flex shrink-0 items-baseline gap-1.5">
          {/*
            O DESTINO só aparece quando o campo VIRA CLÁUSULA do contrato social.
            "Só interno" é a maioria e ficaria como ruído repetido em quase toda
            linha; a informação útil é o inverso, saber qual campo será registrado
            na Junta Comercial e por isso não admite improviso.
          */}
          {campo.destino === 'contrato' && (
            <span className="rounded-full border border-osg-moss/40 bg-osg-moss/[0.07] px-2 py-0.5 text-[10.5px] leading-tight text-osg-moss">
              vira cláusula
            </span>
          )}
          <EtiquetaOrigem origem={campo.origem} tabela={campo.tabela} />
        </span>
      </div>
      {/*
        `fieldCls` é o MESMO estilo de campo dos modais da OSG: altura 9, canto
        arredondado, borda fina e sombra de 1px, com foco em verde-musgo. Aqui é
        um `span` porque a tela é de leitura, mas o desenho tem de ser o do
        sistema, e reescrever à mão foi o que fez a tela parecer outra coisa.
      */}
      <span
        className={`${fieldCls} flex w-full items-center px-3 text-sm !border-osg-200 bg-background ${
          campo.vazio ? 'italic text-muted-foreground' : 'text-osg-700'
        }`}
      >
        {campo.valor}
      </span>
      {explicando && (
        <span className="text-[11px] leading-snug text-muted-foreground">{campo.explicacao}</span>
      )}
    </div>
  );
};

/**
 * Grade de campos, na grade do sistema.
 *
 * `formScopeCls` é `@container` e `formGridCls(2)` só quebra em duas colunas
 * quando o contêiner passa de 672px — é consulta de contêiner, não de janela,
 * então o campo dentro de painel estreito não fica apertado.
 */
export const Campos = ({ campos, colunas = 2 }: { campos: Campo[]; colunas?: 2 | 3 }) => (
  <div className={`${formScopeCls} rounded-md border border-osg-100 bg-muted/70 p-4`}>
    <div className={`${formGridCls(colunas)} gap-x-4 gap-y-3.5`}>
      {campos.map((c) => (
        <CampoLeitura key={c.rotulo} campo={c} />
      ))}
    </div>
  </div>
);

/** Conta quantos campos daquela seção o sistema já guarda. */
export function resumo(campos: Campo[], extras = 0): string {
  const jaTem = campos.filter((c) => c.origem === 'existe').length;
  const total = campos.length + extras;
  return `${total} campos · ${jaTem === 0 ? 'nenhum' : jaTem} já no sistema`;
}

/**
 * Seção, usando o `FieldSection` do kit da OSG.
 *
 * É o mesmo componente das abas de matrícula, bem e pessoa: trilho verde-musgo
 * arredondado à esquerda, número em fonte monoespaçada, título em caixa alta com
 * espaçamento largo, e linha de separação entre seções. A pasta do Drive vai no
 * slot `hint`, que o kit já alinha à direita.
 *
 * O que produz e de que entidade pende fica numa linha logo abaixo do título, em
 * vez de dentro do cabeçalho: são três informações e o slot é de uma.
 */
export const Secao = ({
  numero,
  titulo,
  produz,
  entidade,
  contagem,
  pasta,
  desde,
  gerar,
  ultimaGeracao,
  children,
}: {
  numero: string;
  titulo: string;
  produz: string;
  entidade: string;
  contagem: string;
  pasta: string;
  /** Desde quando este conjunto de parâmetros vale. */
  desde?: string;
  /**
   * Documento que sai desta seção. Ausente = a seção não produz documento.
   *
   * É só indicação: a GERAÇÃO não acontece aqui. Nos cadastros que já existem
   * (matrícula, bem, pessoa, cliente) o formulário só guarda o dado, e o documento
   * sai da tela "Gerar Documento", alcançada pelo menu do OSG Work. Botão de gerar
   * dentro da seção criaria um segundo caminho e quebraria o padrão da casa.
   */
  gerar?: string;
  /** O que já saiu daqui, para o histórico ficar na pilha e não no formulário. */
  ultimaGeracao?: string;
  children: React.ReactNode;
}) => (
  <FieldSection
    number={numero}
    title={titulo}
    hint={pasta}
    actions={
      gerar ? (
        <span className="text-[11px] text-muted-foreground">
          gera <span className="font-medium text-osg-700">{gerar}</span>
        </span>
      ) : undefined
    }
  >
    <dl className="-mt-2 mb-3 flex flex-wrap gap-x-5 gap-y-0.5 text-[11px] text-muted-foreground">
      <div className="flex gap-1.5">
        <dt className="font-semibold text-osg-600">Produz</dt>
        <dd>{produz}</dd>
      </div>
      <div className="flex gap-1.5">
        <dt className="font-semibold text-osg-600">Pende de</dt>
        <dd>{entidade}</dd>
      </div>
      <div className="flex gap-1.5">
        <dt className="font-semibold text-osg-600">Campos</dt>
        <dd>{contagem}</dd>
      </div>
      {desde && (
        <div className="flex gap-1.5">
          <dt className="font-semibold text-osg-600">Vigente desde</dt>
          <dd>{desde}</dd>
        </div>
      )}
      {ultimaGeracao && (
        <div className="flex gap-1.5">
          <dt className="font-semibold text-osg-600">Última geração</dt>
          <dd>{ultimaGeracao}</dd>
        </div>
      )}
    </dl>
    {children}
  </FieldSection>
);

export const Nota = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-3 max-w-[76ch] text-[13px] leading-relaxed text-osg-500">{children}</p>
);

/** Glossário de vocabulário fechado. Só aparece com a explicação ligada. */
export const Glossario = ({
  titulo,
  itens,
}: {
  titulo: string;
  itens: { termo: string; significa: string }[];
}) => {
  const explicando = useContext(Explicando);
  if (!explicando) return null;

  return (
    <div className="mb-3 rounded-md border border-osg-100 bg-muted px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-osg-moss">{titulo}</p>
      {/*
        A ressalva não é formalidade: as palavras são dos documentos, as
        definições são leitura nossa. Sem dizer isso, a consultora valida por
        educação uma definição que talvez não seja a dela.
      */}
      <p className="mb-2 text-[11px] italic text-muted-foreground">
        Sentido inferido dos documentos, não copiado deles. É o que precisamos que vocês confirmem.
      </p>
      <dl className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-x-6 gap-y-1 text-[12.5px] leading-snug">
        {itens.map((i) => (
          <div key={i.termo} className="flex gap-1.5">
            <dt className="shrink-0 font-semibold text-osg-700">{i.termo}</dt>
            <dd className="min-w-0 text-osg-500">{i.significa}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

/** Célula de grade: lista suspensa com o vocabulário inteiro, para poder ser lido. */
export const Escolha = ({ valor, opcoes, rotulo }: { valor: string; opcoes: readonly string[]; rotulo: string }) => (
  <select
    aria-label={rotulo}
    defaultValue={valor}
    className="w-full min-w-[130px] rounded-md border border-osg-200/80 bg-background px-2 py-1 text-[13px] text-osg-700 shadow-[0_1px_1px_rgba(16,24,40,0.04)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-osg-moss"
  >
    {opcoes.map((o) => (
      <option key={o}>{o}</option>
    ))}
  </select>
);

export const Rolagem = ({ children }: { children: React.ReactNode }) => (
  <div className="overflow-x-auto rounded-md border border-osg-100 bg-background">{children}</div>
);

export const Cabecalho = ({ titulos, ultimoADireita }: { titulos: string[]; ultimoADireita?: boolean }) => (
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
