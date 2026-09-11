import { describe, expect, it } from 'vitest';

import { familiaCrua, medirCorCrua } from '@/lib/medirCorCrua';

/**
 * Catraca das famílias `red` e `emerald`.
 *
 * O lote era de **248 ocorrências** em 78 arquivos, medido em 11/09/2026 — as duas
 * maiores famílias sem guarda nenhuma, na mesma situação em que o `slate` chegou a
 * 1529 sem ninguém ver. Num dia só, 223 saíram, cada grupo por uma decisão dela
 * tomada **olhando** a página `comparacoes-de-cor/vermelho-e-verde-o-que-cada-um-diz.html`
 * e, nos dois últimos casos, a tela rodando com os candidatos aplicados ao vivo.
 *
 * O QUE A PASSADA ENSINOU, e vale para a próxima família:
 *
 * · **a pergunta quase nunca era o tom.** "Scope creep é azul" não se responde com
 *   uma cor — se responde dizendo se aquele número acusa alguém. Quando a pergunta
 *   virou essa, ela respondeu em segundos, e a cor saiu junto;
 * · **fileira se converte inteira.** Metade em token e metade em estoque é pior que
 *   a fileira crua — é o motivo `escada-de-status` da `filaDoAlerta`, e foi o que
 *   segurou metade deste lote até o par `green`/`rose` entrar junto;
 * · **o lote estava mal recortado, e a medição mostrou.** 16 dos 78 arquivos tinham
 *   o par fora da família varrida. Recortar por FAMÍLIA é cômodo para quem varre e
 *   errado para quem lê a tela;
 * · **cor que não é estado tem outro destino.** O selo do monofásico, as fases do
 *   PER e o cenário promovido foram para `--tag-*`: etiqueta não promete estado.
 *
 * A asserção é de igualdade EXATA, então a lista é catraca nos dois sentidos:
 * vermelho ou verde NOVO derruba o teste, contagem que sobe derruba, e conversão
 * feita derruba igual — pedindo que a lista encolha. A fila só pode diminuir, e
 * nunca de fininho.
 *
 * Por que não é regra de ESLint: `bg-red-100` é classe válida do Tailwind, e a
 * regra `escala/cor-de-estoque` só dispara em nome que o projeto TAMBÉM define no
 * `tailwind.config.ts` — `red` e `emerald` não estão lá e nunca estiveram.
 *
 * ⚠️ Ao mexer aqui, mexa por MOTIVO e não por arquivo solto.
 */
type MotivoDeFicar =
  /** O site público. **Decisão dela na passada do `gray`**: a landing pinta a
      própria paleta, com seções escuras de propósito, e ali o verde da marca sobre
      fundo claro está certo. É outro produto, e entra numa frente própria se algum
      dia entrar. */
  | 'site-publico'
  /** Cor que separa CATEGORIAS, não estados: o ícone vermelho de PDF ao lado do
      verde de planilha, a cor da categoria "tax", o gradiente do seletor de área.
      O destino são os `--tag-*`, e essa conversão é a frente da paleta categórica
      — não esta. Converter agora seria escolher tag por tag sem o mapa pronto. */
  | 'paleta-categorica'
  /** "Admin": rótulo de ACESSO. Não é estado de nada — mesmo motivo pelo qual
      "Líder" ficou na `filaDoAlerta`. Cargo não muda de estado; a pessoa é ou não é.

      ⚠️ Estes três arquivos estão TAMBÉM na mira da frente do azul, que já levou o
      `roleOptions.ts` inteiro em `f0538b86` ("o papel do usuário para de ser sete
      cores: a cor marca só quem é de fora"). Se ela voltar a esta mesa, o vermelho
      do "Admin" sai junto e estas três entradas somem daqui. */
  | 'rotulo-nao-status';

const FILA_DO_RED_EMERALD: Record<MotivoDeFicar, Record<string, number>> = {
  'site-publico': {
    'src/components/Footer.tsx': 2,
    'src/components/OfficesSection.tsx': 5,
    'src/components/ResultsSection.tsx': 1,
    'src/components/TestimonialsSection.tsx': 2,
  },
  'paleta-categorica': {
    'src/components/acessos/pageCategoryStyles.ts': 3,
    'src/components/equipe/mapeamento/ScenarioCreateModal.tsx': 1,
    'src/components/equipe/osg/documentos/docMeta.ts': 2,
    'src/pages/equipe/DigitalAreaSelector.tsx': 1,
    'src/pages/equipe/EquipeBiblioteca.tsx': 1,
  },
  'rotulo-nao-status': {
    'src/components/acessos/PagesTab.tsx': 3,
    'src/components/acessos/UsersRolesView.tsx': 2,
    'src/pages/administracao/AdminUsuarios.tsx': 2,
  },
};

/** Vermelho e verde-esmeralda — as duas famílias deste lote.
    `green` e `rose` NÃO entram: elas têm 71 e 8 ocorrências fora daqui, nenhuma em
    escada com este lote, e são frente própria. O que estava em escada já veio
    junto, nos nove arquivos que a opção C fechou. */
const COR_CRUA_DE_RED_EMERALD = familiaCrua('red', 'emerald');

describe('fila do `red` e do `emerald`', () => {
  it('a cor crua que sobrou é exatamente a que está inventariada', () => {
    const esperado = Object.fromEntries(
      Object.values(FILA_DO_RED_EMERALD).flatMap(grupo => Object.entries(grupo)),
    );
    expect(
      medirCorCrua(COR_CRUA_DE_RED_EMERALD),
      'A fila do `red`/`emerald` mudou.\n'
        + '· Arquivo NOVO na medição: alguém escreveu vermelho ou verde cru. O destino está\n'
        + '  decidido por papel — `destructive` para erro e ação destrutiva, `status-feito`\n'
        + '  para concluído, a âncora da área para marcador de ativo, `--tag-*` para\n'
        + '  categoria. O contrato está em docs/geral/paleta-por-area.md.\n'
        + '· Contagem que SUBIU: mesmo caso, em arquivo que já estava na fila.\n'
        + '· Contagem que CAIU, ou arquivo que sumiu: a conversão andou. Atualize\n'
        + '  FILA_DO_RED_EMERALD neste arquivo, mantendo a entrada no grupo do MOTIVO dela.',
    ).toEqual(esperado);
  });

  it('nenhum arquivo aparece em dois motivos', () => {
    // A lista serve para dizer POR QUE cada sítio ficou. Arquivo em dois grupos faz o
    // `esperado` acima somar errado, e a resposta deixa de ser única.
    const vistos = Object.values(FILA_DO_RED_EMERALD).flatMap(grupo => Object.keys(grupo));
    expect(vistos.length, 'arquivo repetido entre motivos').toBe(new Set(vistos).size);
  });

  it('nenhuma tela interna do produto ficou com vermelho ou verde cru', () => {
    // O recorte que importa para quem usa o sistema: fora o site público, a fila só
    // pode conter cor que NÃO é estado. Se um arquivo de tela interna entrar aqui com
    // papel de status dentro, este teste cai antes de alguém precisar reparar no olho.
    const interno = Object.keys(medirCorCrua(COR_CRUA_DE_RED_EMERALD))
      .filter(caminho => !Object.keys(FILA_DO_RED_EMERALD['site-publico']).includes(caminho));
    const inventariado = [
      ...Object.keys(FILA_DO_RED_EMERALD['paleta-categorica']),
      ...Object.keys(FILA_DO_RED_EMERALD['rotulo-nao-status']),
    ];
    expect(interno.sort(), 'tela interna com cor crua fora do inventário').toEqual(inventariado.sort());
  });
});
