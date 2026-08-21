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
import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { ChevronRight, FileText, Plus, X } from 'lucide-react';
import {
  fieldCls, FieldSection, labelCls, osgTabsListCls, osgTabTriggerCls, switchBoxCls,
} from '@/components/equipe/osg/formKit';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

/**
 * Os valores editados dos campos, para o documento ao lado reagir.
 *
 * Sem isto os controles eram `defaultValue` e o documento era texto fixo: mexer no
 * campo não mudava a cláusula, que é o contrário do que o mockup precisa provar.
 * O mapa é por RÓTULO do campo, que é a mesma chave que o clique na marca amarela
 * usa para navegar, então não há segundo vocabulário.
 *
 * Ausente do mapa = usa o valor de exemplo do próprio campo.
 */
export const Valores = createContext<{
  valores: Record<string, string>;
  setValor: (rotulo: string, valor: string) => void;
} | null>(null);

/** Lê um campo pelo rótulo, caindo no valor de exemplo. */
export function useValor() {
  const ctx = useContext(Valores);
  return (rotulo: string, padrao: string) => ctx?.valores[rotulo] ?? padrao;
}

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
    <div
      data-campo={campo.rotulo}
      className="flex min-w-0 scroll-mt-4 flex-col gap-1.5 rounded-md transition-shadow"
    >
      <div className="flex items-baseline gap-2">
        <span className={labelCls}>{campo.rotulo}</span>
        {/*
          O trecho da cláusula também vive numa tooltip, e não só na linha abaixo
          do campo: com as explicações desligadas a tela fica limpa, e a pergunta
          "de onde isso sai no contrato?" continua a um passe de mouse. O ícone só
          aparece onde existe trecho, então ele próprio informa quais campos já
          foram rastreados até o documento.
        */}
        {campo.clausula && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`Trecho do contrato para ${campo.rotulo}`}
                className="shrink-0 text-osg-300 transition-colors hover:text-osg-moss"
              >
                <FileText className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[420px] text-[12px] leading-snug">
              {/*
                O rótulo diz de QUAL documento o trecho é. Sem isso a tooltip
                sugeria que todo campo com trecho ia para o contrato social, e não
                vai: um quórum escrito no modelo do Acordo prova que o campo
                existe, não que ele desce ao contrato.
              */}
              <span className="mb-1 block font-semibold uppercase tracking-wide text-osg-moss">
                {campo.fonteClausula === 'acordo'
                  ? 'no modelo do Acordo de Quotistas'
                  : campo.fonteClausula === 'ata'
                    ? 'na ata de eleição'
                    : 'no contrato social'}
              </span>
              <span className="italic">{campo.clausula}</span>
            </TooltipContent>
          </Tooltip>
        )}
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
      <Controle campo={campo} />
      {explicando && (
        <span className="text-[11px] leading-snug text-muted-foreground">{campo.explicacao}</span>
      )}
      {/*
        Enum sem lista é PERGUNTA, não campo pronto: a lista fechada precisa vir da
        consultoria, e dizer isso na própria tela é mais honesto que inventar
        opções e ver a consultora validar por educação.
      */}
      {explicando && campo.tipo === 'enum' && !campo.opcoes && (
        <span className="text-[11px] italic leading-snug text-osg-300">
          Lista fechada ainda por definir com vocês.
        </span>
      )}
      {/*
        O trecho da cláusula é a resposta à pergunta "como esse campo entra no
        contrato?". Vem copiado do contrato real, não parafraseado, porque o valor
        dele é justamente mostrar a frase que a consultora já reconhece.
      */}
      {explicando && campo.clausula && (
        <span className="border-l-2 border-osg-moss/40 pl-2.5 text-[11px] italic leading-snug text-osg-500">
          <span className="mr-1 font-sans font-semibold not-italic text-osg-moss">
            {campo.fonteClausula === 'acordo'
              ? 'no Acordo:'
              : campo.fonteClausula === 'ata'
                ? 'na ata:'
                : 'no contrato:'}
          </span>
          {campo.clausula}
        </span>
      )}
    </div>
  );
};

/**
 * O controle do campo, escolhido pelo `tipo`.
 *
 * Antes tudo era um `span` de leitura, e o efeito colateral foi a tela não
 * responder à pergunta "como isso é preenchido?": um Acordo de Quotistas com
 * quinze linhas de texto parado lê como documento, não como formulário. Agora
 * cada tipo aparece no controle que vai usar de verdade, e são os componentes do
 * sistema (`Input`, `Select`, `Switch`) com o `fieldCls` do kit da OSG, não
 * imitações.
 */
const Controle = ({ campo }: { campo: Campo }) => {
  const ctx = useContext(Valores);
  const tipo = campo.tipo ?? 'texto';
  const caixa = `${fieldCls} w-full text-sm !border-osg-200 bg-background`;
  const atual = ctx?.valores[campo.rotulo] ?? campo.valor;
  const mudar = ctx ? (v: string) => ctx.setValor(campo.rotulo, v) : undefined;

  // Pessoa nunca é digitada: ela já está cadastrada, e o ganho do cadastro único
  // é justamente parar de redigitar nome, CPF e qualificação em cada documento.
  if (campo.tabela === 'pessoa') {
    const nomes = campo.valor.split(', ').filter(Boolean);
    return (
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-osg-200/80 bg-background px-2 py-1.5 shadow-[0_1px_1px_rgba(16,24,40,0.04)]">
        {nomes.map((n) => (
          <span
            key={n}
            className="inline-flex items-center gap-1 rounded-md bg-osg-50 px-2 py-0.5 text-[12.5px] text-osg-700"
          >
            {n}
            <X className="h-3 w-3 text-osg-300" />
          </span>
        ))}
        <span className="inline-flex items-center gap-0.5 rounded-md border border-dashed border-osg-200 px-2 py-0.5 text-[12px] text-muted-foreground">
          <Plus className="h-3 w-3" />
          pessoa do cliente
        </span>
      </div>
    );
  }

  if (tipo === 'booleano') {
    const sim = campo.valor.trim().toLowerCase().startsWith('s');
    return (
      <div className={switchBoxCls}>
        <Switch
          checked={mudar ? atual.trim().toLowerCase().startsWith('s') : undefined}
          defaultChecked={mudar ? undefined : sim}
          onCheckedChange={mudar ? (c) => mudar(c ? 'Sim' : 'Não') : undefined}
          className="data-[state=checked]:bg-osg-moss"
        />
        <span className="text-sm text-osg-700">{atual || (sim ? 'Sim' : 'Não')}</span>
      </div>
    );
  }

  // Enum de marcação múltipla: chips que ligam e desligam, como a lista de órgãos.
  if (tipo === 'enum' && campo.multiplo) {
    const marcados = campo.valor.split(', ');
    return (
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-osg-200/80 bg-background px-2 py-1.5 shadow-[0_1px_1px_rgba(16,24,40,0.04)]">
        {(campo.opcoes ?? marcados).map((o) => {
          const ligado = marcados.includes(o);
          return (
            <span
              key={o}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[12.5px] ${
                ligado
                  ? 'border-osg-moss bg-osg-moss/10 font-medium text-osg-moss'
                  : 'border-osg-100 bg-osg-50/60 text-osg-500'
              }`}
            >
              <span
                className={`inline-block h-2.5 w-2.5 rounded border ${
                  ligado ? 'border-osg-moss bg-osg-moss' : 'border-osg-300'
                }`}
              />
              {o}
            </span>
          );
        })}
      </div>
    );
  }

  if (tipo === 'enum') {
    return (
      <Select
        value={mudar ? atual : undefined}
        defaultValue={mudar ? undefined : campo.valor}
        onValueChange={mudar}
      >
        <SelectTrigger className={caixa}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(campo.opcoes ?? [campo.valor]).map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Campo em branco no documento de exemplo entra como sugestão de preenchimento,
  // e não como valor: é a diferença entre "não sabemos" e "está vazio".
  if (campo.vazio) {
    return (
      <Input
        placeholder={campo.valor}
        value={mudar ? (ctx?.valores[campo.rotulo] ?? '') : undefined}
        onChange={mudar ? (e) => mudar(e.target.value) : undefined}
        className={caixa}
      />
    );
  }

  return (
    <Input
      value={mudar ? atual : undefined}
      defaultValue={mudar ? undefined : campo.valor}
      onChange={mudar ? (e) => mudar(e.target.value) : undefined}
      className={caixa}
    />
  );
};

/**
 * Grade de campos, na grade do sistema.
 *
 * `formGridCls(2)` só quebra em duas colunas quando o CONTÊINER passa de 672px, e
 * não a janela: é consulta de contêiner, então o campo dentro de painel estreito
 * não fica apertado. O escopo (`formScopeCls`) já vive no corpo do modal.
 */
const Grade = ({ campos, colunas }: { campos: Campo[]; colunas: 2 | 3 }) => (
  <div className={`${formGridCls(colunas)} gap-x-4 gap-y-3.5`}>
    {campos.map((c) => (
      <CampoLeitura key={c.rotulo} campo={c} />
    ))}
  </div>
);

/**
 * Os campos de um item, quebrados nos blocos que o próprio campo declara.
 *
 * Antes eram uma grade única dentro de um painel cinza, e o resultado era o mesmo
 * problema da tela em escala menor: quinze campos seguidos leem como lista
 * corrida. Agora cada bloco é um `FieldSection` do kit, o mesmo componente das
 * abas de matrícula, bem e pessoa, com trilho verde-musgo e número de ordem. O
 * painel cinza saiu: nos formulários de verdade o campo fica sobre a superfície
 * do modal.
 */
export const Campos = ({ campos, colunas = 2 }: { campos: Campo[]; colunas?: 2 | 3 }) => {
  // Agrupa por identidade do bloco, não por vizinhança: no Acordo os campos de
  // garantia e de representação estão separados pelos de arbitragem, e agrupar por
  // adjacência criava dois blocos com o mesmo nome. A ordem dos blocos é a da
  // primeira aparição.
  const blocos: { grupo?: string; itens: Campo[] }[] = [];
  campos.forEach((c) => {
    const existente = blocos.find((b) => b.grupo === c.grupo);
    if (existente) existente.itens.push(c);
    else blocos.push({ grupo: c.grupo, itens: [c] });
  });

  // Campo sem bloco declarado continua em grade solta: é o caso dos dois campos
  // avulsos da seção de grupos, que não formam formulário.
  if (blocos.length === 1 && !blocos[0].grupo) {
    return (
      <div className="rounded-md border border-osg-100 bg-muted/70 p-4">
        <Grade campos={campos} colunas={colunas} />
      </div>
    );
  }

  return (
    <div>
      {blocos.map((b, i) => (
        <FieldSection key={b.grupo ?? i} number={String(i + 1).padStart(2, '0')} title={b.grupo ?? 'Outros'}>
          <Grade campos={b.itens} colunas={colunas} />
        </FieldSection>
      ))}
    </div>
  );
};

/** Conta quantos campos daquela seção o sistema já guarda. */
export function resumo(campos: Campo[], extras = 0): string {
  const jaTem = campos.filter((c) => c.origem === 'existe').length;
  const total = campos.length + extras;
  return `${total} campos · ${jaTem === 0 ? 'nenhum' : jaTem} já no sistema`;
}

/**
 * Um item do cadastro: uma linha da lista, e um modal quando aberto.
 *
 * `base` não é documento: é parâmetro que os outros itens consomem (os órgãos e
 * os grupos de pessoas). `contrato` e `interno` são o destino do documento que
 * sai dali, e é por eles que a lista se divide.
 */
export type ItemGovernanca = {
  id: string;
  numero: string;
  titulo: string;
  /** Uma linha, na língua da consultora: o que se decide aqui. */
  chamada: string;
  produz: string;
  entidade: string;
  campos: string;
  pasta: string;
  destino: 'contrato' | 'registro' | 'interno' | 'interno-parcial' | 'base';
  /**
   * Etapa do fluxo de governança. É por ela que a lista se agrupa, e não pelo
   * destino: agrupar por destino punha o Protocolo depois da alteração
   * contratual, que é justamente o documento que ele alimenta. O destino
   * continua visível, como etiqueta em cada cartão.
   */
  etapa: 'base' | 'decide' | 'registra' | 'assume';
  /** Estado do preenchimento. É o que faz a tela ser cadastro e não documento. */
  preenchido: boolean;
  ultimaGeracao?: string;
  /**
   * Modal mais largo. Só para os itens que têm TABELA: a Matriz tem 21 linhas por
   * 3 órgãos mais a alçada, e com a largura padrão dos modais (4xl) a coluna da
   * alçada caía fora e obrigava a rolar para o lado.
   */
  largo?: boolean;
  /** Item que mostra o documento na coluna lateral: precisa de modal bem mais largo. */
  comDocumento?: boolean;
  abas: { valor: string; rotulo: string; conteudo: ReactNode }[];
};

/**
 * O rótulo do destino do DOCUMENTO, que não é o mesmo do destino do campo.
 *
 * `interno-parcial` existe porque "documento interno" sozinho mentia: o Protocolo
 * de Remuneração não vai a registro, mas quatro coisas dele descem ao contrato
 * social, e a etiqueta contradizia os "vira cláusula" que apareciam dentro dele.
 *
 * `registro` existe porque a ata de eleição e o termo de posse não viram
 * cláusula: eles são arquivados na Junta como documento próprio. O termo diz isso
 * de si mesmo, "com o registro deste termo e da respectiva ata que os elegeram na
 * Junta Comercial".
 */
const DESTINO_ITEM = {
  contrato: { rotulo: 'vai ao contrato social', cor: 'border-osg-moss/40 bg-osg-moss/[0.07] text-osg-moss' },
  registro: { rotulo: 'vai a registro na Junta', cor: 'border-osg-moss/40 bg-osg-moss/[0.07] text-osg-moss' },
  'interno-parcial': {
    rotulo: 'interno, com parte no contrato',
    cor: 'border-osg-moss/30 bg-osg-50 text-osg-600',
  },
  interno: { rotulo: 'documento interno', cor: 'border-osg-300/70 bg-osg-100/70 text-osg-600' },
  base: { rotulo: 'não é documento', cor: 'border-osg-200 bg-background text-osg-500' },
} as const;

export const EtiquetaDestino = ({ destino }: { destino: ItemGovernanca['destino'] }) => (
  <span
    className={`inline-flex shrink-0 items-baseline rounded-full border px-2 py-0.5 text-[10.5px] font-medium leading-tight tracking-wide ${DESTINO_ITEM[destino].cor}`}
  >
    {DESTINO_ITEM[destino].rotulo}
  </span>
);

/**
 * Grupo da lista. É o que resolve a crítica de ordem: o Protocolo é o único que
 * não vira cláusula, então ele não fica no meio dos que viram — ele fica no seu
 * próprio grupo, e o cabeçalho diz por quê.
 */
export const GrupoItens = ({
  titulo,
  explica,
  children,
}: {
  titulo: string;
  explica: string;
  children: ReactNode;
}) => (
  <section className="mt-7 first:mt-5">
    <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-osg-100 pb-2">
      <h2 className="text-[12px] font-bold uppercase tracking-[0.14em] text-osg-moss">{titulo}</h2>
      <p className="text-[11.5px] text-muted-foreground">{explica}</p>
    </div>
    <div className="grid gap-3 md:grid-cols-2">{children}</div>
  </section>
);

/**
 * A linha da lista. É um botão inteiro, e não um cartão com botão dentro, porque
 * é assim que a lista de bens e a de matrículas se comportam: a área toda abre.
 */
export const CartaoItem = ({ item, onAbrir }: { item: ItemGovernanca; onAbrir: () => void }) => (
  <button
    type="button"
    onClick={onAbrir}
    className="group flex min-h-[124px] w-full flex-col gap-2 rounded-lg border border-osg-100 bg-background p-4 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors hover:border-osg-moss/50 hover:bg-osg-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-osg-moss"
  >
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
      <span className="font-mono text-xs font-bold tabular-nums text-osg-moss">{item.numero}</span>
      <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-osg-700">{item.titulo}</h3>
      <span
        className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-medium leading-tight ${
          item.preenchido ? 'bg-osg-moss/10 text-osg-moss' : 'bg-osg-100 text-osg-500'
        }`}
      >
        {item.preenchido ? 'preenchido' : 'falta preencher'}
      </span>
    </div>
    <span className="self-start">
      <EtiquetaDestino destino={item.destino} />
    </span>
    <p className="text-[13px] leading-snug text-osg-500">{item.chamada}</p>
    <div className="mt-auto flex w-full flex-wrap items-baseline gap-x-3 gap-y-0.5 pt-1 text-[11px] text-muted-foreground">
      <span>{item.campos}</span>
      {item.ultimaGeracao && <span>última: {item.ultimaGeracao}</span>}
      <span className="ml-auto flex shrink-0 items-center gap-0.5 font-semibold text-osg-moss">
        {item.preenchido ? 'revisar' : 'preencher'}
        <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </div>
  </button>
);

/** As três informações de contexto do item, dentro do modal. */
const ResumoItem = ({ item }: { item: ItemGovernanca }) => (
  <dl className="mb-3.5 flex flex-wrap gap-x-5 gap-y-0.5 text-[11px] text-muted-foreground">
    <div className="flex gap-1.5">
      <dt className="font-semibold text-osg-600">Produz</dt>
      <dd>{item.produz}</dd>
    </div>
    <div className="flex gap-1.5">
      <dt className="font-semibold text-osg-600">Pende de</dt>
      <dd>{item.entidade}</dd>
    </div>
    <div className="flex gap-1.5">
      <dt className="font-semibold text-osg-600">Campos</dt>
      <dd>{item.campos}</dd>
    </div>
    <div className="flex gap-1.5">
      <dt className="font-semibold text-osg-600">Vem de</dt>
      <dd>{item.pasta}</dd>
    </div>
  </dl>
);

/**
 * Formulário à esquerda, documento à direita.
 *
 * Era prévia no fim do modal e virou coluna lateral porque acompanhar ficou mais
 * simples: mexe no campo e vê a cláusula mudar sem rolar. A coluna do documento
 * tem rolagem própria e fica colada no topo.
 *
 * O clique numa marca amarela procura o campo pelo `data-campo` DENTRO deste
 * bloco, rola até ele e pisca a borda. Procuro no nó do próprio componente e não
 * no documento inteiro para não pegar campo de outra aba com o mesmo rótulo.
 */
export const LadoALado = ({
  formulario,
  documento,
}: {
  formulario: ReactNode;
  /** Recebe o navegador de campo e o leitor de valores, e devolve o documento. */
  documento: (
    irParaCampo: (campo: string) => void,
    ler: (rotulo: string, padrao: string) => string,
  ) => ReactNode;
}) => {
  const caixa = useRef<HTMLDivElement>(null);
  const ler = useValor();

  const irParaCampo = (campo: string) => {
    const alvo = caixa.current?.querySelector<HTMLElement>(`[data-campo="${campo}"]`);
    if (!alvo) return;
    alvo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    alvo.classList.add('ring-2', 'ring-osg-moss', 'ring-offset-2');
    window.setTimeout(() => alvo.classList.remove('ring-2', 'ring-osg-moss', 'ring-offset-2'), 1600);
  };

  return (
    <div ref={caixa} className="flex gap-6">
      <div className="min-w-0 flex-1">{formulario}</div>
      <div className="sticky top-0 hidden w-[44%] shrink-0 self-start xl:block">
        <div className="max-h-[calc(90vh-13rem)] overflow-y-auto pr-1">
          {documento(irParaCampo, ler)}
        </div>
      </div>
    </div>
  );
};

/**
 * O modal de preenchimento, na moldura real dos modais da OSG: `OsgDialog` com
 * `max-w-4xl`, cabeçalho fixo, abas em passo, corpo que rola e rodapé com os dois
 * botões. O `formScopeCls` no corpo é o que faz a grade medir o modal e não a
 * janela.
 *
 * Não existe botão de gerar aqui de propósito: nos cadastros que já existem
 * (matrícula, bem, pessoa, cliente) o formulário só guarda, e o documento sai da
 * tela "Gerar Documento", alcançada pelo menu.
 */
export const ModalItem = ({ item, onFechar }: { item: ItemGovernanca; onFechar: () => void }) => {
  const [aba, setAba] = useState(item.abas[0].valor);
  const [valores, setValores] = useState<Record<string, string>>({});
  const ctx = {
    valores,
    setValor: (rotulo: string, valor: string) =>
      setValores((v) => ({ ...v, [rotulo]: valor })),
  };

  return (
    <Valores.Provider value={ctx}>
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent
        className={`flex max-h-[90vh] flex-col gap-0 overflow-visible p-0 sm:[clip-path:none] ${
          item.comDocumento ? 'max-w-[94vw]' : item.largo ? 'max-w-5xl' : 'max-w-4xl'
        }`}
      >
        <Tabs value={aba} onValueChange={setAba} className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 rounded-t-lg bg-background px-6 pt-5">
            <DialogHeader className="mb-3 space-y-0 text-left">
              <DialogTitle className="flex flex-wrap items-center gap-2.5 pr-8 text-base font-semibold">
                {item.titulo}
                <span className="rounded-md bg-osg-50 px-2 py-0.5 font-mono text-sm font-semibold text-osg-700">
                  {item.numero}
                </span>
                <EtiquetaDestino destino={item.destino} />
              </DialogTitle>
            </DialogHeader>
            <ResumoItem item={item} />
            {item.abas.length > 1 && (
              <TabsList className={osgTabsListCls}>
                {item.abas.map((a) => (
                  <TabsTrigger key={a.valor} value={a.valor} className={osgTabTriggerCls}>
                    {a.rotulo}
                  </TabsTrigger>
                ))}
              </TabsList>
            )}
          </div>
          <div className={`min-h-0 flex-1 overflow-y-auto px-6 py-5 ${formScopeCls}`}>
            {item.abas.map((a) => (
              <TabsContent key={a.valor} value={a.valor} className="mt-0 focus-visible:ring-0">
                {a.conteudo}
              </TabsContent>
            ))}
          </div>
          <DialogFooter className="shrink-0 items-center rounded-b-lg border-t border-osg-100 bg-background px-6 py-3.5 sm:justify-between">
            <span className="text-[11px] text-muted-foreground">Mockup: nada aqui salva.</span>
            <span className="flex gap-2">
              <Button variant="outline" onClick={onFechar}>
                Cancelar
              </Button>
              <Button disabled className="bg-osg-moss text-white hover:bg-osg-moss/90">
                Salvar
              </Button>
            </span>
          </DialogFooter>
        </Tabs>
      </DialogContent>
    </Dialog>
    </Valores.Provider>
  );
};

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

/**
 * Célula de grade: lista suspensa com o vocabulário inteiro, para poder ser lido.
 *
 * A largura mínima não é estética: o vocabulário tem "submete à aprovação" e
 * "fornece informações", e com 130px o Chrome cortava o texto e amassava a seta.
 * A medida vem do item mais longo da lista, não de um palpite.
 */
export const Escolha = ({
  valor,
  opcoes,
  rotulo,
  onChange,
}: {
  valor: string;
  opcoes: readonly string[];
  rotulo: string;
  /** Ausente = campo solto, sem estado. Presente = a célula alimenta a prévia. */
  onChange?: (v: string) => void;
}) => (
  <select
    aria-label={rotulo}
    value={onChange ? valor : undefined}
    defaultValue={onChange ? undefined : valor}
    onChange={onChange ? (e) => onChange(e.target.value) : undefined}
    className="w-full min-w-[186px] rounded-md border border-osg-200/80 bg-background px-2 py-1 text-[13px] text-osg-700 shadow-[0_1px_1px_rgba(16,24,40,0.04)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-osg-moss"
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
