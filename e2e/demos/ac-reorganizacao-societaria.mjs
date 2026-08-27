/**
 * Ensaio assistido da REORGANIZAÇÃO SOCIETÁRIA: o ledger de quotas e o PAR de
 * alterações contratuais derivadas dele.
 *
 * Não é teste de asserção: é uma demonstração que se dirige sozinha, devagar,
 * numa janela de verdade, gravando vídeo. Ela MEDE e NARRA: não corrige código
 * de aplicação e não roda SQL. As únicas escritas que faz são as da própria UI.
 *
 * O que ela existe para provar, em uma frase: o evento da alteração contratual
 * deixou de ser pergunta e virou derivação. O quadro societário é o acumulado de
 * um livro de movimentos, a subida das quotas para a controladora é um gesto só
 * com a aritmética conferida nas duas empresas, e a peça que formaliza os
 * movimentos os carimba AO SER REGISTRADA NA JUNTA, de modo que a alteração
 * seguinte começa do zero em vez de recontar a mesma história.
 *
 * O carimbo mudou de gesto em 27/08/2026 (decisão D4 de
 * docs/planos/derivacao-de-eventos-e-carimbo.md): era o "Validar versão", virou o
 * "Registrar na junta", que é quando o ato produz efeito e é o único gesto
 * irreversível de propósito. No mesmo gesto os bens daqueles movimentos passam a
 * 'Integralizado' e saem da lista de elegíveis. Daí o passo 11: validar (passos 8
 * a 10) e registrar (passo 11) são medidas separadas, porque provam coisas
 * diferentes.
 *
 * A ORDEM É A DO CASO MMS, e isso não é decoração. O `capitalAnterior` da
 * resolução de aumento não sai do livro de movimentos: sai do snapshot do
 * documento que a peça substitui (`calcularHistoricoCapital`, em
 * `src/lib/templates/historicoCapital.ts`). Contrato social registrado DEPOIS do
 * macro já traz no snapshot o capital de depois da subida, e o delta sai zero.
 * Então a sequência é: gravar o quadro de constituição, registrar os DOIS
 * contratos sociais, rodar o macro, e só então gerar as duas alterações. A
 * primeira versão deste ensaio invertia isso, e a inversão degradava justamente
 * a cláusula que o plano existe para produzir.
 *
 * E é um PAR de instrumentos, não uma peça: dois documentos registrados no mesmo
 * dia, cada um citando o outro. O lado da controladora tem duas coisas que o
 * lado da proprietária não tem como mostrar, e são elas que fecham o ensaio: o
 * aumento de capital dela (o capital de constituição mais o que subiu) e a
 * alínea de integralização paga com QUOTAS DE OUTRA SOCIEDADE, com a
 * proprietária qualificada por inteiro.
 *
 * Irmã de `ac-alteracao-contratual.mjs`, de 25/08/2026, de quem herda o andaime
 * (tarja, pausas de plateia, registro JSON, leitores de estado). As duas divergem
 * no roteiro de propósito: aquela demonstra o assistente na tela Gerar, esta
 * demonstra de onde vêm as respostas dele.
 *
 * Como rodar (a partir da raiz do repositório):
 *
 *     node e2e/demos/ac-reorganizacao-societaria.mjs
 *
 * Variáveis de ambiente (todas com default):
 *   AC_URL           base do app                  (default http://localhost:8080)
 *   AC_EMAIL         login da equipe              (default user001@exemplo.dev)
 *   AC_PASSWORD      senha                        (default devlocal123)
 *   AC_CLIENTE       trecho do nome do cliente    (default "Dinossauro Aposentado")
 *   AC_PROPRIETARIA  a PR de onde as quotas saem  (default "Farroupilha")
 *   AC_CONTROLADORA  a CN que as recebe           (default "Jatobá")
 *   AC_MODELO_PR     trecho do modelo da PR       (default "Agro")
 *   AC_MODELO_CN     trecho do modelo da CN       (default "Participações")
 *   AC_DATA_ATO      data do ato da subida        (default 2023-12-28)
 *   AC_ATE_PASSO     para o roteiro neste passo   (default 10, o roteiro inteiro)
 *   AC_HEADLESS=1    roda sem janela e sem as pausas de plateia (ensaio rápido)
 *   AC_OUT           pasta dos artefatos          (default <repo>/.playwright-mcp/reorg-<timestamp>)
 *
 * Pré-requisitos, o que esperar em cada passo e o que fica no banco depois estão
 * em `docs/osg/ensaio-reorganizacao-societaria.md`. Leia antes de rodar.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const BASE = process.env.AC_URL ?? 'http://localhost:8080';
const EMAIL = process.env.AC_EMAIL ?? 'user001@exemplo.dev';
const SENHA = process.env.AC_PASSWORD ?? 'devlocal123';
const CLIENTE = process.env.AC_CLIENTE ?? 'Dinossauro Aposentado';
const PROPRIETARIA = process.env.AC_PROPRIETARIA ?? 'Farroupilha';
const CONTROLADORA = process.env.AC_CONTROLADORA ?? 'Jatobá';
// A data do caso MMS, para o vídeo casar com os quatro instrumentos reais que
// deram origem ao plano. Só o rótulo do ato depende dela.
const DATA_DO_ATO = process.env.AC_DATA_ATO ?? '2023-12-28';
const SEM_JANELA = process.env.AC_HEADLESS === '1';
// Onde parar. Os pontos que importam: até 3 nada de irreversível foi escrito
// (só o quadro de constituição, que a migration de seed devolve); até 10 o ato da
// subida ainda aceita "Desfazer", porque validar não carimba — mas os dois
// contratos já ficaram registrados, e o registro deles carimbou a constituição.
// O passo 11 registra as alterações, e daí nada volta pela tela.
// Ver o fecho, no fim do arquivo.
const ATE_PASSO = Number(process.env.AC_ATE_PASSO ?? 11);

const ROTA_QUADRO = '/equipe/osg/work/quadro-societario';
const ROTA_GERAR = '/equipe/osg/work/gerar-documento';
// O status do bem é a SEGUNDA marca do registro na junta, e é aqui que ela se lê.
const ROTA_DIAGNOSTICO = '/equipe/osg/work/diagnostico-patrimonial';

/**
 * As duas empresas do par, cada uma com o seu modelo de contrato social e com os
 * eventos que o ledger deste cenário sustenta na alteração dela.
 *
 * A proprietária tem cessão (as quotas dela subiram) e a controladora não; as
 * duas têm aumento de capital, integralização e mudança de sócios. Endereço e
 * administração ficam de fora nas duas, porque nada foi mexido no cadastro
 * dentro da janela de `audit_logs`, e isso é comportamento correto, não falta.
 * Divergir daqui é o que os passos 8 e 9 acusam.
 */
const EMPRESAS = {
  pr: {
    chave: 'pr',
    nome: PROPRIETARIA,
    papel: 'proprietária',
    trechosDoModelo: ['Contrato Social', process.env.AC_MODELO_PR ?? 'Agro'],
    sustentadosPeloLedger: ['capital', 'integralizacao', 'cessao', 'socios'],
  },
  cn: {
    chave: 'cn',
    nome: CONTROLADORA,
    papel: 'controladora',
    trechosDoModelo: ['Contrato Social', process.env.AC_MODELO_CN ?? 'Participações'],
    sustentadosPeloLedger: ['capital', 'integralizacao', 'socios'],
  },
};

/**
 * Os seis eventos da alteração contratual, na ordem em que as resoluções estão
 * no modelo.
 *
 * - `rotulo`: casa o texto do <label> do interruptor no assistente;
 * - `rubrica`: o começo do bloco NA FOLHA, que é como se mede se a resolução
 *   entrou no documento;
 * - `nomeDoBloco`: o nome no catálogo, que é como o painel de conferência a
 *   nomeia quando o motor a descarta por falta de dado;
 * - `noPlano`: de onde a seção 3.3 do plano diz que este evento sai. É contra
 *   isto que os passos 8 e 9 comparam o que a tela mostra.
 */
const EVENTOS = [
  {
    chave: 'endereco',
    rotulo: /endere[çc]o da sede/i,
    rubrica: 'Altera-se o endereço da sede',
    nomeDoBloco: 'alteração do endereço da sede',
    noPlano: 'audit_logs sobre a pessoa da PJ, campos endereco_*',
  },
  {
    chave: 'capital',
    rotulo: /aumento do capital/i,
    rubrica: 'Aumenta-se o capital social',
    nomeDoBloco: 'aumento do capital social',
    noPlano: 'soma dos aportes sem documento no livro de movimentos',
  },
  {
    chave: 'integralizacao',
    rotulo: /integraliza[çc][ãa]o/i,
    rubrica: 'Integralizam-se as quotas',
    nomeDoBloco: 'integralização de capital',
    noPlano: 'os mesmos aportes, olhando com o que foram pagos',
  },
  {
    chave: 'cessao',
    rotulo: /cess[ãa]o de quotas/i,
    rubrica: 'Formaliza-se a cessão',
    nomeDoBloco: 'cessão de quotas',
    noPlano: 'linhas de cessao (ou doacao) sem documento',
  },
  {
    chave: 'socios',
    rotulo: /(entrada|retirada).*s[óo]cio/i,
    rubrica: 'Altera-se a composição do quadro societário',
    nomeDoBloco: 'entrada ou retirada de sócio',
    noPlano: 'quem vai a zero (retirada) ou nasce no quadro (ingresso)',
  },
  {
    chave: 'administracao',
    rotulo: /administra[çc][ãa]o da sociedade/i,
    rubrica: 'Altera-se a administração',
    nomeDoBloco: 'mudança na administração',
    noPlano: 'audit_logs sobre a administracao da PJ',
  },
];

const carimbo = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT = process.env.AC_OUT ?? path.join(RAIZ, '.playwright-mcp', `reorg-${carimbo}`);

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

const TOTAL = 11;
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

/**
 * Divergência entre o que a tela mostrou e o que o roteiro esperava. Não
 * interrompe nada: vai para o terminal, para a tarja e para o registro, e o
 * ensaio segue. Medir e narrar, não consertar.
 */
const acusacoes = [];
async function acusar(page, texto, ms = 2600) {
  acusacoes.push(texto);
  console.log(`      ATENÇÃO: ${texto}`);
  await tarja(page, `ATENÇÃO: ${texto}`);
  await pausa(ms);
}

/** Tarja flutuante injetada só no navegador: a tela conta a mesma história. */
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

const listar = (rotulo, itens) => {
  console.log(`      ${rotulo}:`);
  for (const i of itens) console.log(`        - ${i}`);
};

// ─── Leitura de estado: Quadro Societário ──────────────────────────────────

/**
 * O estado da aba de uma empresa no Quadro Societário: qual dos dois regimes a
 * tela está oferecendo (proposta ou quadro gravado), que gestos existem, e os
 * atos societários que tocaram esta empresa.
 *
 * É o que torna a demo re-executável: uma segunda passada lê isto antes de
 * apertar qualquer coisa e continua de onde a primeira parou.
 */
const estadoDoQuadro = (page) =>
  page.evaluate(() => {
    const limpo = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const painel = limpo(document.querySelector('main')?.innerText);
    const botoes = [...document.querySelectorAll('main button')].map((b) => limpo(b.innerText));
    const quantosAtos = /Atos societários \((\d+)\)/.exec(painel);

    // Cada ato é a linha que traz DOIS parágrafos (nome e detalhe) dentro do
    // seu próprio div. Ancorar na frase do detalhe evita depender de classe.
    const atos = [...document.querySelectorAll('main div')]
      .filter((d) => {
        const ps = d.querySelectorAll(':scope > div > p');
        return ps.length === 2 && /lançamento\(s\) nesta empresa/.test(ps[1].textContent || '');
      })
      .map((d) => {
        const ps = d.querySelectorAll(':scope > div > p');
        return {
          nome: limpo(ps[0].textContent),
          detalhe: limpo(ps[1].textContent),
          formalizado: /Formalizado em documento/.test(d.innerText || ''),
          podeDesfazer: [...d.querySelectorAll('button')].some((b) =>
            /Desfazer/.test(b.textContent || ''),
          ),
        };
      });

    return {
      cartao: /Quadro proposto \(/.test(painel)
        ? 'Quadro proposto'
        : /Lista de Sócios \(/.test(painel)
          ? 'Lista de Sócios'
          : null,
      gravado: /Quadro registrado, apurado da movimentação de quotas/.test(painel),
      aindaNaoGravado: /Ainda não gravado/.test(painel),
      podeGravar: botoes.includes('Gravar quadro societário'),
      podeTransferir: botoes.includes('Transferir quotas para a controladora'),
      podeRegistrarMovimento: botoes.includes('Registrar movimento'),
      totalAtos: quantosAtos ? Number(quantosAtos[1]) : 0,
      // A frase do cartão de atos que explica o alcance da reversão.
      reversaoEDoAtoInteiro: /Desfazer apaga o ato inteiro/.test(painel),
      atos,
    };
  });

/**
 * A tabela de sócios: uma linha por sócio, com a PROCEDÊNCIA de cada saldo, mais
 * o rodapé de total e os três KPIs do topo.
 *
 * O rodapé é lido além dos KPIs porque os KPIs são animados (count-up de 650ms)
 * e o rodapé não: comparar antes e depois com número animado seria comparar o
 * instante da leitura, não o valor.
 */
const lerQuadro = (page) =>
  page.evaluate(() => {
    const limpo = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const tabela = document.querySelector('main table');
    if (!tabela) return null;

    const linhas = [...tabela.querySelectorAll('tbody tr')].map((tr) => {
      const celulas = [...tr.children];
      // A célula do sócio empilha o avatar de iniciais, o nome, a
      // identificação e as etiquetas de procedência. Partir o innerText em
      // linhas faria do avatar ("LN") o nome do sócio: os <p> dão nome e
      // identificação, e os <span> daquela célula são só as etiquetas.
      const paragrafos = [...(celulas[0]?.querySelectorAll('p') ?? [])].map((p) =>
        limpo(p.textContent),
      );
      const etiquetas = [...(celulas[0]?.querySelectorAll('span') ?? [])].map((e) =>
        limpo(e.textContent),
      );
      return {
        nome: paragrafos[0] ?? '',
        identificacao: paragrafos[1] ?? '',
        procedencia: etiquetas,
        quotas: limpo(celulas[1]?.innerText),
        valor: limpo(celulas[2]?.innerText),
        participacao: limpo(celulas[3]?.innerText),
      };
    });

    const rodape = [...tabela.querySelectorAll('tfoot td')].map((td) => limpo(td.innerText));
    const kpi = (titulo) => {
      const rotulo = [...document.querySelectorAll('main p')].find(
        (p) => limpo(p.textContent) === titulo,
      );
      const corpo = rotulo?.parentElement?.parentElement;
      const paragrafos = corpo ? [...corpo.children].filter((e) => e.tagName === 'P') : [];
      return paragrafos.length ? limpo(paragrafos[paragrafos.length - 1].textContent) : null;
    };

    return {
      linhas,
      total: { quotas: rodape[1] ?? null, capital: rodape[2] ?? null },
      kpis: {
        capital: kpi('Capital Social Total'),
        quotas: kpi('Total de Quotas'),
        nominal: kpi('Valor Nominal'),
      },
    };
  });

/** O modal do macro, ANTES de gravar: é aí que a aritmética fica conferível. */
const lerModalDaSubida = (page) =>
  page.evaluate(() => {
    const limpo = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const modal = document.querySelector('[role="dialog"]');
    if (!modal) return null;
    const bloco = (rotulo) => {
      const p = [...modal.querySelectorAll('p')].find((e) => limpo(e.textContent) === rotulo);
      const lista = p?.parentElement?.querySelector('ul');
      return lista ? [...lista.querySelectorAll('li')].map((li) => limpo(li.innerText)) : [];
    };
    const texto = limpo(modal.innerText);
    const frase = (re) => {
      const m = re.exec(texto);
      return m ? limpo(m[0]) : null;
    };
    return {
      oQueSeraGravado: bloco('O que será gravado'),
      quadroDepois: bloco('Quadro da controladora depois do ato'),
      avisoDeProporcao: frase(/O capital de constituição da controladora não some.*?própria\./),
      // As quatro frases de `planejarSubidaDeQuotas` que impedem a gravação.
      problema: frase(
        /(A proprietária e a controladora são a mesma empresa\.|A proprietária não tem quadro societário para transferir\.|A controladora já é sócia da proprietária: as quotas já subiram\.|O valor das quotas de .*?antes de subir\.)/,
      ),
    };
  });

// ─── Leitura de estado: Gerar Documento ────────────────────────────────────

/**
 * O estado do documento, lido do rail de ações à direita da folha. Os estados
 * são excludentes na UI, e é assim que a demo sabe onde parou uma rodada
 * anterior. Registrar na junta é irreversível pela UI, e é ele que carimba o
 * ledger e vira o status dos bens: reler antes de agir não é conforto, é
 * obrigação.
 */
const estadoDoDocumento = (page) =>
  page.evaluate(() => {
    const limpo = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const painel = limpo(document.querySelector('main')?.innerText);
    const botoes = [...document.querySelectorAll('button')].map((b) => limpo(b.innerText));
    return {
      temFolha: !!document.querySelector('main article'),
      registrado: /Registrado na junta/.test(painel),
      alteracaoEmCurso: botoes.includes('Rever os eventos'),
      podeValidar: botoes.includes('Validar versão'),
      podeRegistrar: botoes.includes('Registrar na junta'),
      podeGerarAlteracao: botoes.includes('Gerar alteração contratual'),
      versaoValidada: /Versão validada/.test(painel),
    };
  });

/** Quais resoluções estão NA FOLHA (o <article> branco), por rubrica. */
const resolucoesNaFolha = (page) =>
  page.evaluate(
    (rubricas) => {
      const doc = document.querySelector('main article')?.innerText || '';
      return rubricas.filter((r) => doc.includes(r));
    },
    EVENTOS.map((e) => e.rubrica),
  );

/**
 * As resoluções que entraram na composição e o motor DESCARTOU por não trazerem
 * dado (lista vazia, campo em branco). O painel as nomeia em "N blocos não
 * entraram", e distingui-las das que a flag nem deixou entrar é o que separa
 * "cadastro incompleto" de "a condição não ligou".
 */
const resolucoesDescartadas = (page) =>
  page.evaluate(
    (nomes) => {
      const painel = document.querySelector('main')?.innerText || '';
      return nomes.filter((n) => painel.includes(`Resolução: ${n}`));
    },
    EVENTOS.map((e) => e.nomeDoBloco),
  );

/** Um trecho da folha a partir do primeiro casamento, para citar no registro. */
const trechoDaFolha = (page, padrao, tamanho = 460) =>
  page.evaluate(
    ([p, n]) => {
      const doc = document.querySelector('main article')?.innerText || '';
      const m = new RegExp(p, 'i').exec(doc);
      return m ? doc.slice(m.index, m.index + n).replace(/\s+/g, ' ').trim() : null;
    },
    [padrao, tamanho],
  );

/**
 * O capital que a folha PUBLICA: valor e total de quotas da cláusula de capital.
 *
 * É esse número que vira `capitalAnterior` na alteração seguinte, porque ele é o
 * que o snapshot congela. Ler da folha, e não do quadro societário, é de
 * propósito: o que a próxima peça vai citar é o que a peça anterior escreveu.
 */
const capitalDaFolha = (page) =>
  page.evaluate(() => {
    const doc = (document.querySelector('main article')?.innerText || '').replace(/\s+/g, ' ');
    // "O capital social da empresa será de R$ ..." no contrato social e "O
    // capital social é de R$ ..." na resolução: a raiz é a mesma, o verbo não.
    const m = /O capital social[^.]{0,40}?de R\$ ([\d.,]+).*?dividido em ([\d.]+)/.exec(doc);
    return m ? { valor: m[1], quotas: m[2] } : null;
  });

/**
 * Os três números da resolução de aumento: quanto aumentou, de quanto, para
 * quanto. Serve para confrontar a cláusula com o capital que o contrato anterior
 * publicou e com a evidência que o assistente mostrou.
 */
const numerosDoAumento = (page) =>
  page.evaluate(() => {
    const doc = (document.querySelector('main article')?.innerText || '').replace(/\s+/g, ' ');
    const m = /Aumenta-se o capital social em R\$ ([\d.,]+).*?anterior de R\$ ([\d.,]+).*?passa a ser de R\$ ([\d.,]+)/.exec(
      doc,
    );
    return m ? { delta: m[1], anterior: m[2], novo: m[3] } : null;
  });

/**
 * Os interruptores do assistente: rótulo, ligado/desligado e a EVIDÊNCIA.
 *
 * O rótulo mora no <label> e a evidência num <p> irmão, fora do label de
 * propósito (ela é a prova, não o nome do interruptor). Por isso os dois são
 * lidos separadamente: juntá-los perderia justamente a distinção que o desenho
 * do assistente faz.
 */
const lerEventos = (page) =>
  page.locator('[id^="evento-"]').evaluateAll((els) =>
    els.map((e) => {
      const cartao = e.closest('div');
      const evidencia = (cartao?.querySelector('p')?.textContent || '').trim();
      return {
        id: e.id,
        rotulo: (cartao?.querySelector('label')?.textContent || '').trim(),
        estado: e.getAttribute('data-state') || e.getAttribute('aria-checked'),
        evidencia,
        // "nada no cadastro registra este evento" é o texto literal do
        // componente para o caso sem prova: separá-lo aqui evita que o resto do
        // roteiro tenha de reconhecer a frase.
        temEvidencia: evidencia !== '' && !/^nada no cadastro registra este evento$/i.test(evidencia),
      };
    }),
  );

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
    'A barra "Cliente" não apareceu na tela.',
    `Confira se ${BASE}${ROTA_QUADRO} carrega e se o OsgLayout renderizou.`,
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
  await page.waitForTimeout(3000);
}

/** Troca de empresa no Quadro Societário. A aba remonta o quadro: vale esperar. */
async function irParaAba(page, nome) {
  const aba = page.getByRole('tab', { name: new RegExp(nome) }).first();
  exigir(
    await aba.count(),
    `Não achei a aba de "${nome}" no Quadro Societário.`,
    'Só PJ dos tipos PR e CN têm aba aqui. Confira o cadastro em Qualificação das Partes, ' +
      'ou ajuste AC_PROPRIETARIA / AC_CONTROLADORA.',
  );
  if ((await aba.getAttribute('data-state')) === 'active') {
    await page.waitForTimeout(600);
    return;
  }
  await aba.click();
  // 650ms de count-up mais a busca dos movimentos: ler antes disso leria o meio
  // da animação.
  await page.waitForTimeout(2600);
}

/** Volta ao Quadro Societário do cliente, na aba pedida. */
async function irAoQuadro(page, nome) {
  await page.goto(`${BASE}${ROTA_QUADRO}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await escolherCliente(page);
  await irParaAba(page, nome);
}

/**
 * O status de integralização de cada bem do cliente, da tabela de Diagnóstico
 * Patrimonial.
 *
 * É a segunda marca do registro na junta: pelos `bem_id` dos movimentos
 * carimbados, o bem passa a 'Integralizado' e sai de
 * STATUS_ELEGIVEIS_PARA_INTEGRALIZACAO (D5/D6), o que o tira do documento sem
 * ninguém editar cadastro. Lê pelo NOME da coluna, e não pela posição, para a
 * medida não depender da ordem das colunas.
 */
async function lerStatusDosBens(page) {
  await page.goto(`${BASE}${ROTA_DIAGNOSTICO}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await escolherCliente(page);
  await page.waitForTimeout(2500);
  return page.evaluate(() => {
    const limpo = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const tabela = [...document.querySelectorAll('table')].find((t) =>
      [...t.querySelectorAll('thead th')].some((th) => /Denomina/i.test(th.textContent || '')),
    );
    if (!tabela) return [];
    const cabecalhos = [...tabela.querySelectorAll('thead th')].map((th) => limpo(th.textContent));
    const iNome = cabecalhos.findIndex((h) => /Denomina/i.test(h));
    const iStatus = cabecalhos.findIndex((h) => /^Status$/i.test(h));
    if (iNome < 0 || iStatus < 0) return [];
    return [...tabela.querySelectorAll('tbody tr')].map((tr) => {
      const tds = [...tr.querySelectorAll('td')];
      const celaNome = tds[iNome];
      // A célula empilha o nome e, quando é o caso, o rótulo "Não participa da
      // estruturação". `textContent` colaria os dois; o primeiro <span> é o nome.
      const rotulo = celaNome?.querySelector('span');
      return {
        denominacao: limpo(rotulo?.textContent ?? celaNome?.textContent),
        status: limpo(tds[iStatus]?.textContent),
        foraDaEstruturacao: /Não participa da estruturação/.test(celaNome?.textContent || ''),
      };
    });
  });
}

/** Clica um botão e confirma o AlertDialog que ele abre. */
async function confirmando(page, nomeBotao, nomeConfirmacao, esperaMs = 8000) {
  await page.getByRole('button', { name: nomeBotao, exact: true }).first().click();
  await pausa(1200);
  const confirmar = page.getByRole('button', { name: nomeConfirmacao, exact: true }).last();
  exigir(
    await confirmar.count(),
    `A confirmação "${nomeConfirmacao}" não apareceu depois de clicar em "${nomeBotao}".`,
    'A UI mudou os rótulos dos AlertDialogs. Veja a última foto.',
  );
  await confirmar.click();
  await page.waitForTimeout(esperaMs);
}

async function escolherModelo(page, trechos) {
  let card = page.locator('button[aria-pressed]');
  for (const t of trechos) card = card.filter({ hasText: t });
  exigir(
    await card.count(),
    `Não achei o modelo (cards contendo ${trechos.map((t) => `"${t}"`).join(' e ')}).`,
    'Confira na Biblioteca de Modelos se o modelo está ativo e tem blocos, ou ajuste ' +
      'AC_MODELO_PR / AC_MODELO_CN.',
  );
  await card.first().click();
  await page.waitForTimeout(2800);
}

async function escolherEmpresa(page, nome) {
  const card = page.locator('button[aria-pressed]').filter({ hasText: nome }).first();
  exigir(
    await card.count(),
    `Não achei a empresa "${nome}" entre as PJ do cliente na tela Gerar.`,
    'Cadastre-a em Qualificação das Partes ou ajuste AC_PROPRIETARIA / AC_CONTROLADORA.',
  );
  await card.click();
  await page.waitForTimeout(3000);
}

/**
 * Preenche o que o modelo pede ALÉM da empresa: bindings de registro único (o
 * "Imóvel" do modelo da proprietária) e listas de seleção múltipla. O passo 2
 * não conclui e a folha não aparece enquanto qualquer um dos dois estiver em
 * branco, e foi exatamente aí que a primeira versão deste ensaio morria.
 *
 * A escolha é o PRIMEIRO registro de cada papel, arbitrária de propósito: o que
 * este ensaio demonstra é a derivação societária, não a curadoria do imóvel. O
 * que foi escolhido vai para o registro, porque entra no documento.
 */
async function completarSelecoesDoModelo(page) {
  const escolhidos = [];

  for (let tentativa = 0; tentativa < 8; tentativa += 1) {
    const emBranco = page
      .locator('main button[role="combobox"]')
      .filter({ hasText: 'Selecione' })
      .first();
    if (!(await emBranco.count())) break;
    await emBranco.click();
    await pausa(800);
    const opcao = page.getByRole('option').first();
    if (!(await opcao.count())) {
      // Papel sem registro cadastrado: fecha o menu e deixa a falta aparecer no
      // painel de conferência, que é onde ela deve aparecer.
      await page.keyboard.press('Escape');
      break;
    }
    const rotulo = (await opcao.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    await opcao.click();
    await page.waitForTimeout(1800);
    escolhidos.push(rotulo);
  }

  // Listas de seleção múltipla: marcar item não conclui o passo, quem conclui é
  // o botão, porque o documento pode descrever várias matrículas.
  const caixas = page.locator('main [id^="selecao-"]');
  const quantas = await caixas.count();
  if (quantas > 0) {
    const primeira = caixas.first();
    if ((await primeira.getAttribute('data-state')) !== 'checked') {
      await primeira.click();
      await pausa(800);
    }
    const concluir = page.getByRole('button', { name: 'Concluir seleção', exact: true });
    if (await concluir.count()) {
      await concluir.first().click();
      await page.waitForTimeout(2500);
    }
  }

  return { escolhidos, tinhaListas: quantas > 0 };
}

/** Cliente, modelo, empresa e o que o modelo mais pedir, do zero. */
async function irAoGerar(page, empresa) {
  await page.goto(`${BASE}${ROTA_GERAR}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  await escolherCliente(page);
  await escolherModelo(page, empresa.trechosDoModelo);
  await escolherEmpresa(page, empresa.nome);
  await page.waitForTimeout(2500);
  const selecoes = await completarSelecoesDoModelo(page);
  await page.waitForTimeout(3500);
  return selecoes;
}

/** Abre o assistente pelo caminho que a tela oferecer (primeira vez ou revisão). */
async function abrirAssistente(page) {
  const estado = await estadoDoDocumento(page);
  const nome = estado.alteracaoEmCurso ? 'Rever os eventos' : 'Gerar alteração contratual';
  const botao = page.getByRole('button', { name: nome, exact: true }).first();
  exigir(
    await botao.count(),
    'Nem "Gerar alteração contratual" nem "Rever os eventos" apareceram no rail.',
    'O documento precisa estar REGISTRADO na junta, e o modelo precisa ter blocos ' +
      'pendurados nas flags evento_* (ver a migration 20260825194340).',
  );
  await botao.click();
  await pausa(1600);
  const eventos = await lerEventos(page);
  exigir(
    eventos.length > 0,
    'O assistente abriu sem nenhum interruptor de evento.',
    'Confira em tmpl_bloco_flag se os blocos de resolução estão vinculados às flags evento_*, ' +
      'e se o modelo do documento contém esses blocos.',
  );
  return eventos;
}

/** Fecha o assistente sem gravar: só olhei. */
async function fecharAssistente(page) {
  const cancelar = page.getByRole('button', { name: 'Cancelar', exact: true }).last();
  if (await cancelar.count()) await cancelar.click();
  await pausa(1200);
}

/**
 * O confronto entre o que o assistente propôs e a seção 3.3 do plano: cada
 * evento que o ledger desta empresa sustenta tem de chegar ligado e com prova; o
 * que ele não sustenta, desligado e com a frase de ausência.
 */
const conferirContraOPlano = (eventos, sustentados) =>
  EVENTOS.map((ev) => {
    const naTela = eventos.find((e) => ev.rotulo.test(e.rotulo)) ?? null;
    const esperadoLigado = sustentados.includes(ev.chave);
    return {
      chave: ev.chave,
      rotulo_na_tela: naTela?.rotulo ?? null,
      evidencia_na_tela: naTela?.evidencia ?? null,
      ligado: naTela?.estado === 'checked',
      tem_evidencia: !!naTela?.temEvidencia,
      no_plano_sai_de: ev.noPlano,
      esperado_ligado: esperadoLigado,
      divergiu: !naTela || (naTela.estado === 'checked') !== esperadoLigado,
    };
  });

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

// ─── Blocos compostos, usados nos dois lados do par ────────────────────────

/**
 * Gera, valida e registra o contrato social de uma empresa, e devolve o capital
 * que a folha publicou.
 *
 * Idempotente: numa segunda rodada o documento já está registrado e a função só
 * lê. Registrar na junta não tem volta pela UI, e é por isso que cada gesto é
 * precedido da leitura do estado.
 */
async function registrarContratoSocial(page, empresa) {
  const selecoes = await irAoGerar(page, empresa);
  let estado = await estadoDoDocumento(page);
  exigir(
    estado.temFolha,
    `A folha do contrato social de ${empresa.nome} não apareceu.`,
    'Veja a última foto. Se o passo 2 ainda estiver aberto, é papel que o modelo pede e ' +
      'não tem registro cadastrado; se a folha estiver em erro, é placeholder não resolvido.',
  );

  let registrouAgora = false;
  if (estado.podeValidar && !estado.versaoValidada && !estado.alteracaoEmCurso) {
    await confirmando(page, 'Validar versão', 'Validar versão');
    estado = await estadoDoDocumento(page);
  }
  if (estado.podeRegistrar) {
    await confirmando(page, 'Registrar na junta', 'Registrar na junta');
    registrouAgora = true;
    estado = await estadoDoDocumento(page);
  }
  exigir(
    estado.registrado || estado.alteracaoEmCurso,
    `O contrato social de ${empresa.nome} não chegou a "Registrado na junta".`,
    'Leia o toast de erro na última foto: é a mensagem literal do servidor.',
  );

  const capital = await capitalDaFolha(page);
  return { selecoes, estado, registrouAgora, capital };
}

/**
 * A alteração contratual de uma empresa, do assistente à folha composta.
 *
 * Não carimba nada: o carimbo é do registro na junta, no passo 11.
 *
 * Confirma o que o assistente propôs sem mexer em interruptor: a demo não encena
 * a escolha do consultor, ela mostra a derivação chegando à folha.
 */
async function gerarAlteracaoContratual(page, empresa) {
  const selecoes = await irAoGerar(page, empresa);
  const eventos = await abrirAssistente(page);
  const conferencia = conferirContraOPlano(eventos, empresa.sustentadosPeloLedger);
  await foto(page, `assistente-${empresa.chave}`);
  await pausa(3200);

  const ligados = eventos.filter((e) => e.estado === 'checked').map((e) => e.rotulo);
  await page.getByRole('button', { name: 'Continuar', exact: true }).first().click();
  await pausa(2000);
  await page.getByRole('button', { name: 'Gerar alteração contratual', exact: true }).last().click();
  await page.waitForTimeout(8000);

  const naFolha = await resolucoesNaFolha(page);
  const descartadas = await resolucoesDescartadas(page);
  const aumento = await numerosDoAumento(page);
  // O capital que a própria alteração publica: as resoluções reproduzem a nova
  // redação da cláusula de capital. Serve para saber se o capital mudou, e é o
  // que separa "a cláusula de aumento faltou" de "não houve aumento".
  const capitalNaFolha = await capitalDaFolha(page);
  const textoDoAumento = await trechoDaFolha(page, 'Aumenta-se o capital social', 520);
  const textoDaCessao = await trechoDaFolha(page, 'Formaliza-se a cessão', 760);
  const textoDaIntegralizacao = await trechoDaFolha(page, 'Integralizam-se as quotas', 900);

  return {
    selecoes,
    eventos,
    conferencia,
    ligados,
    naFolha,
    descartadas,
    aumento,
    capitalNaFolha,
    textoDoAumento,
    textoDaCessao,
    textoDaIntegralizacao,
    // A alínea que qualifica a PJ de origem por inteiro só existe quando o
    // aporte foi pago com quotas de outra sociedade, que é o caso da
    // controladora e não o da proprietária.
    integralizacaoPagaComQuotas:
      !!textoDaIntegralizacao && /quotas que possuía na sociedade/.test(textoDaIntegralizacao),
    cessaoNomeiaAsPartes:
      !!textoDaCessao && /cede e transfere|doa e transfere/.test(textoDaCessao),
    integralizacaoTemAlineas: !!textoDaIntegralizacao && /\ba\)/.test(textoDaIntegralizacao),
  };
}

/** Narra e acusa o que a conferência do assistente encontrou. */
async function narrarConferencia(page, empresa, resultado) {
  listar(
    `${resultado.eventos.length} eventos no assistente de ${empresa.nome}`,
    resultado.eventos.map((e) => `[${e.estado}] ${e.rotulo} :: ${e.evidencia}`),
  );
  const semRotulo = resultado.conferencia.filter((c) => !c.rotulo_na_tela);
  const divergentes = resultado.conferencia.filter((c) => c.divergiu);
  if (semRotulo.length > 0) {
    await acusar(
      page,
      `${semRotulo.length} dos seis eventos do modelo não apareceram no assistente de ` +
        `${empresa.nome}: ${semRotulo.map((c) => c.chave).join(', ')}`,
      3400,
    );
  }
  if (divergentes.length === 0) {
    await nota(
      page,
      `Em ${empresa.nome}, os ${empresa.sustentadosPeloLedger.length} eventos que o ledger ` +
        'sustenta chegaram ligados; os outros, desligados',
      3200,
    );
  } else {
    await acusar(
      page,
      `derivação diferente do plano em ${empresa.nome}: ` +
        divergentes
          .map(
            (c) =>
              `${c.chave} (${c.ligado ? 'ligado' : 'desligado'}, esperado ${
                c.esperado_ligado ? 'ligado' : 'desligado'
              })`,
          )
          .join('; '),
      4000,
    );
  }
}

/**
 * Confronta os três lugares em que o capital anterior aparece, que é o achado
 * que motivou reescrever este ensaio.
 *
 * A cláusula lê o snapshot do contrato substituído (`calcularHistoricoCapital`);
 * a evidência do assistente lê o livro de movimentos. Enquanto os movimentos de
 * constituição não tiverem sido carimbados por peça nenhuma, a evidência conta a
 * partir de zero e a cláusula conta a partir do capital publicado. As duas estão
 * certas nos termos delas, e a demo mostra as duas em vez de escolher uma.
 */
async function narrarOCapital(page, empresa, capitalDoContrato, resultado) {
  const evidencia = resultado.conferencia.find((c) => c.chave === 'capital')?.evidencia_na_tela;
  console.log(`      capital publicado pelo contrato de ${empresa.nome}:`, JSON.stringify(capitalDoContrato));
  console.log('      evidência do assistente:', evidencia ?? '(nenhuma)');
  console.log('      cláusula de aumento:', JSON.stringify(resultado.aumento));

  if (!resultado.aumento) {
    // A resolução é condicional desde a migration 20260826154321
    // (`{{#sociedade.houveAumentoCapital}}`): ela só entra quando houve aumento
    // de fato, e o painel a nomeia em "N blocos não entraram" quando se cala.
    // Na proprietária o capital NÃO muda com a subida (muda de quem são as
    // quotas), então o silêncio é a resposta certa e acusá-lo seria acusar o
    // acerto. O que fica sob suspeita nesse caso é o interruptor que chegou
    // ligado, e a demo diz isso.
    const capitalIntacto =
      !!capitalDoContrato &&
      !!resultado.capitalNaFolha &&
      resultado.capitalNaFolha.valor === capitalDoContrato.valor;
    if (capitalIntacto) {
      await nota(
        page,
        `Em ${empresa.nome} o capital não mudou (R$ ${capitalDoContrato.valor}): a resolução de ` +
          'aumento se cala, e quem fica sob suspeita é o interruptor que chegou ligado',
        3800,
      );
    } else {
      await acusar(
        page,
        `em ${empresa.nome} o capital foi de R$ ${capitalDoContrato?.valor ?? '?'} para ` +
          `R$ ${resultado.capitalNaFolha?.valor ?? '?'} e a cláusula de aumento não saiu`,
        4000,
      );
    }
    return;
  }
  const clausulaBate =
    !!capitalDoContrato && resultado.aumento.anterior === capitalDoContrato.valor;
  if (clausulaBate) {
    await nota(
      page,
      `Aumento de ${empresa.nome}: de R$ ${resultado.aumento.anterior} para ` +
        `R$ ${resultado.aumento.novo}, e o "de" é o capital que o contrato publicou`,
      3600,
    );
  } else {
    await acusar(
      page,
      `em ${empresa.nome} a cláusula parte de R$ ${resultado.aumento.anterior} mas o contrato ` +
        `publicou R$ ${capitalDoContrato?.valor ?? '?'}`,
      4000,
    );
  }
  // Não é acusação: é a diferença de fonte, e ela é esperada enquanto os
  // movimentos de constituição não tiverem documento.
  if (evidencia && !evidencia.includes(resultado.aumento.anterior)) {
    await nota(
      page,
      'A evidência do assistente conta do livro (sem carimbo, parte de zero) e a cláusula ' +
        'conta do snapshot do contrato: fontes diferentes, as duas corretas',
      3600,
    );
  }
}

/**
 * Sela a versão da alteração. NÃO carimba o ledger nem vira status de bem: desde
 * a D4 as duas marcas nascem no "Registrar na junta" (ver `registrarAlteracao`).
 */
async function validarAlteracao(page) {
  const estado = await estadoDoDocumento(page);
  if (!estado.podeValidar) return { validou: false, estado };
  await confirmando(page, 'Validar versão', 'Validar versão', 10000);
  return { validou: true, estado: await estadoDoDocumento(page) };
}

/**
 * Registra a alteração na junta — o gesto que carimba o ledger e vira o status
 * dos bens, num movimento só (D4/D5/D6).
 *
 * Irreversível pela UI, e por isso o estado é lido antes: numa segunda rodada a
 * peça já está registrada e a função só lê. Se o rail estiver fechado, a demo
 * ACUSA em vez de forçar: botão desabilitado ali é o porteiro do defeito 4
 * fazendo o trabalho dele, e o motivo está na tooltip.
 */
async function registrarAlteracao(page, empresa) {
  const estado = await estadoDoDocumento(page);
  if (estado.registrado) return { registrou: false, estado, motivo: 'já registrada' };
  if (!estado.podeRegistrar) {
    await acusar(
      page,
      `em ${empresa.nome} não apareceu "Registrar na junta" para a alteração validada`,
      3400,
    );
    return { registrou: false, estado, motivo: 'sem botão de registrar' };
  }
  await confirmando(page, 'Registrar na junta', 'Registrar na junta', 10000);
  return { registrou: true, estado: await estadoDoDocumento(page) };
}

// ─── Ensaio ────────────────────────────────────────────────────────────────

async function ensaio(page) {
  // O que este run efetivamente escreveu: decide o fecho.
  const feito = {
    gravouQuadro: false,
    registrouContratos: [],
    criouAto: false,
    respondeuAssistente: [],
    validouAlteracao: [],
    registrouAlteracao: [],
  };
  let atoDaSubida = null;
  let quadroCnAntes = null;
  const capitalDoContrato = {};

  const acharAtoDaSubida = (atos) =>
    atos.find((a) => /Subida das quotas/i.test(a.nome)) ?? atos[0] ?? null;

  // ── 1. Login e cliente ───────────────────────────────────────────────────
  await page.goto(`${BASE}/equipe`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await narrar(page, 'Entrando na área da equipe', 1800);
  await entrar(page);
  await page.goto(`${BASE}${ROTA_QUADRO}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await escolherCliente(page);
  await nota(page, `Quadro Societário do cliente ${CLIENTE}`, 1800);
  anota({ passo: 1, o_que: 'login e cliente', cliente: CLIENTE, url: page.url() });
  await foto(page, '01-quadro-societario');

  // ── 2. A proprietária PROPÕE o quadro de constituição ────────────────────
  // Primeiro dos dois regimes do plano: na constituição o quadro É o dado,
  // calculado dos bens aprovados e rateado pelas frações de titularidade. A
  // migration de cenário deixou a PR sem quadro DE PROPÓSITO, para que a
  // proposta e o rateio sejam exercidos aqui e não reproduzidos em SQL.
  await narrar(page, `${PROPRIETARIA}: a tela propõe o quadro de constituição`, 1800);
  await irParaAba(page, PROPRIETARIA);
  let estadoPr = await estadoDoQuadro(page);
  const proposta = await lerQuadro(page);
  console.log('      estado da aba:', JSON.stringify(estadoPr));
  exigir(
    proposta,
    `A tabela de sócios não apareceu na aba de ${PROPRIETARIA}.`,
    'Sem bem aprovado para integralização com destino a esta empresa não há proposta. ' +
      'Reaplique a migration de cenário 20260826215500 e confira o Diagnóstico Patrimonial.',
  );
  await foto(page, '02a-quadro-proposto');

  let quadroPr = proposta;
  if (estadoPr.podeGravar) {
    await nota(
      page,
      `"${estadoPr.cartao}" e "Ainda não gravado": ${proposta.linhas.length} sócio(s), ` +
        `${proposta.total.quotas} quotas, ${proposta.total.capital}`,
      2600,
    );
    listar('proposta', proposta.linhas.map((l) => `${l.nome}: ${l.quotas} quotas · ${l.valor}`));
    await confirmando(page, 'Gravar quadro societário', 'Gravar');
    feito.gravouQuadro = true;
    estadoPr = await estadoDoQuadro(page);
    quadroPr = await lerQuadro(page);
    await nota(page, 'Cartão virou "Quadro registrado, apurado da movimentação de quotas"', 2200);
  } else if (estadoPr.gravado) {
    await nota(page, 'O quadro já estava gravado nesta empresa: sigo de onde a rodada anterior parou', 2400);
  } else {
    await acusar(
      page,
      'a aba não oferece "Gravar quadro societário" e o quadro não consta gravado ' +
        '(titular sem pessoa cadastrada trava a gravação)',
      3400,
    );
  }

  // A medida do passo: gravar não pode mexer no total. A proposta e o quadro
  // gravado são a MESMA conta, uma em memória e outra no livro de movimentos.
  const fecharamOsTotais =
    proposta.total.quotas === quadroPr.total.quotas && proposta.total.capital === quadroPr.total.capital;
  anota({
    passo: 2,
    o_que: 'quadro de constituição',
    gravou_nesta_rodada: feito.gravouQuadro,
    estado_da_aba: estadoPr,
    antes: { total: proposta.total, kpis: proposta.kpis, linhas: proposta.linhas },
    depois: { total: quadroPr.total, kpis: quadroPr.kpis, linhas: quadroPr.linhas },
    totais_iguais: fecharamOsTotais,
    // Sem gravação nesta rodada os dois lados são a mesma leitura, e a
    // igualdade não prova nada: o registro diz isso em vez de deixar parecer.
    comparacao_significativa: feito.gravouQuadro,
  });
  if (fecharamOsTotais) {
    await nota(
      page,
      feito.gravouQuadro
        ? `Total intacto ao gravar: ${quadroPr.total.quotas} quotas, ${quadroPr.total.capital}`
        : `Quadro já gravado: ${quadroPr.total.quotas} quotas, ${quadroPr.total.capital} (nada a comparar nesta rodada)`,
      2600,
    );
  } else {
    await acusar(
      page,
      `o total mudou ao gravar: ${proposta.total.quotas}/${proposta.total.capital} ` +
        `virou ${quadroPr.total.quotas}/${quadroPr.total.capital}`,
    );
  }
  await foto(page, '02b-quadro-gravado');
  if (ATE_PASSO <= 2) return { feito, atoDaSubida };

  // ── 3. A procedência de cada saldo ───────────────────────────────────────
  await narrar(page, 'A procedência: cada linha diz de onde vem o saldo', 1800);
  // A etiqueta vem do livro de movimentos, que é uma busca à parte: logo depois
  // de gravar ela ainda não chegou, e ler o quadro do passo 2 leria o intervalo.
  await page.waitForTimeout(2500);
  quadroPr = await lerQuadro(page);
  const semProcedenciaPr = quadroPr.linhas.filter(
    (l) => !l.procedencia.some((p) => /Constituição/i.test(p)),
  );
  listar(
    `procedência em ${PROPRIETARIA}`,
    quadroPr.linhas.map((l) => `${l.nome}: ${l.procedencia.join(' · ') || '(nenhuma)'}`),
  );
  await rolarAte(page, quadroPr.linhas[0]?.nome ?? 'Sócio', false);
  await foto(page, '03a-procedencia-pr');
  if (semProcedenciaPr.length > 0) {
    await acusar(
      page,
      `${semProcedenciaPr.length} linha(s) de ${PROPRIETARIA} sem a etiqueta "Constituição"`,
    );
  } else {
    await nota(page, `Todas as linhas de ${PROPRIETARIA} trazem a etiqueta "Constituição"`, 2400);
  }

  // A mesma etiqueta existe na controladora, e ler o quadro dela agora dá o
  // "antes" com que o passo 7 compara o resultado da subida.
  await irParaAba(page, CONTROLADORA);
  quadroCnAntes = await lerQuadro(page);
  exigir(
    quadroCnAntes,
    `A tabela de sócios não apareceu na aba de ${CONTROLADORA}.`,
    'A controladora precisa estar no capital de constituição (500 quotas por fundador). ' +
      'Reaplique a migration de cenário 20260826215500 pelo CLI, contra o sandbox.',
  );
  listar(
    `procedência em ${CONTROLADORA}`,
    quadroCnAntes.linhas.map(
      (l) => `${l.nome}: ${l.quotas} quotas · ${l.procedencia.join(' · ') || '(nenhuma)'}`,
    ),
  );
  await foto(page, '03b-procedencia-cn');
  anota({
    passo: 3,
    o_que: 'procedência do saldo nas duas empresas',
    proprietaria: quadroPr.linhas.map((l) => ({ nome: l.nome, procedencia: l.procedencia })),
    controladora: quadroCnAntes.linhas.map((l) => ({
      nome: l.nome, quotas: l.quotas, valor: l.valor, procedencia: l.procedencia,
    })),
    capital_de_constituicao_da_controladora: quadroCnAntes.total,
  });
  await nota(
    page,
    `${CONTROLADORA} no capital de constituição: ${quadroCnAntes.total.quotas} quotas, ${quadroCnAntes.total.capital}`,
    2600,
  );
  if (ATE_PASSO <= 3) return { feito, atoDaSubida };

  // ── 4 e 5. Os dois contratos sociais, ANTES do macro ─────────────────────
  // Esta é a ordem que importa, e é a razão de este ensaio ter sido reescrito.
  // O `capitalAnterior` da resolução de aumento sai do SNAPSHOT do contrato que
  // a peça substitui, não do livro. Contrato registrado depois do macro já
  // carrega o capital de depois da subida, e o aumento sai com delta zero: a
  // cláusula que o plano existe para produzir sairia vazia de conteúdo.
  //
  // Daqui em diante a passada deixa de ser reversível: registrar na junta não
  // tem volta pela UI.
  for (const empresa of [EMPRESAS.pr, EMPRESAS.cn]) {
    await narrar(page, `Contrato social de ${empresa.nome} (a ${empresa.papel})`, 2000);
    const contrato = await registrarContratoSocial(page, empresa);
    if (contrato.registrouAgora) feito.registrouContratos.push(empresa.nome);
    capitalDoContrato[empresa.chave] = contrato.capital;
    console.log('      estado do documento:', JSON.stringify(contrato.estado));
    console.log('      capital publicado:', JSON.stringify(contrato.capital));
    if (contrato.selecoes.escolhidos.length > 0) {
      await nota(
        page,
        `O modelo pede mais que a empresa: escolhi ${contrato.selecoes.escolhidos.join(', ')}`,
        2400,
      );
    }
    anota({
      passo: empresa.chave === 'pr' ? 4 : 5,
      o_que: `contrato social de ${empresa.nome} registrado`,
      empresa: empresa.nome,
      papel: empresa.papel,
      modelo: empresa.trechosDoModelo.join(' + '),
      registrou_nesta_rodada: contrato.registrouAgora,
      selecoes_do_modelo: contrato.selecoes,
      capital_publicado: contrato.capital,
      estado: contrato.estado,
    });
    if (contrato.capital) {
      await nota(
        page,
        `${empresa.nome} registrada com R$ ${contrato.capital.valor} em ${contrato.capital.quotas} quotas`,
        3000,
      );
    } else {
      await acusar(page, `não achei a cláusula de capital na folha de ${empresa.nome}`);
    }
    await rolarAte(page, 'O capital social', true);
    await foto(page, `${empresa.chave === 'pr' ? '04' : '05'}-contrato-${empresa.chave}`);
    await pausa(2500);
    if (ATE_PASSO <= (empresa.chave === 'pr' ? 4 : 5)) return { feito, atoDaSubida };
  }

  // ── 6. O macro da subida ─────────────────────────────────────────────────
  // Um gesto só. Entrada: a controladora e a data. Nada mais, porque nada mais
  // há a perguntar: dadas as duas empresas, quem sobe, com quantas quotas e por
  // qual valor sai do quadro. O que a demo mede é o modal ANTES de gravar, que é
  // onde a aritmética fica conferível dos dois lados.
  await narrar(page, `Subindo as quotas de ${PROPRIETARIA} para ${CONTROLADORA}`, 2000);
  await irAoQuadro(page, PROPRIETARIA);
  estadoPr = await estadoDoQuadro(page);

  let leituraDoModal = null;
  if (estadoPr.totalAtos > 0) {
    atoDaSubida = acharAtoDaSubida(estadoPr.atos);
    await nota(
      page,
      `Já existe ato societário nesta empresa ("${atoDaSubida?.nome ?? '?'}"): não repito a subida`,
      2600,
    );
  } else {
    exigir(
      estadoPr.podeTransferir,
      'O botão "Transferir quotas para a controladora" não apareceu na aba da proprietária.',
      'Ele só existe com quadro GRAVADO. Confira o passo 2 na última foto.',
    );
    await page
      .getByRole('button', { name: 'Transferir quotas para a controladora', exact: true })
      .first()
      .click();
    await pausa(1600);

    const modal = page.getByRole('dialog');
    exigir(
      await modal.count(),
      'O modal "Transferir quotas para a controladora" não abriu.',
      'Veja a última foto: pode ter havido erro de carregamento do quadro da controladora.',
    );
    // O combobox de dentro do modal, e não o da barra de cima.
    await modal.getByRole('combobox').first().click();
    await pausa(900);
    const opcao = page.getByRole('option', { name: new RegExp(CONTROLADORA) }).first();
    exigir(
      await opcao.count(),
      `"${CONTROLADORA}" não aparece entre as controladoras candidatas.`,
      'Candidata é PJ do cliente com tipo_empresa CN. Confira Qualificação das Partes.',
    );
    await opcao.click();
    await pausa(1200);
    await modal.locator('input[type="date"]').fill(DATA_DO_ATO);
    // A leitura do quadro da controladora é assíncrona: o resumo só existe depois.
    await page.waitForTimeout(3000);

    leituraDoModal = await lerModalDaSubida(page);
    listar('o que será gravado', leituraDoModal?.oQueSeraGravado ?? []);
    listar('quadro da controladora depois do ato', leituraDoModal?.quadroDepois ?? []);
    console.log('      aviso de proporção:', leituraDoModal?.avisoDeProporcao ?? '(nenhum)');
    await foto(page, '06a-modal-da-subida');
    await pausa(3000);

    if (leituraDoModal?.problema) {
      await acusar(page, `o modal recusa gravar: ${leituraDoModal.problema}`, 4000);
    }
    if (leituraDoModal?.avisoDeProporcao) {
      await nota(page, 'Aviso de proporção na tela: o resíduo do capital de constituição não some', 3200);
      if (!/alteração contratual própria/.test(leituraDoModal.avisoDeProporcao)) {
        await acusar(page, 'o aviso de proporção não cita a "alteração contratual própria"');
      }
    } else {
      await nota(page, 'Sem aviso de proporção: as duas proporções bateram', 2200);
    }

    exigir(
      (leituraDoModal?.oQueSeraGravado?.length ?? 0) > 0,
      'O bloco "O que será gravado" não trouxe nenhuma linha.',
      'Sem ele o modal não tem o que gravar. Veja a foto 06a e o problema que ele acusa.',
    );
    await page.getByRole('button', { name: 'Transferir quotas', exact: true }).last().click();
    await page.waitForTimeout(8000);
    feito.criouAto = true;
    estadoPr = await estadoDoQuadro(page);
    atoDaSubida = acharAtoDaSubida(estadoPr.atos);
  }

  anota({
    passo: 6,
    o_que: 'macro da subida',
    gravou_nesta_rodada: feito.criouAto,
    data_do_ato: DATA_DO_ATO,
    modal_antes_de_gravar: leituraDoModal,
    ato: atoDaSubida,
    estado_da_aba: estadoPr,
  });
  await foto(page, '06b-depois-da-subida');
  if (ATE_PASSO <= 6) return { feito, atoDaSubida };

  // ── 7. O par espelhado, e a reversão que ainda existe ────────────────────
  // Os dois contratos já estão registrados, e o ato da subida SEGUE reversível.
  // Não porque contrato registrado não carimbe — desde a D3 ele carimba, e os
  // passos 4 e 5 estamparam os aportes de CONSTITUIÇÃO —, mas porque o carimbo
  // pega os movimentos pendentes NAQUELE instante, e o ato da subida nasceu
  // depois deles, no passo 6. Quem o vai carimbar é a alteração, ao ser
  // registrada no passo 11. Por isso o ensaio mostra o "Desfazer" aqui e não
  // clica.
  await narrar(page, 'O par espelhado: uma cessão de um lado, um aporte do outro', 2000);
  const quadroPrDepois = await lerQuadro(page);
  listar(
    `${PROPRIETARIA} depois do ato`,
    quadroPrDepois.linhas.map(
      (l) => `${l.nome}: ${l.quotas} quotas · ${l.valor} · ${l.procedencia.join(' · ') || '(sem procedência)'}`,
    ),
  );
  const ato = acharAtoDaSubida(estadoPr.atos);
  await rolarAte(page, 'Atos societários', false);
  await foto(page, '07a-pr-depois');
  await pausa(2500);

  await irParaAba(page, CONTROLADORA);
  const quadroCnDepois = await lerQuadro(page);
  const estadoCnDepois = await estadoDoQuadro(page);
  listar(
    `${CONTROLADORA} depois do ato`,
    quadroCnDepois.linhas.map(
      (l) => `${l.nome}: ${l.quotas} quotas · ${l.valor} · ${l.procedencia.join(' · ') || '(sem procedência)'}`,
    ),
  );
  await foto(page, '07b-cn-depois');

  const nomeDoAtoNaPr = ato?.nome ?? null;
  const nomeDoAtoNaCn = acharAtoDaSubida(estadoCnDepois.atos)?.nome ?? null;
  const mesmoAtoNasDuas = !!nomeDoAtoNaPr && nomeDoAtoNaPr === nomeDoAtoNaCn;
  const controladoraEUnicaSocia =
    quadroPrDepois.linhas.length === 1 && new RegExp(CONTROLADORA).test(quadroPrDepois.linhas[0].nome);
  const procedenciaApontaOAto =
    !!nomeDoAtoNaPr && quadroCnDepois.linhas.some((l) => l.procedencia.includes(nomeDoAtoNaPr));

  anota({
    passo: 7,
    o_que: 'par espelhado e reversão do ato',
    proprietaria_depois: { total: quadroPrDepois.total, linhas: quadroPrDepois.linhas },
    controladora_antes: { total: quadroCnAntes.total, linhas: quadroCnAntes.linhas },
    controladora_depois: { total: quadroCnDepois.total, linhas: quadroCnDepois.linhas },
    ato_na_proprietaria: nomeDoAtoNaPr,
    ato_na_controladora: nomeDoAtoNaCn,
    mesmo_ato_nas_duas: mesmoAtoNasDuas,
    controladora_e_unica_socia_da_proprietaria: controladoraEUnicaSocia,
    procedencia_aponta_o_ato: procedenciaApontaOAto,
    tem_botao_desfazer: !!ato?.podeDesfazer,
    reversao_e_do_ato_inteiro: estadoPr.reversaoEDoAtoInteiro,
    nao_cliquei_em_desfazer: true,
  });

  if (controladoraEUnicaSocia) {
    await nota(page, `Em ${PROPRIETARIA} os fundadores saíram e ${CONTROLADORA} é a única sócia`, 2600);
  } else if (quadroPrDepois.linhas.length !== 1) {
    await acusar(
      page,
      `${PROPRIETARIA} ficou com ${quadroPrDepois.linhas.length} sócio(s) depois da subida, e não com a controladora sozinha`,
    );
  } else {
    await acusar(
      page,
      `${PROPRIETARIA} ficou com um sócio só, mas não é ${CONTROLADORA}: "${quadroPrDepois.linhas[0].nome}"`,
    );
  }
  if (mesmoAtoNasDuas) {
    await nota(page, `Cartão "Atos societários" nas duas empresas, com o mesmo ato: ${nomeDoAtoNaPr}`, 2800);
  } else {
    await acusar(page, `o ato não bate nas duas empresas: "${nomeDoAtoNaPr}" x "${nomeDoAtoNaCn}"`);
  }
  if (!procedenciaApontaOAto) {
    await acusar(page, `nenhuma linha de ${CONTROLADORA} traz o ato como procedência`);
  }
  if (ato?.podeDesfazer) {
    await nota(
      page,
      'Os dois contratos já estão registrados e o ato da subida AINDA aceita "Desfazer": ' +
        'o registro carimba o que estava pendente na hora, e este ato nasceu depois',
      3600,
    );
  } else if (ato?.formalizado) {
    await nota(page, 'O ato já está formalizado em documento: não há mais o que desfazer aqui', 3000);
  } else {
    await acusar(page, 'não achei o botão "Desfazer" no cartão de atos');
  }
  if (ATE_PASSO <= 7) return { feito, atoDaSubida };

  // ── 8 e 9. As duas alterações contratuais ────────────────────────────────
  // O coração da demo. Antes, seis perguntas. Agora, seis interruptores já
  // ligados pelo que o cadastro sustenta, cada um com a prova embaixo.
  //
  // A ordem entre as duas não é indiferente: a da proprietária vem primeiro
  // porque é ela que a peça da controladora cita ("cuja alteração contratual
  // tramita em conjunto com o presente instrumento").
  const alteracoes = {};
  for (const empresa of [EMPRESAS.pr, EMPRESAS.cn]) {
    const numero = empresa.chave === 'pr' ? 8 : 9;
    await narrar(
      page,
      `Alteração contratual de ${empresa.nome}: o assistente propõe, com a evidência`,
      2000,
    );
    const resultado = await gerarAlteracaoContratual(page, empresa);
    alteracoes[empresa.chave] = resultado;
    feito.respondeuAssistente.push(empresa.nome);

    await narrarConferencia(page, empresa, resultado);
    await narrarOCapital(page, empresa, capitalDoContrato[empresa.chave], resultado);

    console.log('      resoluções na folha:', JSON.stringify(resultado.naFolha));
    console.log('      descartadas por falta de dado:', JSON.stringify(resultado.descartadas));

    // Composta e depois descartada por lista vazia é comportamento CORRETO do
    // motor (o painel a nomeia em "N blocos não entraram"): a flag ligou, o
    // cadastro é que não tem o dado. Defeito seria não aparecer em lugar nenhum.
    const cobertas = resultado.naFolha.length + resultado.descartadas.length;
    if (cobertas < resultado.ligados.length) {
      await acusar(
        page,
        `em ${empresa.nome}, dos ${resultado.ligados.length} eventos confirmados, ${cobertas} aparecem (folha ou descarte)`,
        3400,
      );
    }

    // A cessão só existe do lado de quem cedeu, e a alínea de quotas de outra
    // sociedade só do lado de quem recebeu: cada lado é conferido pelo que lhe
    // cabe, e não pelo que caberia ao outro.
    if (empresa.chave === 'pr') {
      await rolarAte(page, 'Formaliza-se a cessão', true);
      if (resultado.cessaoNomeiaAsPartes) {
        await nota(page, 'A cessão nomeia cedente, cessionário e quantidade', 2800);
      } else {
        await acusar(page, 'a resolução de cessão não nomeou as partes');
      }
    } else {
      await rolarAte(page, 'Integralizam-se as quotas', true);
      if (resultado.integralizacaoPagaComQuotas) {
        await nota(
          page,
          'Na controladora, a alínea de integralização é paga com QUOTAS da proprietária, ' +
            'qualificada por inteiro e com a citação do processo conjunto',
          3800,
        );
      } else {
        await acusar(
          page,
          'a integralização da controladora não trouxe a alínea paga com quotas de outra sociedade',
          4000,
        );
      }
    }
    if (!resultado.integralizacaoTemAlineas) {
      await acusar(page, `a integralização de ${empresa.nome} não trouxe alíneas por sócio`);
    }
    await foto(page, `${numero === 8 ? '08' : '09'}a-resolucoes-${empresa.chave}`);
    await pausa(2500);

    // Selar a peça, e só. O carimbo nos movimentos dos eventos confirmados é do
    // passo 11, quando a peça for registrada na junta.
    const validacao = await validarAlteracao(page);
    if (validacao.validou) feito.validouAlteracao.push(empresa.nome);
    else await nota(page, `A alteração de ${empresa.nome} já estava validada`, 2000);

    anota({
      passo: numero,
      o_que: `alteração contratual de ${empresa.nome}`,
      empresa: empresa.nome,
      papel: empresa.papel,
      eventos_na_tela: resultado.eventos,
      conferencia_contra_o_plano: resultado.conferencia,
      eventos_confirmados: resultado.ligados,
      na_folha: resultado.naFolha,
      descartadas_por_falta_de_dado: resultado.descartadas,
      capital_publicado_pelo_contrato: capitalDoContrato[empresa.chave],
      numeros_da_clausula_de_aumento: resultado.aumento,
      capital_publicado_pela_alteracao: resultado.capitalNaFolha,
      texto_do_aumento: resultado.textoDoAumento,
      texto_da_cessao: resultado.textoDaCessao,
      texto_da_integralizacao: resultado.textoDaIntegralizacao,
      cessao_nomeia_as_partes: resultado.cessaoNomeiaAsPartes,
      integralizacao_tem_alineas: resultado.integralizacaoTemAlineas,
      integralizacao_paga_com_quotas: resultado.integralizacaoPagaComQuotas,
      validou_nesta_rodada: validacao.validou,
      estado: validacao.estado,
    });
    await foto(page, `${numero === 8 ? '08' : '09'}b-alteracao-validada-${empresa.chave}`);
    if (ATE_PASSO <= numero) return { feito, atoDaSubida };
  }

  // ── 10. Validada, e ainda sem carimbo ────────────────────────────────────
  // Duas medidas que só fazem sentido juntas, e que a corrida de 26/08/2026 não
  // conseguiu tomar:
  //
  //  - "Rever os eventos" CONTINUA no rail. Antes ele vivia no ramo
  //    `alteracaoEmCurso` de DocumentoCentroRail, e esse ramo exige um documento
  //    registrado em cena: validada a peça, a head passava a ser ela e o botão
  //    desaparecia. Era o defeito 5.
  //  - O ledger AINDA NÃO foi carimbado. O ato segue oferecendo "Desfazer",
  //    porque validar sela um rascunho e não formaliza nada (D4). É a prova pelo
  //    avesso: o carimbo não aconteceu no gesto errado.
  await narrar(page, 'Validada a peça: o assistente segue à mão, e o ledger intacto', 2000);
  const antesDoRegistro = {};
  for (const empresa of [EMPRESAS.pr, EMPRESAS.cn]) {
    await irAoGerar(page, empresa);
    const estado = await estadoDoDocumento(page);
    antesDoRegistro[empresa.chave] = { rail: estado };
    if (estado.alteracaoEmCurso) {
      await nota(page, `Em ${empresa.nome}, "Rever os eventos" continua no rail depois de validar`, 2800);
    } else {
      await acusar(
        page,
        `em ${empresa.nome} não há como reabrir o assistente depois de validar: "Rever os eventos" saiu do rail`,
        4000,
      );
    }
    await foto(page, `10a-rail-validado-${empresa.chave}`);

    await irAoQuadro(page, empresa.nome);
    const doQuadro = await estadoDoQuadro(page);
    const ato = acharAtoDaSubida(doQuadro.atos);
    antesDoRegistro[empresa.chave].ato = ato;
    await rolarAte(page, 'Atos societários', false);
    await foto(page, `10b-ato-antes-do-registro-${empresa.chave}`);
    if (ato?.podeDesfazer && !ato.formalizado) {
      await nota(page, `Em ${empresa.nome} o ato ainda não foi formalizado: validar não carimba`, 3000);
    } else if (ato?.formalizado) {
      await acusar(
        page,
        `em ${empresa.nome} o ato já está "Formalizado em documento" ANTES de registrar a alteração: ` +
          'o carimbo voltou para o validar',
        4000,
      );
    }
    await pausa(1500);
  }

  // Os bens ANTES do registro: é contra esta foto que o passo 11 mede o flip.
  const bensAntes = await lerStatusDosBens(page);
  listar('bens antes do registro', bensAntes.map((b) => `${b.denominacao}: ${b.status}`));

  anota({
    passo: 10,
    o_que: 'peça validada, ledger ainda intacto',
    validou_nesta_rodada: feito.validouAlteracao,
    por_empresa: antesDoRegistro,
    bens_antes_do_registro: bensAntes,
    nota:
      'validar sela o rascunho e não marca nada (D4): o ato segue reversível e o bem segue ' +
      'elegível. E "Rever os eventos" continua no rail, que é o defeito 5 corrigido.',
  });
  if (ATE_PASSO <= 10) return { feito, atoDaSubida, bensAntes };

  // ── 11. Registrar na junta: as duas marcas, no mesmo gesto ───────────────
  // O gesto irreversível, e a asserção mais valiosa da demo. Registrar carimba
  // `documento_gerado_id` nos movimentos dos eventos confirmados e, pelos
  // `bem_id` desses mesmos movimentos, vira o status do bem para 'Integralizado'
  // (D5/D6). As duas nascem juntas de propósito: em gestos separados elas
  // divergiriam.
  //
  // Três provas, cada uma num lugar diferente da UI:
  //   ledger  → no cartão de atos, "Desfazer" vira "Formalizado em documento";
  //   cadastro → em Diagnóstico Patrimonial, o bem passa a 'Integralizado';
  //   derivação → reabrindo o assistente, o evento formalizado perde a evidência,
  //               que é o que impede a próxima peça de recontar a mesma história.
  await narrar(page, 'Registrar na junta: o carimbo no ledger e o status do bem, num gesto', 2200);
  const registroDaAlteracao = {};
  for (const empresa of [EMPRESAS.pr, EMPRESAS.cn]) {
    await irAoGerar(page, empresa);
    const resultado = await registrarAlteracao(page, empresa);
    if (resultado.registrou) feito.registrouAlteracao.push(empresa.nome);
    else await nota(page, `A alteração de ${empresa.nome} já estava registrada`, 2000);
    await foto(page, `11a-alteracao-registrada-${empresa.chave}`);

    await irAoQuadro(page, empresa.nome);
    const doQuadro = await estadoDoQuadro(page);
    const ato = acharAtoDaSubida(doQuadro.atos);
    console.log(`      atos em ${empresa.nome}:`, JSON.stringify(doQuadro.atos));
    await rolarAte(page, 'Atos societários', false);
    await foto(page, `11b-carimbo-${empresa.chave}`);
    if (ato?.formalizado && !ato.podeDesfazer) {
      await nota(
        page,
        `Em ${empresa.nome} o ato virou "Formalizado em documento", e o "Desfazer" saiu de cena`,
        3200,
      );
    } else {
      await acusar(
        page,
        `em ${empresa.nome} o ato não passou a "Formalizado em documento" depois de registrar a alteração`,
        4000,
      );
    }
    registroDaAlteracao[empresa.chave] = {
      registrou_nesta_rodada: resultado.registrou,
      estado_do_rail: resultado.estado,
      atos: doQuadro.atos,
      formalizado: !!ato?.formalizado,
      ainda_oferece_desfazer: !!ato?.podeDesfazer,
    };
    await pausa(1800);
  }

  // O status do bem: o outro lado do mesmo gesto. A chave é o `bem_id` do
  // movimento carimbado, e não "os bens aprovados da empresa" — é o que faz a AC
  // que só acrescenta imóveis funcionar sem caso especial.
  const bensDepois = await lerStatusDosBens(page);
  const viraram = bensDepois.filter((b) => {
    const antes = bensAntes.find((a) => a.denominacao === b.denominacao);
    return antes && antes.status !== b.status && /Integralizado/i.test(b.status);
  });
  const aindaElegiveis = bensDepois.filter((b) => /Aprovado/i.test(b.status));
  listar('bens depois do registro', bensDepois.map((b) => `${b.denominacao}: ${b.status}`));
  await foto(page, '11c-status-dos-bens');
  if (viraram.length > 0) {
    await nota(
      page,
      `${viraram.length} bem(ns) passaram a "Integralizado" ao registrar: saem da lista de ` +
        'elegíveis sem ninguém editar cadastro',
      3600,
    );
  } else {
    await nota(
      page,
      'Nenhum bem mudou de status neste registro: as peças desta passada não contaram aporte ' +
        'em bem (a subida foi paga em quotas)',
      3400,
    );
  }

  // E a idempotência, medida pelo caminho natural — o que a corrida de 26/08 não
  // conseguiu fazer, porque o botão de reabrir desaparecia com o carimbo.
  const reabertura = {};
  for (const empresa of [EMPRESAS.pr, EMPRESAS.cn]) {
    await irAoGerar(page, empresa);
    const estado = await estadoDoDocumento(page);
    if (!estado.alteracaoEmCurso && !estado.podeGerarAlteracao) {
      reabertura[empresa.chave] = { caminho: 'ausente', estado };
      await acusar(
        page,
        `em ${empresa.nome} não há como reabrir o assistente depois de registrar`,
        3200,
      );
      continue;
    }
    const eventos = await abrirAssistente(page);
    listar(
      `assistente de ${empresa.nome} depois do carimbo`,
      eventos.map((e) => `[${e.estado}] ${e.rotulo} :: ${e.evidencia}`),
    );
    await foto(page, `11d-reabertura-${empresa.chave}`);
    const confirmados = alteracoes[empresa.chave]?.ligados ?? [];
    const aindaComEvidencia = EVENTOS.filter((ev) => {
      if (!confirmados.some((r) => ev.rotulo.test(r))) return false;
      const naTela = eventos.find((e) => ev.rotulo.test(e.rotulo));
      return !!naTela?.temEvidencia;
    }).map((ev) => ev.chave);
    reabertura[empresa.chave] = {
      caminho: 'existe',
      eventos,
      confirmados_que_seguem_com_evidencia: aindaComEvidencia,
    };
    if (aindaComEvidencia.length === 0) {
      await nota(
        page,
        `Em ${empresa.nome}, nenhum evento formalizado continua com evidência: a próxima ` +
          'alteração começa do zero',
        3400,
      );
    } else {
      await acusar(
        page,
        `em ${empresa.nome}, ${aindaComEvidencia.length} evento(s) formalizado(s) continuam com ` +
          `evidência de pendente: ${aindaComEvidencia.join(', ')}`,
        4000,
      );
    }
    await fecharAssistente(page);
    await pausa(1500);
  }

  anota({
    passo: 11,
    o_que: 'registro na junta: carimbo no ledger, status do bem e idempotência',
    registrou_nesta_rodada: feito.registrouAlteracao,
    por_empresa: registroDaAlteracao,
    bens_antes_do_registro: bensAntes,
    bens_depois_do_registro: bensDepois,
    bens_que_viraram_integralizado: viraram.map((b) => b.denominacao),
    bens_ainda_elegiveis: aindaElegiveis.map((b) => `${b.denominacao}: ${b.status}`),
    reabertura_do_assistente: reabertura,
    nota:
      'as duas marcas do registro nascem no mesmo gesto (D4/D5/D6): o carimbo em ' +
      'movimentacao_quotas.documento_gerado_id e o status do bem indo a Integralizado, pela ' +
      'chave bem_id dos movimentos efetivamente carimbados. A prova de idempotência é o ' +
      'assistente reaberto sem evidência — caminho que só existe desde que o defeito 5 foi ' +
      'corrigido.',
  });
  return { feito, atoDaSubida };
}

// ─── O fecho ───────────────────────────────────────────────────────────────

/**
 * O que a demo desfaz, e o que ela não tem como desfazer.
 *
 * O ato societário da subida é reversível pela UI enquanto NENHUM documento o
 * formalizou. Quem o formaliza é a alteração contratual AO SER REGISTRADA (passo
 * 11): validar não carimba. Então o ato ainda aceita "Desfazer" até o passo 10, e
 * é isso que o fecho faz quando `AC_ATE_PASSO` para até ali.
 *
 * O que não volta em nenhum caso: o quadro de CONSTITUIÇÃO gravado no passo 2
 * (aporte sem ato não aparece no cartão que oferece a reversão) e os contratos
 * sociais registrados nos passos 4 e 5 — que, desde a D3, também CARIMBARAM os
 * aportes de constituição e viraram para 'Integralizado' os bens deles. A partir
 * do passo 11, os carimbos das alterações. Para levar o cenário de volta ao
 * começo é preciso o SQL de operador da seção 7 do doc do roteiro, seguido da
 * migration de seed: a demo não roda SQL.
 */
async function fecho(page, { feito, atoDaSubida }) {
  // Validar não formaliza: o que fecha a porta da reversão é o REGISTRO.
  const podeDesfazerOAto =
    feito.criouAto && feito.registrouAlteracao.length === 0 && ATE_PASSO <= 10;
  let desfezOAto = false;

  if (podeDesfazerOAto) {
    await nota(page, 'Fecho: desfazendo o ato societário que esta passada criou', 2000);
    await irAoQuadro(page, PROPRIETARIA);
    const estado = await estadoDoQuadro(page);
    if (estado.atos.some((a) => a.podeDesfazer)) {
      await confirmando(page, 'Desfazer', 'Desfazer o ato');
      desfezOAto = true;
    }
    await foto(page, 'zz-fecho');
  }

  const resta = [
    feito.gravouQuadro
      ? `o quadro de constituição de ${PROPRIETARIA} continua gravado no livro de movimentos (aporte sem ato: a UI não oferece reversão)`
      : null,
    feito.registrouContratos.length > 0
      ? `os contratos sociais de ${feito.registrouContratos.join(' e ')} continuam com status registrado (e o registro deles carimbou os aportes de constituição), e não há "desregistrar" na tela`
      : null,
    feito.criouAto && !desfezOAto
      ? `o ato "${atoDaSubida?.nome ?? 'da subida'}" continua no livro, nas duas empresas`
      : null,
    feito.validouAlteracao.length > 0
      ? `as alterações contratuais de ${feito.validouAlteracao.join(' e ')} existem como documento próprio`
      : null,
    feito.registrouAlteracao.length > 0
      ? `as alterações de ${feito.registrouAlteracao.join(' e ')} estão REGISTRADAS: os movimentos que elas contam estão carimbados e os bens deles foram para 'Integralizado'`
      : null,
    feito.respondeuAssistente.length > 0
      ? 'as linhas de projeto_flag_valor das respostas do assistente, ancoradas nos documentos registrados (a RLS de DELETE é só de admin)'
      : null,
  ].filter(Boolean);

  anota({
    fecho: true,
    desfez_o_ato: desfezOAto,
    ate_passo: ATE_PASSO,
    escreveu: feito,
    resta_no_banco: resta,
    como_voltar_ao_comeco:
      'o SQL de operador da seção 7 de docs/osg/ensaio-reorganizacao-societaria.md (soltar o ' +
      'carimbo, apagar documento_gerado, apagar ato_societario), seguido de reaplicar ' +
      'supabase/migrations/20260826215500_dev_ensaio_reorganizacao_estado_de_constituicao.sql ' +
      'pelo CLI contra o sandbox. É comando de operador: a demo não roda SQL.',
    divergencias_acusadas: acusacoes,
  });

  console.log('\n      O QUE FICOU NO BANCO:');
  if (resta.length === 0) console.log('        - nada: esta passada não escreveu');
  for (const r of resta) console.log(`        - ${r}`);
  console.log(
    '      Para voltar ao começo: o SQL de operador da seção 7 do doc, e depois reaplicar a\n' +
      '      migration de seed 20260826215500 pelo CLI, contra o sandbox (fora da demo).',
  );
  await nota(
    page,
    desfezOAto
      ? 'Ato desfeito. Os contratos registrados e o quadro de constituição ficam'
      : feito.registrouAlteracao.length > 0
        ? 'Nada a desfazer pela tela: as alterações registradas já formalizaram o ato'
        : 'Nada a desfazer pela tela nesta passada',
    3200,
  );
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
      '  Suba o dev server na branch feat/alteracao-contratual-caminho-b e confira a linha\n' +
        '  "➜ Supabase:" que ele imprime: fora da main o alvo é o sandbox, e é lá que o\n' +
        '  cenário está semeado. Ou aponte AC_URL para onde ele estiver.\n' +
        '  Ver docs/osg/ensaio-reorganizacao-societaria.md.\n',
    );
    process.exitCode = 1;
    return;
  }

  console.log(`Ensaio: reorganização societária (ledger + par de alterações) em ${BASE}`);
  console.log(`Cliente: ${CLIENTE} · PR ${PROPRIETARIA} · CN ${CONTROLADORA}`);
  if (ATE_PASSO < TOTAL) console.log(`Roteiro limitado ao passo ${ATE_PASSO} (AC_ATE_PASSO).`);
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
    const resultado = await ensaio(page);
    await fecho(page, resultado);
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
      video = path.join(OUT, 'ensaio-reorganizacao-societaria.webm');
      fs.renameSync(bruto, video);
    }
    console.log('\n─────────────────────────────────────────────');
    console.log('VÍDEO:    ', video ?? '(não gerado)');
    console.log('FOTOS:    ', path.join(OUT, 'shots'));
    console.log('REGISTRO: ', path.join(OUT, 'registro.json'));
    if (acusacoes.length > 0) {
      console.log(`DIVERGÊNCIAS ACUSADAS: ${acusacoes.length}`);
      for (const a of acusacoes) console.log(`  · ${a}`);
    } else {
      console.log('DIVERGÊNCIAS ACUSADAS: nenhuma');
    }
    console.log('─────────────────────────────────────────────');
    if (falhou) process.exitCode = 1;
  }
};

main();
