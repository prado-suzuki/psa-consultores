/*
 * A NUMERAÇÃO DO ACORDO, CONFERIDA CONTRA O MODELO DE VERDADE.
 *
 * Os 266 blocos saíram do `VF_Modelo Acordo de Quotistas` lido com as alterações
 * aceitas, e a classificação de cada um saiu do XML. Este teste fecha o círculo:
 * passa os blocos pela numeração do motor e compara o resultado com os números
 * que o documento escreve.
 *
 * É a única conferência que pega o erro que interessa. Tipo trocado não dá erro
 * em lugar nenhum: o bloco entra, o documento sai, e a numeração está errada no
 * Word entregue ao cliente.
 */
import { describe, expect, it } from 'vitest';

import blocosDoAcordo from '../../../docs/osg/acordo-blocos.json';
import { numerarBlocos } from './numeracao';
import { camposDaEntidade } from './vocabulario';
import type { Bloco, TipoBloco } from './types';

interface BlocoDoArquivo {
  nome: string;
  tipo: string;
  titulo: string | null;
  conteudo: string;
}

const blocos: Bloco[] = (blocosDoAcordo as BlocoDoArquivo[]).map((b, i) => ({
  id: `b${i}`,
  tipo: b.tipo as TipoBloco,
  tituloDocumento: b.titulo ?? undefined,
  conteudo: b.conteudo,
  obrigatorio: true,
}));

/** O prefixo que a numeração colou, que é o que o documento vai mostrar. */
const prefixo = (conteudo: string, original: string) =>
  conteudo.slice(0, conteudo.length - original.length).trim();

describe('os blocos do Acordo numeram como o modelo numera', () => {
  const numerados = numerarBlocos(blocos);

  it('são 266 blocos, e a composição é a medida no modelo', () => {
    const conta = blocos.reduce<Record<string, number>>(
      (a, b) => ({ ...a, [b.tipo ?? 'livre']: (a[b.tipo ?? 'livre'] ?? 0) + 1 }), {},
    );
    expect(conta).toEqual({
      item: 141, subitem: 50, inciso: 32, clausula: 26, alinea: 14, livre: 3,
    });
  });

  it('as 26 cláusulas saem numeradas de PRIMEIRA a VIGÉSIMA SEXTA, com título', () => {
    const clausulas = numerados
      .filter((b) => b.tipo === 'clausula')
      .map((b) => b.conteudo.split('\n')[0]);

    expect(clausulas).toHaveLength(26);
    expect(clausulas[0]).toBe('*CLÁUSULA PRIMEIRA – Definições das expressões utilizadas neste ACORDO.*');
    expect(clausulas[8]).toBe('*CLÁUSULA NONA – Do Voto*');
    expect(clausulas[25]).toBe('*CLÁUSULA VIGÉSIMA SEXTA – Da solução de Litígios*');
    // Nenhuma pode sair com o formato do contrato social, que é dois-pontos.
    expect(clausulas.filter((c) => c.includes(':*'))).toEqual([]);
  });

  it('o item reinicia a cada cláusula, e o primeiro de cada uma é "N.1"', () => {
    const porClausula: string[] = [];
    let nClausula = 0;
    let esperandoPrimeiro = false;
    for (const [i, b] of numerados.entries()) {
      if (blocos[i].tipo === 'clausula') {
        nClausula += 1;
        esperandoPrimeiro = true;
        continue;
      }
      if (blocos[i].tipo === 'item' && esperandoPrimeiro) {
        porClausula.push(prefixo(b.conteudo, blocos[i].conteudo));
        esperandoPrimeiro = false;
      }
    }
    // Toda cláusula que tem item começa no ".1" da própria cláusula.
    expect(porClausula.every((p, k) => p === `${k + 1}.1`), porClausula.join(' ')).toBe(true);
  });

  it('a Cláusula Primeira sai com o item de abertura e os subitens das definições', () => {
    const primeira = numerados.findIndex((_, i) => blocos[i].tipo === 'clausula');
    const seguintes = numerados.slice(primeira + 1, primeira + 5)
      .map((b, k) => prefixo(b.conteudo, blocos[primeira + 1 + k].conteudo));
    // "1.1 Para fins do presente ACORDO…", depois "1.1.1 ACORDO: este ACORDO…"
    expect(seguintes).toEqual(['1.1', '1.1.1', '1.1.2', '1.1.3']);
  });

  it('inciso sai em romano e alínea em letra, cada um no seu lugar', () => {
    const prefixos = numerados.map((b, i) => ({
      tipo: blocos[i].tipo, p: prefixo(b.conteudo, blocos[i].conteudo),
    }));
    const incisos = prefixos.filter((x) => x.tipo === 'inciso').map((x) => x.p);
    const alineas = prefixos.filter((x) => x.tipo === 'alinea').map((x) => x.p);

    expect(incisos).toHaveLength(32);
    expect(alineas).toHaveLength(14);
    expect(incisos.every((p) => /^\([IVX]+\)$/.test(p)), incisos.join(' ')).toBe(true);
    expect(alineas.every((p) => /^[a-z]\)$/.test(p)), alineas.join(' ')).toBe(true);
    // O primeiro inciso de uma sequência é sempre (I), nunca continuação de outra.
    expect(incisos[0]).toBe('(I)');
    expect(alineas[0]).toBe('a)');
  });

  it('nenhum bloco ficou com o rótulo velho sobrando no texto', () => {
    /*
     * O modelo mistura numeração automática do Word com número digitado à mão
     * ("4.1 O direito…", "(I) o QUOTISTA…"). O digitado foi removido na
     * extração; se algum escapar, o documento sai "4.1 4.1 O direito".
     */
    const sobrando = blocos
      .filter((b) => ['item', 'subitem', 'alinea', 'inciso'].includes(b.tipo ?? ''))
      .filter((b) => /^\s*(\d+\.\d+|\([IVX]+\)|[a-z]\))/.test(b.conteudo))
      .map((b) => b.conteudo.slice(0, 50));
    expect(sobrando).toEqual([]);
  });

  it('toda cláusula tem título, e nenhum outro tipo tem', () => {
    const semTitulo = blocos.filter((b) => b.tipo === 'clausula' && !b.tituloDocumento?.trim());
    const comTituloIndevido = blocos.filter((b) => b.tipo !== 'clausula' && b.tituloDocumento);
    expect(semTitulo).toEqual([]);
    expect(comTituloIndevido).toEqual([]);
  });
});

describe('os placeholders do Acordo', () => {
  const texto = (blocosDoAcordo as BlocoDoArquivo[]).map((b) => b.conteudo).join('\n');

  it('todo placeholder usado existe na entidade acordoQuotistas', () => {
    // Placeholder sem campo resolve '' e a frase sai truncada no Word, sem erro
    // em lugar nenhum. É a mesma rede do teste da governança.
    const usados = [...texto.matchAll(/\{\{#?\s*acordo\.([A-Za-z0-9_]+)/g)].map((m) => m[1]);
    const conhecidos = new Set(camposDaEntidade('acordoQuotistas').map((c) => c.id));
    expect(usados.length).toBeGreaterThan(0);
    expect([...new Set(usados)].filter((c) => !conhecidos.has(c))).toEqual([]);
  });

  it('o número que virou campo saiu do texto, e o que não varia ficou', () => {
    /*
     * A regra da parametrização: entra placeholder onde o valor VARIA entre os
     * acordos do acervo; onde não varia, o número fica escrito.
     */
    // Viraram campo:
    expect(texto).not.toContain('20 (vinte) anos');          // vigência
    expect(texto).not.toContain('R$1.000.000,00');           // multa
    expect(texto).not.toContain('Câmara de Comércio Brasil Canadá');
    expect(texto).not.toContain('o Sr. MARCELO');            // representante

    // NÃO viraram, porque não variam em contrato nenhum:
    expect(texto).toContain('60 (sessenta) dias');           // balanço da apuração
    expect(texto).toContain('03 (três), sendo um nomeado');  // número de árbitros
  });

  it('o "1% ao mês" só virou campo onde a base é o valor subscrito', () => {
    /*
     * Os dois blocos usam a mesma taxa, e NÃO são a mesma coisa: um incide sobre
     * o valor subscrito e o outro sobre o VALOR DAS QUOTAS na opção de compra.
     * Medido, o Perci escreve 1% num e 0,50% no outro. Trocar os dois pelo mesmo
     * campo produziria documento errado.
     */
    const comJuros = (blocosDoAcordo as BlocoDoArquivo[])
      .filter((b) => /1% \(um por cento\)|jurosValorSubscrito/.test(b.conteudo));
    expect(comJuros).toHaveLength(2);
    expect(comJuros.filter((b) => b.conteudo.includes('{{ acordo.jurosValorSubscrito }}')))
      .toHaveLength(1);
  });
});
