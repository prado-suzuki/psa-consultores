import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { SECAO_INICIAL, SECOES_DE_ACESSOS, rotuloDaSecao } from './secoesDeAcessos';

const FONTE_DA_PAGINA = resolve(__dirname, '../pages/equipe/EquipeControleAcessos.tsx');

describe('secoesDeAcessos', () => {
  it('a seção que abre é a primeira do menu', () => {
    expect(SECAO_INICIAL).toBe(SECOES_DE_ACESSOS[0].id);
  });

  it('devolve o rótulo de cada seção', () => {
    expect(rotuloDaSecao('pages')).toBe('Páginas');
    expect(rotuloDaSecao('agente')).toBe('Agente');
  });

  it('nenhum id se repete — dois itens com o mesmo id acenderiam juntos', () => {
    const ids = SECOES_DE_ACESSOS.map((s) => s.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  // ESTE é o teste que importa, e ele lê o fonte de propósito.
  //
  // Cada `id` desta lista é o `value` de um `<TabsContent>` na página. Se um
  // lado for renomeado sem o outro, o build passa, o typecheck passa e a seção
  // abre VAZIA — com o item da barra aceso, como se estivesse tudo certo. Não
  // há tipo que ligue os dois: o `value` do Radix é `string`.
  describe('cada seção tem conteúdo na página', () => {
    const fonte = readFileSync(FONTE_DA_PAGINA, 'utf8');

    it.each(SECOES_DE_ACESSOS.map((s) => s.id))(
      'a seção "%s" tem um <TabsContent> correspondente',
      (id) => {
        expect(fonte).toContain(`<TabsContent value="${id}"`);
      },
    );

    it('a página não tem mais a fila de abas — quem troca de seção é a barra', () => {
      // A `TabsList` de primeiro nível saiu; a que sobrou é a das sub-abas de
      // "Cadastros Estrutura", que continua sendo fila e deve continuar.
      expect(fonte).not.toContain('<TabsList className="bg-muted border border-border">');
    });
  });
});
