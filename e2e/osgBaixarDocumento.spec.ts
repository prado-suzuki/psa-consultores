import { readFileSync } from 'node:fs';
import JSZip from 'jszip';
import { test, expect, type Page } from '@playwright/test';

/**
 * Download de contrato na tela Gerar Documento (OSG).
 *
 * POR QUE OLHAR O ARQUIVO, E NÃO A TELA. A folha central é HTML montado pelo
 * engine (`src/lib/templates`); o .docx sai de OUTRO adapter
 * (`src/lib/templates/docx.ts`), que reescreve o mesmo conteúdo em parágrafos e
 * runs e é carregado sob demanda (`await import('docx')`). Conferir só a folha
 * não diz nada sobre o arquivo que a pessoa recebe. Aqui o teste abre o .docx
 * baixado, lê o `word/document.xml` e cobra que o texto de dentro seja o mesmo
 * que está na folha.
 *
 * O download é 100% do navegador: `Packer.toBlob` + `<a download>`, sem rede
 * (ver `baixarDocx`). Por isso o teste também cobra que baixar NÃO escreve no
 * banco — qualquer POST/PATCH/DELETE em /rest/v1 durante o clique é regressão.
 *
 * DADOS, E POR QUE NÃO SÃO OS DO ENSAIO DA AC. O default é uma PJ com quadro
 * societário e NENHUM `documento_gerado`: a folha então compõe do cadastro
 * vivo, que é o caminho mais curto até um arquivo, e o estado dela não muda de
 * uma rodada para a outra. A empresa do ensaio da alteração contratual (Banana
 * Quântica / Pantanal) é justamente o contrário: o ensaio valida versão e
 * registra peça a cada corrida, então o que se mediria ali seria o documento de
 * ontem. Foi apontando para lá, aliás, que este teste achou o defeito de
 * `sociedade.tituloColetivoSocios` (snapshot de 25/08/2026, campo nascido no dia
 * seguinte), hoje corrigido em `estadoProposto.ts`.
 *
 * O cliente só aparece na lista se for do ambiente `dev` (`currentAmbiente`
 * filtra as queries), então não adianta escolher pelo que existe na tabela.
 *
 *   OSG_CLIENTE   trecho do nome do cliente   (default "Agro Aliança")
 *   OSG_EMPRESA   PJ do cliente               (default "ALIANÇA PARTICIPAÇÕES")
 *   OSG_MODELO    trechos do card do modelo, separados por "|"
 *                                             (default "Contrato Social|Participações")
 */

const ROTA = '/equipe/osg/work/gerar-documento';
const CLIENTE = process.env.OSG_CLIENTE ?? 'Agro Aliança';
const EMPRESA = process.env.OSG_EMPRESA ?? 'ALIANÇA PARTICIPAÇÕES';
const MODELO_TRECHOS = (process.env.OSG_MODELO ?? 'Contrato Social|Participações').split('|');

/** Um documento grande leva tempo para compor: 45s do config não bastam. */
test.describe.configure({ timeout: 180_000 });

// ─── Texto comparável ──────────────────────────────────────────────────────

/**
 * Reduz um texto ao que ele DIZ: sem acento, sem espaço, sem pontuação, caixa
 * alta. O .docx quebra uma frase em vários `<w:t>` sempre que muda o estilo
 * (negrito no rótulo, sublinhado no valor), então comparar texto cru compararia
 * a formatação junto. Sem os separadores, a quebra em runs deixa de existir.
 */
const normaliza = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase();

/** O texto do .docx, na ordem, a partir dos nós `<w:t>`. */
function textoDoDocx(xml: string): string {
  const pedacos = xml.match(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g) ?? [];
  return pedacos
    .map((n) => n.replace(/<[^>]+>/g, ''))
    .join('')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * O parágrafo mais longo da folha. É dele que sai o trecho usado para casar a
 * folha com o arquivo: parágrafo longo é prosa preenchida (preâmbulo,
 * qualificação), enquanto os curtos são títulos e campos que podem estar
 * pendentes e aparecer de forma diferente nos dois lados.
 */
const paragrafoMaisLongo = (texto: string): string =>
  texto
    .split('\n')
    .map((l) => l.trim())
    .reduce((maior, l) => (l.length > maior.length ? l : maior), '');

// ─── Passos da tela ────────────────────────────────────────────────────────

/**
 * Cliente → modelo → empresa. A tela não guarda esse contexto entre
 * navegações, então toda rodada refaz os três.
 */
async function abrirDocumento(page: Page): Promise<void> {
  await page.goto(ROTA, { waitUntil: 'domcontentloaded' });

  const cliente = page.getByRole('combobox').first();
  await expect(cliente, `a barra "Cliente" não apareceu em ${ROTA}`).toBeVisible({
    timeout: 30_000,
  });
  if (!(await cliente.innerText()).includes(CLIENTE)) {
    await cliente.click();
    const opcao = page.getByRole('option', { name: new RegExp(CLIENTE) }).first();
    await expect(
      opcao,
      `cliente "${CLIENTE}" não está na lista — ajuste OSG_CLIENTE para o nome como está GRAVADO`,
    ).toBeVisible({ timeout: 15_000 });
    await opcao.click();
  }

  let modelo = page.locator('button[aria-pressed]');
  for (const trecho of MODELO_TRECHOS) modelo = modelo.filter({ hasText: trecho });
  await expect(
    modelo.first(),
    `nenhum card de modelo com ${MODELO_TRECHOS.map((t) => `"${t}"`).join(' e ')} — ajuste OSG_MODELO`,
  ).toBeVisible({ timeout: 30_000 });
  await modelo.first().click();

  const empresa = page.locator('button[aria-pressed]').filter({ hasText: EMPRESA }).first();
  await expect(empresa, `empresa "${EMPRESA}" não está entre as PJ do cliente`).toBeVisible({
    timeout: 30_000,
  });
  await empresa.click();

  // A folha ou a recusa: quando o engine não resolve um placeholder, a tela
  // troca o documento por "Algo impediu a geração do documento." e o botão de
  // baixar nasce desabilitado. Esperar só pelo <article> daria 60s de timeout
  // para dizer "não achei elemento", escondendo a mensagem que explica tudo.
  const folha = page.locator('main article');
  const recusa = page.getByText('Algo impediu a geração do documento.');
  await expect(folha.or(recusa).first(), 'a tela não chegou nem a folha nem a erro').toBeVisible({
    timeout: 60_000,
  });
  if (await recusa.isVisible()) {
    const motivo = await page.locator('main code').first().innerText().catch(() => '(sem detalhe)');
    throw new Error(`o documento não compôs — não há o que baixar. O engine disse: ${motivo}`);
  }
}

/** POST/PATCH/DELETE no PostgREST, acumulados a partir da chamada. */
function gravarEscritas(page: Page): string[] {
  const escritas: string[] = [];
  page.on('request', (req) => {
    const metodo = req.method();
    if (metodo === 'GET' || metodo === 'HEAD') return;
    if (!req.url().includes('/rest/v1/')) return;
    escritas.push(`${metodo} ${req.url().split('/rest/v1/')[1]}`);
  });
  return escritas;
}

/**
 * Clica um "Baixar .docx" e devolve o arquivo salvo. Documento com pendência
 * abre o AlertDialog de rascunho antes de baixar, e o caminho legítimo ali é
 * seguir como rascunho — o próprio produto carimba o aviso no arquivo.
 */
async function baixar(
  page: Page,
  botao: ReturnType<Page['getByRole']>,
  destino: string,
): Promise<{ arquivo: string; nome: string; rascunho: boolean }> {
  await expect(botao, 'o botão "Baixar .docx" não ficou habilitado').toBeEnabled({
    timeout: 90_000,
  });

  const chegando = page.waitForEvent('download', { timeout: 120_000 });
  await botao.click();

  const dialogo = page.getByRole('alertdialog').filter({ hasText: 'Baixar documento incompleto?' });
  const rascunho = await dialogo
    .waitFor({ state: 'visible', timeout: 3_000 })
    .then(() => true)
    .catch(() => false);
  if (rascunho) {
    await page.getByRole('button', { name: 'Baixar como rascunho', exact: true }).click();
  }

  const download = await chegando;
  const nome = download.suggestedFilename();
  const arquivo = `${destino}/${nome}`;
  await download.saveAs(arquivo);
  return { arquivo, nome, rascunho };
}

/** Abre o .docx salvo e cobra que ele seja um .docx de verdade. */
async function lerDocx(arquivo: string): Promise<string> {
  const bytes = readFileSync(arquivo);
  expect(bytes.byteLength, 'arquivo vazio').toBeGreaterThan(1_000);
  // Todo .docx é um zip: os dois primeiros bytes são a assinatura local do zip.
  expect(bytes.subarray(0, 2).toString('latin1'), 'não começa com assinatura de zip').toBe('PK');

  const zip = await JSZip.loadAsync(bytes);
  const documento = zip.file('word/document.xml');
  expect(documento, 'o zip não tem word/document.xml — não é um .docx válido').not.toBeNull();
  return textoDoDocx(await documento!.async('string'));
}

// ─── Testes ────────────────────────────────────────────────────────────────

test('Baixar .docx entrega o contrato que está na folha', async ({ page }, testInfo) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));

  await abrirDocumento(page);

  const folha = await page.locator('main article').innerText();
  expect(folha.length, 'a folha compôs vazia — sem documento para baixar').toBeGreaterThan(200);

  const escritas = gravarEscritas(page);
  const { arquivo, nome, rascunho } = await baixar(
    page,
    page.getByRole('button', { name: 'Baixar .docx', exact: true }).first(),
    testInfo.outputPath(),
  );

  expect(nome, 'o arquivo baixado não é .docx').toMatch(/\.docx$/);
  const texto = await lerDocx(arquivo);

  // A folha e o arquivo dizem a mesma coisa: um trecho de prosa da folha tem
  // de aparecer dentro do documento.
  const trecho = normaliza(paragrafoMaisLongo(folha)).slice(0, 80);
  expect(trecho.length, 'a folha não tem parágrafo longo o bastante para comparar').toBeGreaterThan(
    40,
  );
  expect(
    normaliza(texto).includes(trecho),
    `o texto do .docx não contém o parágrafo da folha.\nfolha: ${trecho}\narquivo: ${normaliza(texto).slice(0, 400)}`,
  ).toBe(true);

  // Documento incompleto sai carimbado; completo sai limpo. Os dois são
  // resultado correto — o que não pode é o carimbo não bater com o caminho.
  expect(normaliza(texto).includes('RASCUNHODOCUMENTOINCOMPLETO')).toBe(rascunho);
  expect(nome.includes('rascunho')).toBe(rascunho);

  expect(escritas, `baixar não pode escrever no banco:\n${escritas.join('\n')}`).toEqual([]);
  expect(erros, erros.join('\n')).toEqual([]);

  testInfo.annotations.push({ type: 'arquivo', description: `${nome} (${rascunho ? 'rascunho' : 'completo'})` });
});

test('Baixar .docx de uma versão anterior entrega aquela versão', async ({ page }, testInfo) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));

  await abrirDocumento(page);

  const historico = page.getByRole('button').filter({ hasText: 'Histórico de versões' }).first();
  test.skip(
    !(await historico.isVisible().catch(() => false)),
    'este documento não tem histórico de versões (nada foi validado ainda)',
  );
  await historico.click();

  // A head é a "versão atual" e abre a folha viva; só as seladas abrem em
  // leitura, que é o caminho que oferece o download da versão.
  const anteriores = page
    .locator('button[aria-pressed]')
    .filter({ hasText: /^Versão \d+/ })
    .filter({ hasNotText: 'atual' });
  test.skip((await anteriores.count()) === 0, 'só existe a versão atual — nada selado para baixar');
  await anteriores.first().click();

  const banner = page.getByText(/Visualizando a versão \d+/);
  await expect(banner, 'a folha não entrou em modo leitura').toBeVisible({ timeout: 30_000 });
  const numero = (await banner.innerText()).match(/versão (\d+)/i)?.[1] ?? '';

  const escritas = gravarEscritas(page);
  const { arquivo, nome } = await baixar(
    page,
    page.getByRole('button', { name: 'Baixar .docx', exact: true }).last(),
    testInfo.outputPath(),
  );

  expect(nome, `o arquivo não identifica a versão ${numero}`).toMatch(
    new RegExp(`vers[aã]o_?${numero}`, 'i'),
  );
  const texto = await lerDocx(arquivo);
  expect(normaliza(texto).length, 'versão baixada veio sem texto').toBeGreaterThan(200);

  expect(escritas, `baixar não pode escrever no banco:\n${escritas.join('\n')}`).toEqual([]);
  expect(erros, erros.join('\n')).toEqual([]);

  testInfo.annotations.push({ type: 'arquivo', description: nome });
});
