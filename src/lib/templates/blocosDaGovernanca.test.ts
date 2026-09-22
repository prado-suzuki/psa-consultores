/**
 * O CAPÍTULO SEMEADO USA SÓ CAMPO QUE EXISTE.
 *
 * Nome de campo que não existe no vocabulário não dá erro: ele simplesmente
 * nunca casa. Foi assim que `capitalValorExtenso` fez o aumento de capital sair
 * com o algarismo novo e o extenso velho, calado, num documento levado a
 * registro. O capítulo da governança tem 42 blocos e 8 variantes de alínea, e
 * uma letra errada em qualquer um deles produziria o mesmo silêncio.
 *
 * Este teste lê a MIGRATION, que é onde a redação vive, e confere cada
 * `{{ binding.campo }}` contra o catálogo da entidade daquele papel. Ler o
 * arquivo em vez de repetir os textos aqui é deliberado: texto copiado para o
 * teste envelhece sozinho, e o que precisa ser guardado é o que vai ao banco.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PAPEIS, PAPEIS_LISTA } from './binding';
import { camposDaEntidade, type TipoEntidade } from './vocabulario';

const MIGRATION = 'supabase/migrations/20260915201913_capitulo_da_governanca_no_contrato_social.sql';
const sql = readFileSync(MIGRATION, 'utf8');

/** Todo `{{ … }}` do arquivo, seja placeholder, abertura ou fechamento de seção. */
const CAMINHOS = /\{\{\s*[#/]?([\w.]+)\s*\}\}/g;

const campos = (tipo: TipoEntidade) => camposDaEntidade(tipo).map((c) => c.id);

/**
 * Os campos que um papel aceita.
 *
 * Papel unitário (`conselhoAdministracao`, `diretoria`) tem os campos da
 * entidade dele. Papel de ITEM de lista (`orgao` em `orgaosComCompetencia`,
 * `competencia` em `competencias`) tem os da entidade MAIS os `camposExtras` da
 * lista, que é onde mora a letra da alínea: ela não é dado do cadastro, é
 * posição na lista, calculada na geração depois do descarte.
 */
function camposDoPapel(papel: string): Set<string> | null {
  if (papel in PAPEIS) return new Set(campos(PAPEIS[papel as keyof typeof PAPEIS].tipo));
  for (const lista of Object.values(PAPEIS_LISTA)) {
    if (lista.itemKey !== papel) continue;
    return new Set([...campos(lista.tipo), ...(lista.camposExtras ?? []).map((c) => c.id)]);
  }
  return null;
}

describe('o capítulo da governança semeado pela migration', () => {
  it('cita só campos que existem no vocabulário', () => {
    const desconhecidos: string[] = [];
    for (const [, caminho] of sql.matchAll(CAMINHOS)) {
      const [papel, campo] = caminho.split('.');
      if (!campo) continue;
      // `refs.<ancora>` é numeração publicada pela composição, não vocabulário.
      if (papel === 'refs') continue;
      const aceitos = camposDoPapel(papel);
      if (!aceitos) {
        desconhecidos.push(`${caminho} (papel "${papel}" não está no binding)`);
        continue;
      }
      if (!aceitos.has(campo)) {
        desconhecidos.push(`${caminho} (campo "${campo}" não existe no papel "${papel}")`);
      }
    }
    expect(desconhecidos).toEqual([]);
  });

  it('a âncora citada pelas resoluções é a que a própria migration cria', () => {
    // `{{ refs.capituloAdministracao }}` devolve "Capítulo IV". Se a âncora não
    // for publicada, o render lança "Placeholder não resolvido" na cara do
    // consultor — que é ruidoso, e portanto melhor que sair calado; ainda assim,
    // o par tem de fechar aqui.
    const citadas = new Set(
      [...sql.matchAll(/\{\{\s*refs\.(\w+)\s*\}\}/g)].map((m) => m[1]),
    );
    expect([...citadas]).toEqual(['capituloAdministracao']);
    expect(sql).toContain("set ancora = 'capituloAdministracao'");
  });

  it('o seletor das variantes lê só condicionais, nunca campo base', () => {
    /*
     * Condicional derivada existe SEMPRE (vale 'sim' ou ''); campo base some
     * quando o cadastro não o tem, e o que some faz o seletor da família acusar
     * "classificação ausente" em vez de escolher a redação sem o dado.
     */
    const seletores = [...sql.matchAll(/'(\{"competencia\.[^']*\})'::jsonb/g)]
      .map((m) => JSON.parse(m[1]) as Record<string, string>);
    expect(seletores.length).toBeGreaterThanOrEqual(7);

    const derivados = new Set(
      camposDaEntidade('competenciaMatriz')
        .filter((c) => c.derivar && (c.tipo === 'texto'))
        .map((c) => c.id),
    );
    const base = seletores
      .flatMap((s) => Object.keys(s))
      .map((caminho) => caminho.split('.')[1])
      .filter((campo) => !derivados.has(campo));
    expect(base).toEqual([]);
  });

  it('a família citada pelo repetidor é a que a migration semeia', () => {
    const citada = new Set(
      [...sql.matchAll(/\{\{familia nome="([^"]+)"\}\}/g)].map((m) => m[1]),
    );
    expect([...citada]).toEqual(['Alínea de competência']);
    // A cabeça da família é criada com esse mesmo nome, e é por ele que o
    // registro do render é indexado.
    expect(sql).toContain("'Alínea de competência',");
  });

  it('a pontuação da lista de alíneas é JUNTURA, não texto do item', () => {
    // O ";" entre as alíneas e o "." no fim saem dos atributos da seção. Dentro
    // do item, a última alínea terminaria em ";" — o defeito que a família da
    // alínea de imóvel já corrigiu uma vez.
    expect(sql).toContain('{{#competencias sep=";\\n" fim=";\\n"}}');
    expect(sql).toContain('{{/competencias}}.');
  });
});
