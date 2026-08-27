/**
 * Ensaio assistido do fluxo de ALTERAÇÃO CONTRATUAL na tela Gerar Documento da
 * área OSG.
 *
 * Não é teste de asserção: é uma demonstração que se dirige sozinha, devagar,
 * numa janela de verdade, gravando vídeo. Ele MEDE e NARRA: não corrige nada e
 * não roda SQL. As escritas que faz são as da própria UI (validar a versão,
 * registrar na junta, responder o assistente), e no fim ele desmarca os eventos
 * que marcou.
 *
 * O ROTEIRO MUDOU em 25/08/2026. Antes, "o que se aplica" era um passo do
 * assistente de geração, com as flags de escopo `pj`. Agora a alteração
 * contratual é um DOCUMENTO PRÓPRIO: o contrato é gerado, validado e registrado
 * na junta; da folha travada sai "Gerar alteração contratual", um modal que
 * pergunta que eventos aconteceram depois dele; as respostas ficam ancoradas no
 * documento registrado (`projeto_flag_valor.documento_base_id`, escopo
 * 'documento') e puxam para a folha a resolução de cada evento marcado.
 *
 * Como rodar (a partir da raiz do repositório):
 *
 *     node e2e/demos/ac-alteracao-contratual.mjs
 *
 * Variáveis de ambiente (todas com default):
 *   AC_URL        base do app            (default http://localhost:5199)
 *   AC_EMAIL      login da equipe        (default user001@exemplo.dev)
 *   AC_PASSWORD   senha                  (default devlocal123)
 *   AC_CLIENTE    trecho do nome do cliente   (default "Banana Quântica")
 *   AC_EMPRESA_1  empresa principal      (default "Pantanal Comércio")
 *   AC_EMPRESA_2  empresa de contraste   (default "Rondon")
 *   AC_HEADLESS=1 roda sem janela e sem as pausas de plateia (ensaio rápido)
 *   AC_OUT        pasta dos artefatos    (default <repo>/.playwright-mcp/ac-<timestamp>)
 *
 * Pré-requisitos e o que esperar em cada passo estão em
 * `docs/osg/ensaio-fluxo-alteracao-contratual.md`. Leia antes de rodar.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const BASE = process.env.AC_URL ?? 'http://localhost:5199';
const EMAIL = process.env.AC_EMAIL ?? 'user001@exemplo.dev';
const SENHA = process.env.AC_PASSWORD ?? 'devlocal123';
const CLIENTE = process.env.AC_CLIENTE ?? 'Banana Quântica';
// Pantanal é a principal porque tem quadro societário preenchido (42 sócios):
// as resoluções que percorrem {{#socios}} só entram no documento se a lista
// trouxer item, e numa empresa sem sócios elas seriam descartadas por falta de
// dado — o que é comportamento correto do motor, mas não demonstra nada.
// Rondon é a de contraste: PR sem integralização aprovada, portanto sem sócios.
const EMPRESA_1 = process.env.AC_EMPRESA_1 ?? 'Pantanal Comércio';
const EMPRESA_2 = process.env.AC_EMPRESA_2 ?? 'Rondon';
const SEM_JANELA = process.env.AC_HEADLESS === '1';

const ROTA = '/equipe/osg/work/gerar-documento';
const MODELO_TRECHOS = ['Contrato Social', 'Participações'];

/**
 * As seis resoluções, na ordem em que estão no modelo.
 * - `evento`: casa o rótulo do interruptor no modal;
 * - `rubrica`: o começo do bloco NA FOLHA, que é como se mede se a resolução
 *   entrou no documento;
 * - `nomeDoBloco`: o nome no catálogo, que é como o painel de conferência a
 *   nomeia quando o motor a descarta por falta de dado.
 */
const RESOLUCOES = [
  { chave: 'endereco', evento: /endere[çc]o da sede/i, rubrica: 'Altera-se o endereço da sede', nomeDoBloco: 'alteração do endereço da sede' },
  { chave: 'capital', evento: /aumento do capital/i, rubrica: 'Aumenta-se o capital social', nomeDoBloco: 'aumento do capital social' },
  { chave: 'cessao', evento: /cess[ãa]o de quotas/i, rubrica: 'Formaliza-se a cessão', nomeDoBloco: 'cessão de quotas' },
  { chave: 'integralizacao', evento: /integraliza[çc][ãa]o/i, rubrica: 'Integralizam-se as quotas', nomeDoBloco: 'integralização de capital' },
  { chave: 'administracao', evento: /administra[çc][ãa]o da sociedade/i, rubrica: 'Altera-se a administração', nomeDoBloco: 'mudança na administração' },
  { chave: 'socios', evento: /(entrada|retirada).*s[óo]cio/i, rubrica: 'Altera-se a composição do quadro societário', nomeDoBloco: 'entrada ou retirada de sócio' },
];

/**
 * Os dois eventos que o ensaio marca. `endereco` é o único cujo bloco não
 * percorre lista nenhuma: ele entra no documento mesmo com cadastro magro, e por
 * isso é o par de controle. `capital` percorre {{#socios}} e mostra a resolução
 * escrita do quadro societário.
 */
const MARCAR = ['endereco', 'capital'];

const carimbo = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT = process.env.AC_OUT ?? path.join(RAIZ, '.playwright-mcp', `ac-${carimbo}`);

// ─── Falha de pré-requisito ────────────────────────────────────────────────
// Erro com nome próprio para que o `catch` do fim saiba diferenciar "o
// ambiente não está de pé" de "um seletor mudou".
class PreRequisito extends Error {
  constructor(mensagem, comoResolver) {
    super(mensagem);
    this.name = 'PreRequisito';
    this.comoResolver = comoResolver;
  }
}
const exigir = (condicao, mensagem, comoResolver) => {
  if (!condicao) throw new PreRequisito(mensagem, comoResolver);
};

// ─── Registro e narração ───────────────────────────────────────────────────
fs.mkdirSync(path.join(OUT, 'video'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });

const registro = [];
const anota = (o) => {
  registro.push({ em: new Date().toISOString(), ...o });
  fs.writeFileSync(path.join(OUT, 'registro.json'), JSON.stringify(registro, null, 2));
};

const pausa = (ms) => new Promise((r) => setTimeout(r, SEM_JANELA ? Math.min(ms, 150) : ms));

const TOTAL = 10;
let passo = 0;

/** Cabeçalho de um passo: numera no terminal e escreve na tarja da tela. */
async function narrar(page, texto, ms = 2000) {
  passo += 1;
  console.log(`[${passo}/${TOTAL}] ${texto}`);
  await tarja(page, `[${passo}/${TOTAL}]  ${texto}`);
  await pausa(ms);
}

/** Linha de detalhe dentro do passo corrente. */
async function nota(page, texto, ms = 1500) {
  console.log(`      · ${texto}`);
  await tarja(page, texto);
  await pausa(ms);
}

/** Tarja flutuante injetada só no navegador — a tela conta a mesma história. */
async function tarja(page, texto) {
  try {
    await page.evaluate((t) => {
      let el = document.getElementById('__ensaio_tarja');
      if (!el) {
        el = document.createElement('div');
        el.id = '__ensaio_tarja';
        el.style.cssText =
          'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:2147483647;' +
          'background:rgba(18,88,55,.95);color:#fff;font:600 15px/1.35 system-ui,sans-serif;' +
          'padding:10px 20px;border-radius:999px;box-shadow:0 6px 24px rgba(0,0,0,.28);' +
          'pointer-events:none;max-width:80vw;text-align:center;';
        document.body.appendChild(el);
      }
      el.textContent = t;
    }, texto);
  } catch {
    /* página navegando: a tarja volta na próxima chamada */
  }
}

const foto = (page, nome) =>
  page.screenshot({ path: path.join(OUT, 'shots', `${nome}.png`) }).catch(() => null);

// ─── Leitura de estado ─────────────────────────────────────────────────────

/**
 * O estado do documento, lido do rail de ações à direita da folha. Os quatro
 * estados são excludentes na UI e é assim que o ensaio sabe onde parou uma
 * rodada anterior.
 */
const estadoDoDocumento = (page) =>
  page.evaluate(() => {
    const textoDe = (el) => (el?.innerText || el?.textContent || '').replace(/\s+/g, ' ').trim();
    const main = document.querySelector('main');
    const painel = textoDe(main);
    const botoes = [...document.querySelectorAll('button')].map(textoDe);
    return {
      temFolha: !!document.querySelector('main article'),
      registrado: /Registrado na junta/.test(painel),
      alteracaoEmCurso: botoes.some((b) => /^Rever os eventos$/.test(b)),
      podeValidar: botoes.some((b) => /^Validar versão$/.test(b)),
      podeRegistrar: botoes.some((b) => /^Registrar na junta$/.test(b)),
      podeGerarAlteracao: botoes.some((b) => /^Gerar alteração contratual$/.test(b)),
      versaoValidada: /Versão validada/.test(painel),
    };
  });

/** Quais resoluções estão NA FOLHA (o <article> branco), por rubrica. */
const resolucoesNaFolha = (page) =>
  page.evaluate((rubricas) => {
    const doc = document.querySelector('main article')?.innerText || '';
    return rubricas.filter((r) => doc.includes(r));
  }, RESOLUCOES.map((r) => r.rubrica));

/** Os interruptores do modal do assistente: rótulo + ligado/desligado. */
const lerEventos = (page) =>
  page.locator('[id^="evento-"]').evaluateAll((els) =>
    els.map((e) => ({
      id: e.id,
      rotulo: (e.closest('div')?.querySelector('label')?.textContent || '').trim(),
      estado: e.getAttribute('data-state') || e.getAttribute('aria-checked'),
    })),
  );

/**
 * As resoluções que entraram na composição e o motor DESCARTOU por não trazerem
 * dado (lista vazia, campo em branco). O painel as nomeia em "N blocos não
 * entraram", e distingui-las das que a flag nem deixou entrar é o que separa
 * "cadastro incompleto" de "a condição não ligou".
 */
const resolucoesDescartadas = (page) =>
  page.evaluate((rubricas) => {
    const painel = document.querySelector('main')?.innerText || '';
    return rubricas.filter((r) => painel.includes(`Resolução: ${r}`));
  }, RESOLUCOES.map((r) => r.nomeDoBloco));

/** A linha de "o que ficou de fora" no painel de conferência, se houver. */
const linhaDeExcluidos = (page) =>
  page.evaluate(() => {
    const painel = document.querySelector('main')?.innerText || '';
    const i = painel.search(/n[ãa]o se aplica/i);
    return i >= 0 ? painel.slice(i, i + 220).split('\n')[0] : null;
  });

// ─── Ações ─────────────────────────────────────────────────────────────────

async function entrar(page) {
  await page.goto(`${BASE}/equipe`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  const campoEmail = page.locator('#email');
  exigir(
    await campoEmail.count(),
    `A tela de login não apareceu em ${BASE}/equipe.`,
    'Confira se o app está de pé nessa porta e se a rota /equipe responde.',
  );

  await campoEmail.fill(EMAIL);
  await page.locator('#password').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForTimeout(3500);

  const aindaNoLogin = await page.locator('#password').count();
  exigir(
    !aindaNoLogin,
    `O login foi recusado para ${EMAIL}.`,
    'Confira AC_EMAIL/AC_PASSWORD e se a conta existe no banco que esta branch usa (sandbox fora da main).',
  );

  const botaoOsg = page.getByRole('button', { name: /^OSG/ }).first();
  exigir(
    await botaoOsg.count(),
    'A área OSG não aparece na lista de áreas desta conta.',
    'Use uma conta com acesso a OSG, ou libere a área para esta em user_roles.',
  );
  await botaoOsg.click();
  await page.waitForTimeout(4000);
}

async function escolherCliente(page) {
  const cb = page.getByRole('combobox').first();
  exigir(
    await cb.count(),
    'A barra "Cliente" não apareceu na tela Gerar Documento.',
    `Confira se ${BASE}${ROTA} carrega e se o OsgLayout renderizou.`,
  );
  if ((await cb.innerText().catch(() => '')).includes(CLIENTE)) return;

  await cb.click();
  await pausa(1000);
  const opcao = page.getByRole('option', { name: new RegExp(CLIENTE) }).first();
  exigir(
    await opcao.count(),
    `Não achei o cliente "${CLIENTE}" na lista.`,
    'Ajuste AC_CLIENTE para o nome como está GRAVADO no banco (pode estar achatado).',
  );
  await opcao.click();
  await page.waitForTimeout(2500);
}

async function escolherModelo(page) {
  let card = page.locator('button[aria-pressed]');
  for (const t of MODELO_TRECHOS) card = card.filter({ hasText: t });
  exigir(
    await card.count(),
    `Não achei o modelo (cards contendo ${MODELO_TRECHOS.map((t) => `"${t}"`).join(' e ')}).`,
    'Confira na Biblioteca de Modelos se o modelo está ativo e tem blocos.',
  );
  await card.first().click();
  await page.waitForTimeout(2800);
}

async function escolherEmpresa(page, nome) {
  const card = page.locator('button[aria-pressed]').filter({ hasText: nome }).first();
  exigir(
    await card.count(),
    `Não achei a empresa "${nome}" entre as PJ do cliente.`,
    'Cadastre-a em Qualificação das Partes ou ajuste AC_EMPRESA_1 / AC_EMPRESA_2.',
  );
  await card.click();
  await page.waitForTimeout(2500);
}

/** Cliente → modelo → empresa, do zero. O contexto da tela não persiste entre navegações. */
async function refazerSelecao(page, empresa) {
  await page.goto(`${BASE}${ROTA}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  await escolherCliente(page);
  await escolherModelo(page);
  await escolherEmpresa(page, empresa);
  await page.waitForTimeout(3000);
}

/** Clica um botão do rail e confirma o AlertDialog que ele abre. */
async function acaoDoRail(page, nomeBotao, nomeConfirmacao, esperaMs = 8000) {
  await page.getByRole('button', { name: nomeBotao, exact: true }).first().click();
  await pausa(1200);
  const confirmar = page.getByRole('button', { name: nomeConfirmacao, exact: true }).last();
  exigir(
    await confirmar.count(),
    `A confirmação "${nomeConfirmacao}" não apareceu depois de clicar em "${nomeBotao}".`,
    'A UI mudou os rótulos dos AlertDialogs de GerarDocumentoDialogs.tsx.',
  );
  await confirmar.click();
  await page.waitForTimeout(esperaMs);
}

/** Abre o assistente pelo caminho que a tela oferecer (primeira vez ou revisão). */
async function abrirAssistente(page) {
  const estado = await estadoDoDocumento(page);
  const nome = estado.alteracaoEmCurso ? 'Rever os eventos' : 'Gerar alteração contratual';
  const botao = page.getByRole('button', { name: nome, exact: true }).first();
  exigir(
    await botao.count(),
    `Nem "Gerar alteração contratual" nem "Rever os eventos" apareceram no rail.`,
    'O documento precisa estar REGISTRADO na junta, e o modelo precisa ter blocos ' +
      'pendurados nas flags evento_* (ver a migration 20260825194340).',
  );
  await botao.click();
  await pausa(1500);
  const eventos = await lerEventos(page);
  exigir(
    eventos.length > 0,
    'O assistente abriu sem nenhum interruptor de evento.',
    'Confira em tmpl_bloco_flag se os blocos de resolução estão vinculados às flags evento_*, ' +
      'e se o modelo do documento contém esses blocos.',
  );
  return eventos;
}

/** Põe cada interruptor no estado pedido e conclui os dois passos do modal. */
async function responderAssistente(page, chavesLigadas) {
  const eventos = await lerEventos(page);
  for (const r of RESOLUCOES) {
    const alvo = eventos.find((e) => r.evento.test(e.rotulo));
    if (!alvo) continue;
    const querLigado = chavesLigadas.includes(r.chave);
    if ((alvo.estado === 'checked') !== querLigado) {
      await page.locator(`[id="${alvo.id}"]`).click();
      await pausa(500);
    }
  }
  const depois = await lerEventos(page);
  await page.getByRole('button', { name: 'Continuar', exact: true }).first().click();
  await pausa(1800);
  await page.getByRole('button', { name: 'Gerar alteração contratual', exact: true }).last().click();
  await page.waitForTimeout(7000);
  return depois;
}

/** Traz um trecho para o centro da tela, para a câmera pegar. */
const rolarAte = (page, padrao, dentroDaFolha) =>
  page.evaluate(
    ([p, naFolha]) => {
      const re = new RegExp(p, 'i');
      const raiz = naFolha ? document.querySelector('main article') : document.querySelector('main');
      const alvo = [...(raiz?.querySelectorAll('*') ?? [])].find(
        (e) => e.children.length === 0 && re.test(e.textContent || ''),
      );
      alvo?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    },
    [padrao, dentroDaFolha],
  );

// ─── Ensaio ────────────────────────────────────────────────────────────────

async function ensaio(page) {
  // ── 1. Login ─────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/equipe`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await narrar(page, 'Entrando na área da equipe', 1800);
  await entrar(page);
  anota({ passo: 1, o_que: 'login', url: page.url() });

  // ── 2. Cliente e modelo ──────────────────────────────────────────────────
  await page.goto(`${BASE}${ROTA}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await narrar(page, 'Gerar Documento: escolhendo o cliente e o modelo', 2000);
  await escolherCliente(page);
  await escolherModelo(page);
  await foto(page, '02-modelo-escolhido');
  anota({ passo: 2, o_que: 'cliente + modelo', cliente: CLIENTE });

  // ── 3. Não há mais passo de condições no fluxo de geração ────────────────
  // A pergunta saiu do assistente de geração de propósito: perguntar que evento
  // societário aconteceu antes de existir contrato registrado é perguntar sobre
  // um documento que ainda não valeu.
  await narrar(page, 'O fluxo de geração NÃO pergunta mais "o que se aplica"', 1200);
  const aindaTemPasso = await page
    .locator('h2', { hasText: 'Marque o que se aplica' })
    .count();
  console.log(`      passo "Marque o que se aplica" na tela: ${aindaTemPasso > 0 ? 'SIM' : 'não'}`);
  anota({ passo: 3, o_que: 'passo de condições removido do fluxo', presente: aindaTemPasso > 0 });
  await foto(page, '03-sem-passo-de-condicoes');
  await pausa(3500);

  // ── 4. Empresa e folha ───────────────────────────────────────────────────
  await narrar(page, `Escolhendo a empresa ${EMPRESA_1} — a folha assume a tela`, 1500);
  await escolherEmpresa(page, EMPRESA_1);
  await page.waitForTimeout(4000);
  let estado = await estadoDoDocumento(page);
  console.log('      estado do documento:', JSON.stringify(estado));
  exigir(
    estado.temFolha,
    'A folha do documento não apareceu depois de escolher a empresa.',
    'Veja a última foto: pode ser erro de composição (placeholder não resolvido) no modelo.',
  );
  const excluidos = await linhaDeExcluidos(page);
  console.log('      painel de conferência:', excluidos ?? '(nada excluído por perfil)');
  anota({ passo: 4, o_que: 'folha na tela', empresa: EMPRESA_1, estado, excluidos });
  await foto(page, '04-folha');
  await pausa(3000);

  // ── 5. Validar e registrar na junta ──────────────────────────────────────
  // O assistente de alteração só existe diante de uma peça travada. Estes dois
  // passos são idempotentes: numa segunda rodada o documento já está registrado
  // e o ensaio só narra.
  await narrar(page, 'Validando a versão e registrando a peça na junta', 1500);
  if (estado.podeValidar && !estado.versaoValidada && !estado.alteracaoEmCurso) {
    await nota(page, 'Validar versão: congela os valores e cria o documento', 1200);
    await acaoDoRail(page, 'Validar versão', 'Validar versão');
    estado = await estadoDoDocumento(page);
    console.log('      depois de validar:', JSON.stringify(estado));
  }
  if (estado.podeRegistrar) {
    await nota(page, 'Registrar na junta: a peça trava e deixa de aceitar edição', 1200);
    await acaoDoRail(page, 'Registrar na junta', 'Registrar na junta');
    estado = await estadoDoDocumento(page);
    console.log('      depois de registrar:', JSON.stringify(estado));
  }
  exigir(
    estado.registrado || estado.alteracaoEmCurso,
    'O documento não chegou ao estado "Registrado na junta".',
    'Leia o toast de erro na última foto: é a mensagem literal do servidor.',
  );
  anota({ passo: 5, o_que: 'documento registrado', estado });
  await foto(page, '05-registrado');
  await pausa(4000);

  // ── 6. O assistente, em modal, sobre a folha travada ─────────────────────
  await narrar(page, 'Abrindo o assistente de alteração contratual', 1500);
  const eventos = await abrirAssistente(page);
  console.log(`      ${eventos.length} eventos no assistente:`);
  eventos.forEach((e) => console.log(`        - [${e.estado}] ${e.rotulo}`));
  anota({ passo: 6, o_que: 'assistente aberto', eventos });
  await foto(page, '06-assistente');
  await pausa(4000);

  // ── 7. Marcar dois eventos e gerar ───────────────────────────────────────
  const rotulosMarcados = RESOLUCOES.filter((r) => MARCAR.includes(r.chave)).map((r) => r.rubrica);
  await narrar(page, `Marcando dois eventos: ${rotulosMarcados.join(' · ')}`, 1500);
  const respostas = await responderAssistente(page, MARCAR);
  respostas.forEach((e) => console.log(`        - [${e.estado}] ${e.rotulo}`));
  await page.waitForTimeout(4000);
  const folhaDepois = await resolucoesNaFolha(page);
  const descartadas = await resolucoesDescartadas(page);
  const estadoDepois = await estadoDoDocumento(page);
  console.log('      resoluções na folha:', JSON.stringify(folhaDepois));
  console.log('      resoluções descartadas por falta de dado:', JSON.stringify(descartadas));
  console.log('      estado do documento:', JSON.stringify(estadoDepois));
  anota({
    passo: 7,
    o_que: 'dois eventos marcados',
    respostas,
    esperado_na_folha: rotulosMarcados,
    na_folha: folhaDepois,
    descartadas_por_falta_de_dado: descartadas,
    estado: estadoDepois,
  });
  await rolarAte(page, rotulosMarcados[0], true);
  // Composta e depois descartada por lista vazia é comportamento CORRETO do
  // motor (o painel a nomeia em "N blocos não entraram"): a flag ligou, o
  // cadastro é que não tem o dado. O que seria defeito é a resolução não
  // aparecer em lugar nenhum, nem na folha nem entre as descartadas.
  const cobertas = folhaDepois.length + descartadas.length;
  await nota(
    page,
    cobertas === rotulosMarcados.length
      ? `${folhaDepois.length} resolução(ões) na folha e ${descartadas.length} descartada(s) por cadastro sem dado`
      : `ATENÇÃO: dos ${rotulosMarcados.length} eventos marcados, ${cobertas} aparecem (folha ou descarte)`,
    1800,
  );
  await foto(page, '07-resolucoes-na-folha');
  await pausa(5000);

  // ── 8. Persistência: recarregar e refazer a seleção ──────────────────────
  // Nem cliente nem modelo nem empresa persistem entre navegações (OsgWorkContext
  // é useState puro) — isso é por desenho. O que PRECISA persistir são as
  // respostas, que estão no banco ancoradas no documento registrado.
  await narrar(page, 'Recarregando: as respostas vêm do banco e persistem', 1800);
  await refazerSelecao(page, EMPRESA_1);
  const folhaApos = await resolucoesNaFolha(page);
  const estadoApos = await estadoDoDocumento(page);
  console.log('      resoluções na folha depois do reload:', JSON.stringify(folhaApos));
  console.log('      estado do documento:', JSON.stringify(estadoApos));
  anota({ passo: 8, o_que: 'persistência após recarregar', na_folha: folhaApos, estado: estadoApos });
  await nota(
    page,
    folhaApos.length === rotulosMarcados.length
      ? 'As resoluções continuam na folha depois do reload'
      : `ATENÇÃO: depois do reload sobraram ${folhaApos.length} resoluções`,
    1800,
  );
  await foto(page, '08-persistiu-apos-reload');
  await pausa(4000);

  // ── 9. Isolamento: a outra empresa não tem alteração em curso ────────────
  await narrar(page, `Refazendo a seleção com ${EMPRESA_2}: outra empresa, outro documento`, 1800);
  await refazerSelecao(page, EMPRESA_2);
  const folhaB = await resolucoesNaFolha(page);
  const estadoB = await estadoDoDocumento(page);
  console.log(`      resoluções na folha de ${EMPRESA_2}:`, JSON.stringify(folhaB));
  console.log('      estado do documento:', JSON.stringify(estadoB));
  anota({ passo: 9, o_que: `isolamento em ${EMPRESA_2}`, na_folha: folhaB, estado: estadoB, marcadas_na_outra: rotulosMarcados });
  // O que se mede aqui é VAZAMENTO, não a ausência de alteração: a segunda
  // empresa pode ter uma alteração própria em curso (linhas ancoradas no
  // documento dela). O defeito seria a folha dela trazer as resoluções que foram
  // marcadas na primeira.
  const vazaram = folhaB.filter((r) => rotulosMarcados.includes(r));
  await nota(
    page,
    vazaram.length === 0
      ? `Nenhuma resolução de ${EMPRESA_1} apareceu na folha de ${EMPRESA_2}`
      : `ATENÇÃO: ${vazaram.length} resolução(ões) vazaram para ${EMPRESA_2}: ${vazaram.join(', ')}`,
    1800,
  );
  await foto(page, '09-outra-empresa');
  await pausa(4500);

  // ── 10. Fecho: desmarcar o que foi marcado ───────────────────────────────
  // Não é limpeza completa, e o ensaio diz isso em voz alta: a UI não apaga
  // linha (a RLS de DELETE é só de admin), então as respostas ficam gravadas
  // como `false` e o documento registrado continua registrado. É `false` que o
  // motor lê, e é por isso que desmarcar basta para a folha voltar ao estado
  // anterior — mas a alteração continua "em curso" para a tela.
  await narrar(page, 'Fecho: desmarcando os eventos que liguei', 1500);
  await refazerSelecao(page, EMPRESA_1);
  await abrirAssistente(page);
  const zerados = await responderAssistente(page, []);
  await page.waitForTimeout(4000);
  const folhaFinal = await resolucoesNaFolha(page);
  const estadoFinal = await estadoDoDocumento(page);
  zerados.forEach((e) => console.log(`        - [${e.estado}] ${e.rotulo}`));
  console.log('      resoluções na folha:', JSON.stringify(folhaFinal));
  anota({
    passo: 10,
    o_que: 'fecho',
    eventos: zerados,
    na_folha: folhaFinal,
    estado: estadoFinal,
    resta_no_banco:
      'linhas de projeto_flag_valor com valor=false ancoradas no documento registrado, ' +
      'e o próprio documento com status=registrado. A UI não tem caminho para apagar nenhum dos dois.',
  });
  await nota(
    page,
    folhaFinal.length === 0
      ? 'Nenhuma resolução na folha: estado devolvido'
      : `ATENÇÃO: ${folhaFinal.length} resoluções continuam na folha`,
    1800,
  );
  await foto(page, '10-fecho');
  await pausa(3000);
}

// ─── Orquestração ──────────────────────────────────────────────────────────

const main = async () => {
  // Pré-requisito mais barato de checar, e o que mais falha: o app no ar.
  try {
    const r = await fetch(BASE, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
  } catch (e) {
    console.error(`\n✗ PRÉ-REQUISITO: o app não respondeu em ${BASE} (${e.message}).`);
    console.error(
      '  Suba o dev server na branch alteracao-contratual-caminho-b e confira a porta,\n' +
        '  ou aponte AC_URL para onde ele estiver. Ver docs/osg/ensaio-fluxo-alteracao-contratual.md.\n',
    );
    process.exitCode = 1;
    return;
  }

  console.log(`Ensaio: alteração contratual — ${BASE}${ROTA}`);
  console.log(`Artefatos: ${OUT}\n`);

  const browser = await chromium.launch({
    headless: SEM_JANELA,
    slowMo: SEM_JANELA ? 0 : 700,
    args: ['--window-size=1600,1000', '--window-position=0,0'],
  });
  const ctx = await browser.newContext({
    viewport: null,
    recordVideo: { dir: path.join(OUT, 'video'), size: { width: 1600, height: 1000 } },
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);

  let falhou = false;
  try {
    await ensaio(page);
  } catch (e) {
    falhou = true;
    if (e instanceof PreRequisito) {
      console.error(`\n✗ PRÉ-REQUISITO: ${e.message}`);
      console.error(`  ${e.comoResolver}\n`);
      anota({ falha: 'pre-requisito', mensagem: e.message, como_resolver: e.comoResolver });
    } else {
      console.error(`\n✗ ERRO INESPERADO: ${e.message}`);
      console.error('  Provavelmente um seletor mudou. Veja o vídeo e a última foto.\n');
      anota({ falha: 'inesperada', mensagem: e.message, stack: String(e.stack).split('\n').slice(0, 5) });
    }
    await foto(page, 'zz-falha');
  } finally {
    const bruto = await page.video()?.path().catch(() => null);
    await ctx.close();
    await browser.close();
    let video = null;
    if (bruto && fs.existsSync(bruto)) {
      video = path.join(OUT, 'ensaio-alteracao-contratual.webm');
      fs.renameSync(bruto, video);
    }
    console.log('\n─────────────────────────────────────────────');
    console.log('VÍDEO:    ', video ?? '(não gerado)');
    console.log('FOTOS:    ', path.join(OUT, 'shots'));
    console.log('REGISTRO: ', path.join(OUT, 'registro.json'));
    console.log('─────────────────────────────────────────────');
    if (falhou) process.exitCode = 1;
  }
};

main();
