import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  TELAS_ESPELHADAS,
  type AreaEspelhada,
  type TelaEspelhada,
  resolverCabecalho,
  textosDaTela,
} from '@/config/textosDasTelas';

/*
 * A CATRACA DO ESPELHO.
 *
 * O catálogo sozinho não garante nada: ele evita que o texto seja escrito duas
 * vezes, mas não impede alguém de voltar a escrever `title="…"` à mão num
 * invólucro e sair do espelho sem que ninguém perceba — que foi exatamente como
 * as onze telas da OSG ficaram para trás em 15/09/2026.
 *
 * Estes testes leem os INVÓLUCROS de verdade, e não uma cópia da lista.
 */

/** As areas que espelham o catalogo INTEIRO, que e o que esta auditoria cobra.
    Auditoria e Juridico usam o catalogo sem montar as telas da Gerencial. */
type AreaAuditada = Extract<AreaEspelhada, 'tax' | 'osg'>;

const PASTAS: Record<AreaAuditada, string> = {
  tax: 'src/pages/equipe/fiscal',
  osg: 'src/pages/equipe/osg',
};

/** As telas que cada área declara, lendo os arquivos. */
function telasDeclaradas(area: AreaAuditada): Set<string> {
  const dir = PASTAS[area];
  const telas = new Set<string>();
  for (const arquivo of readdirSync(dir)) {
    if (!arquivo.endsWith('.tsx') || arquivo.endsWith('.test.tsx')) continue;
    const fonte = readFileSync(`${dir}/${arquivo}`, 'utf8');
    for (const m of fonte.matchAll(/tela="([^"]+)"/g)) telas.add(m[1]);
  }
  return telas;
}

/** Os títulos escritos à mão numa área, e em que arquivo cada um mora. */
function titulosEscritosAMao(area: AreaAuditada): Map<string, string> {
  const dir = PASTAS[area];
  const porTitulo = new Map<string, string>();
  for (const arquivo of readdirSync(dir)) {
    if (!arquivo.endsWith('.tsx') || arquivo.endsWith('.test.tsx')) continue;
    const fonte = readFileSync(`${dir}/${arquivo}`, 'utf8');
    const m = fonte.match(/<(?:Fiscal|Osg)Layout[^>]*?\stitle="([^"]+)"/s);
    if (m) porTitulo.set(m[1], arquivo);
  }
  return porTitulo;
}

describe('toda tela do catálogo é espelhada de verdade', () => {
  it('as duas áreas montam TODAS as telas do catálogo', () => {
    // Entrada que só uma área usa não é tela espelhada — é texto de uma área só
    // morando no lugar errado, e o catálogo deixa de significar o que promete.
    const doTax = telasDeclaradas('tax');
    const daOsg = telasDeclaradas('osg');
    for (const tela of Object.keys(TELAS_ESPELHADAS)) {
      expect(doTax, `"${tela}" não é montada por nenhum invólucro da Tax`).toContain(tela);
      expect(daOsg, `"${tela}" não é montada por nenhum invólucro da OSG`).toContain(tela);
    }
  });

  it('nenhum invólucro declara uma tela que o catálogo não tem', () => {
    const chaves = new Set(Object.keys(TELAS_ESPELHADAS));
    for (const area of ['tax', 'osg'] as const) {
      for (const tela of telasDeclaradas(area)) {
        expect(chaves, `"${tela}" não existe no catálogo (${area})`).toContain(tela);
      }
    }
  });
});

describe('o que ainda escreve título à mão', () => {
  /*
   * Escrever o título à mão continua VALENDO — é o que as telas de uma área só
   * fazem: as dezenove do OSG Work, o Controle de Projetos, a Solicitação de
   * documentos. O que não pode é o mesmo título aparecer escrito à mão nas DUAS,
   * porque aí ele é espelho e está fora do catálogo — que é a figura exata do
   * "Produtos & Serviços", achada por este teste ao ser escrito.
   *
   * O casamento é por título EXATO, e portanto não pega o espelho que já
   * divergiu de nome ("Gestão de Chamados" contra "Lista de Chamados"). Pega o
   * que ainda é cópia, que é quando ainda dá para consertar barato.
   */
  it('nenhum título escrito à mão existe nas duas áreas', () => {
    const doTax = titulosEscritosAMao('tax');
    const daOsg = titulosEscritosAMao('osg');
    const nasDuas = [...doTax.keys()].filter((titulo) => daOsg.has(titulo));
    expect(
      nasDuas.map((t) => `"${t}" (${doTax.get(t)} e ${daOsg.get(t)})`),
      'título igual nas duas áreas é tela espelhada — mova para TELAS_ESPELHADAS',
    ).toEqual([]);
  });
});

describe('o nome da área entra no texto', () => {
  it('as três telas que nomeiam a área saem com o nome certo', () => {
    expect(textosDaTela('boasVindas', 'tax').title).toBe('Bem-vindo à área Tax');
    expect(textosDaTela('boasVindas', 'osg').title).toBe('Bem-vindo à área OSG');
    expect(textosDaTela('dashboard', 'osg').subtitle).toContain('da área OSG em tempo real');
    expect(textosDaTela('logsDeUso', 'tax').subtitle).toContain('do time na área Tax.');
  });

  it('nenhum texto sai com a marca por substituir', () => {
    // Marca esquecida não quebra a tela: ela APARECE, escrita, para o usuário.
    for (const tela of Object.keys(TELAS_ESPELHADAS) as TelaEspelhada[]) {
      for (const area of ['tax', 'osg'] as const) {
        const { title, subtitle } = textosDaTela(tela, area);
        expect(title, `${tela}/${area}`).not.toContain('{AREA}');
        expect(subtitle, `${tela}/${area}`).not.toContain('{AREA}');
      }
    }
  });

  it('o que NÃO nomeia a área é a mesma string nas duas', () => {
    // É esta a asserção que diz o que "espelho" significa: o texto é o mesmo, e
    // só difere onde a frase cita a área.
    for (const tela of Object.keys(TELAS_ESPELHADAS) as TelaEspelhada[]) {
      const bruto = TELAS_ESPELHADAS[tela];
      if (bruto.title.includes('{AREA}') || bruto.subtitle.includes('{AREA}')) continue;
      expect(textosDaTela(tela, 'tax')).toEqual(textosDaTela(tela, 'osg'));
    }
  });
});

describe('resolverCabecalho', () => {
  it('pela tela, devolve o texto do catálogo', () => {
    expect(resolverCabecalho({ tela: 'chamadosLista' }, 'osg')).toEqual({
      title: 'Lista de Chamados',
      subtitle: 'Consulte e gerencie os chamados dos clientes da sua carteira.',
    });
  });

  it('sem tela, devolve o que veio escrito', () => {
    expect(resolverCabecalho({ title: 'OSG Work', subtitle: 'Ferramentas' }, 'osg')).toEqual({
      title: 'OSG Work',
      subtitle: 'Ferramentas',
    });
  });
});
