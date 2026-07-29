#!/usr/bin/env python3
"""
record_gif.py — grava um GIF de um fluxo do app PSA (localhost) dirigindo o
navegador com Playwright a partir de um "storyboard" JSON.

Roda em qualquer SO (Windows/macOS/Linux): usa apenas stdlib + Playwright +
Pillow. Nenhum caminho fixo — o token vem por --session-file ou pela env
PSA_GIF_SESSION; a saida vai para --out.

Filosofia de seguranca (encodada no proprio script, nao so' na prosa):
  * O token do usuario e' um SEGREDO e (neste projeto) e' de um usuario ADMIN.
    Injetado no navegador, o app renderiza com acesso total. Qualquer clique que
    salva/confirma/exclui GRAVA NO BANCO com privilegio de admin (passa RLS).
  * Passos que mudam estado no banco DEVEM ser marcados "mutates": true no
    storyboard. O script SE RECUSA a executa-los sem a flag --confirm-writes.
    (assim o agente e' obrigado a ter pedido consentimento antes.)
  * ALEM do gate, uma HEURISTICA alerta quando um passo click/press parece
    gravar (bate em "Salvar/Confirmar/Excluir/Enviar"...) mas NAO foi marcado
    mutates — rede de seguranca contra o esquecimento. Ela avisa, nao bloqueia.
  * Token expirado => PARA (nao "grava com o que tem").
  * Sem fallback silencioso: passo que falha estoura com o indice/label do passo.

Uso (Windows PowerShell):
  python scripts\\record_gif.py --storyboard sb.json --session-file $env:TEMP\\psa_tok.txt --dry-run
Uso (macOS/Linux):
  python3 scripts/record_gif.py --storyboard sb.json --session-file "$TMPDIR/psa_tok.txt" --dry-run

  # gravar (so' passos read-only):
  python3 scripts/record_gif.py --storyboard sb.json --session-file tok.txt --out ./out

  # gravar incluindo passos que gravam no banco (apos consentimento explicito):
  python3 scripts/record_gif.py --storyboard sb.json --session-file tok.txt --out ./out --confirm-writes

O token vem de --session-file (arquivo com o JWT cru OU o valor completo do
localStorage 'sb-...-auth-token') ou da env PSA_GIF_SESSION. NUNCA passe o token
inline na linha de comando (vaza no historico/lista de processos).
"""
import argparse, asyncio, base64, json, os, re, shutil, subprocess, sys, time
from pathlib import Path
from urllib.parse import urlparse

# Consoles Windows (cp1252) quebram em acentos/simbolos. Nao deixe a saida derrubar
# a gravacao por um caractere.
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


# ----------------------------------------------------------------------------- token
def _b64url(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def decode_jwt(jwt: str) -> dict:
    parts = jwt.strip().split(".")
    if len(parts) != 3:
        raise ValueError("JWT malformado (esperado header.payload.signature)")
    return json.loads(_b64url(parts[1]))


def ref_from_url(url: str) -> str:
    # https://<ref>.supabase.co...  -> <ref>
    return url.split("//", 1)[1].split(".", 1)[0]


def load_session(raw: str, ref_hint):
    """Aceita o JWT cru OU o valor completo do localStorage. Retorna
    (storage_value:str, storage_key:str, exp:int|None, user_email:str|None, ref:str)."""
    raw = raw.strip()
    stored = None
    jwt = None
    try:  # valor completo do localStorage?
        obj = json.loads(raw)
        if isinstance(obj, dict) and obj.get("access_token"):
            stored, jwt = obj, obj["access_token"]
        elif isinstance(obj, dict) and obj.get("currentSession", {}).get("access_token"):
            stored, jwt = obj, obj["currentSession"]["access_token"]  # formato antigo
    except json.JSONDecodeError:
        jwt = raw  # JWT cru

    payload = decode_jwt(jwt)
    exp = payload.get("exp")
    iss = payload.get("iss", "")
    ref = ref_hint or (ref_from_url(iss) if iss.startswith("http") else None)
    if not ref:
        raise ValueError(
            "Nao consegui derivar o project ref. Passe --supabase-ref ou "
            "defina 'supabase_ref' no storyboard."
        )
    key = f"sb-{ref}-auth-token"

    if stored is None:  # so' o JWT: monta uma sessao minima
        now = int(time.time())
        stored = {
            "access_token": jwt,
            "token_type": "bearer",
            "expires_at": exp,
            "expires_in": max(0, (exp or now) - now),
            "refresh_token": "",  # desconhecido; ok p/ gravacao curta
            "user": {
                "id": payload.get("sub"),
                "email": payload.get("email"),
                "role": payload.get("role", "authenticated"),
                "aud": payload.get("aud", "authenticated"),
                "app_metadata": {}, "user_metadata": {},
            },
        }
    return json.dumps(stored), key, exp, (stored.get("user") or {}).get("email"), ref


# ----------------------------------------------------------- heuristica de escrita
# Verbos que, num botao/link, quase sempre significam gravacao. NAO e' o gate
# (o gate e' o campo "mutates"); e' um alerta para pegar o passo que o autor
# esqueceu de marcar. Falso-positivo e' aceitavel: so' avisa, nunca bloqueia.
WRITE_HINTS = re.compile(
    r"\b(salvar|salva|confirmar|confirma|excluir|exclui|apagar|apaga|deletar|deleta|"
    r"remover|remove|enviar|envia|publicar|publica|criar|cria|adicionar|adiciona|"
    r"gravar|grava|aprovar|aprova|rejeitar|rejeita|finalizar|finaliza|arquivar|"
    r"cadastrar|cadastra|save|submit|confirm|create|delete|publish|approve)\b",
    re.IGNORECASE,
)


def suspicious_writes(steps):
    """Passos click/press que PARECEM gravar mas nao estao marcados mutates."""
    out = []
    for i, s in enumerate(steps):
        if s.get("mutates") or s.get("action") not in ("click", "press"):
            continue
        hay = " ".join(str(s.get(k, "")) for k in ("name", "text", "label", "key"))
        m = WRITE_HINTS.search(hay)
        if m:
            out.append((i, s.get("label", s.get("action")), m.group(0)))
    return out


# ----------------------------------------------------------------------------- passos
async def resolve(page, step):
    """Resolve um locator a partir de {selector|text|role+name}."""
    if "role" in step and "name" in step:
        return page.get_by_role(step["role"], name=step["name"]).first
    if "text" in step:
        loc = page.get_by_text(step["text"], exact=step.get("exact", False))
        return (loc.last if step.get("which") == "last" else loc.first)
    if "selector" in step:
        loc = page.locator(step["selector"])
        return (loc.last if step.get("which") == "last" else loc.first)
    raise ValueError("passo sem alvo (selector|text|role+name)")


CURSOR_JS = """
if(!document.getElementById('__gifcur')){
  const c=document.createElement('div');c.id='__gifcur';
  c.style.cssText='position:fixed;z-index:2147483647;width:22px;height:22px;'+
    'margin:-6px 0 0 -6px;pointer-events:none;transition:all .18s ease;'+
    'background:rgba(16,185,129,.35);border:2px solid #10b981;border-radius:50%;'+
    'box-shadow:0 0 0 3px rgba(16,185,129,.15);left:-40px;top:-40px;';
  document.body.appendChild(c);
}
"""


async def move_cursor(page, loc):
    try:
        box = await loc.bounding_box()
        if box:
            x = box["x"] + box["width"] / 2
            y = box["y"] + box["height"] / 2
            await page.evaluate(
                "([x,y])=>{const c=document.getElementById('__gifcur');"
                "if(c){c.style.left=x+'px';c.style.top=y+'px';}}", [x, y])
            await page.wait_for_timeout(200)
    except Exception:
        pass


async def run_steps(page, steps, out_dir, fps, hold_default, cursor):
    counter = {"n": 0}

    async def snap(hold):
        for _ in range(max(1, hold)):
            counter["n"] += 1
            await page.screenshot(path=str(out_dir / f"f_{counter['n']:05d}.png"))
            await page.wait_for_timeout(int(1000 / fps))

    for i, step in enumerate(steps):
        act = step.get("action")
        label = step.get("label", act)
        hold = step.get("hold_frames", hold_default)
        try:
            if act == "goto":
                url = step["url"]
                await page.goto(url, wait_until=step.get("wait_until", "networkidle"))
                await page.wait_for_timeout(step.get("settle_ms", 1200))
            elif act == "wait":
                await page.wait_for_timeout(step.get("ms", 800))
            elif act == "scroll":
                if step.get("selector") or step.get("dialog"):
                    sel = step.get("selector", "[role=dialog]")
                    await page.evaluate(
                        f"const e=document.querySelector({json.dumps(sel)});"
                        f"if(e)e.scrollTop={step.get('to', 9999)};")
                else:
                    await page.mouse.wheel(0, step.get("dy", 600))
                await page.wait_for_timeout(300)
            elif act in ("click", "hover", "fill", "type", "press"):
                if act == "press":
                    await page.keyboard.press(step["key"])
                else:
                    loc = await resolve(page, step)
                    if cursor:
                        await move_cursor(page, loc)
                    if act == "click":
                        await loc.click()
                    elif act == "hover":
                        await loc.hover()
                    elif act == "fill":
                        await loc.fill(step["value"])
                    elif act == "type":
                        await loc.click()
                        await page.keyboard.type(step["value"], delay=step.get("delay", 25))
                await page.wait_for_timeout(step.get("settle_ms", 700))
            elif act == "hold":
                pass  # so' captura frames abaixo
            else:
                raise ValueError(f"acao desconhecida: {act!r}")
            await snap(hold)
        except Exception as e:
            raise RuntimeError(f"passo #{i} ({label!r}, action={act}) FALHOU: {e}") from e
    return counter["n"]


# ----------------------------------------------------------------------------- gif
def build_gif(frames_dir: Path, out_gif: Path, fps: int, width: int):
    pngs = sorted(frames_dir.glob("f_*.png"))
    if not pngs:
        raise RuntimeError("nenhum frame capturado")
    if shutil.which("gifski"):
        subprocess.run(["gifski", "--fps", str(fps), "--width", str(width),
                        "-o", str(out_gif)] + [str(p) for p in pngs], check=True)
    elif shutil.which("ffmpeg"):
        vf = (f"scale={width}:-1:flags=lanczos,split[s0][s1];"
              "[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:"
              "bayer_scale=5:diff_mode=rectangle")
        subprocess.run(["ffmpeg", "-y", "-framerate", str(fps), "-i",
                        str(frames_dir / "f_%05d.png"), "-vf", vf, "-loop", "0",
                        str(out_gif)], check=True)
    else:  # fallback puro-Python (zero binarios externos)
        try:
            from PIL import Image
        except ImportError:
            raise RuntimeError(
                "sem gifski/ffmpeg no PATH e Pillow ausente. "
                "Instale: `pip install pillow` (ou `pip install -r requirements.txt`).")
        frames = []
        for p in pngs:
            im = Image.open(p).convert("RGB")
            if im.width != width:
                im = im.resize((width, round(im.height * width / im.width)))
            frames.append(im)
        frames[0].save(out_gif, save_all=True, append_images=frames[1:],
                       duration=int(1000 / fps), loop=0, optimize=True, disposal=2)


# ----------------------------------------------------------------------------- main
async def record(sb, storage_value, storage_key, out_dir, args):
    try:
        from playwright.async_api import async_playwright
    except ImportError as e:
        raise RuntimeError(
            "Playwright nao instalado. Rode:\n"
            "  pip install -r requirements.txt   (ou: pip install playwright pillow)\n"
            "  python -m playwright install chromium") from e
    frames = out_dir / "frames"
    frames.mkdir(parents=True, exist_ok=True)
    for old in frames.glob("f_*.png"):
        old.unlink()
    vp = sb.get("viewport", {"width": 1280, "height": 800})
    async with async_playwright() as pw:
        try:
            browser = await pw.chromium.launch(headless=not args.headed)
        except Exception as e:
            raise RuntimeError(
                "Falha ao abrir o Chromium do Playwright. Provavelmente o browser "
                "nao esta instalado. Rode:\n  python -m playwright install chromium\n"
                f"(erro original: {e})") from e
        # reduced_motion=no-preference: sem isso o headless pode herdar
        # "prefers-reduced-motion: reduce" e DESLIGAR animacoes CSS — um loader
        # animado viraria um icone estatico e o GIF nao mostraria a feature.
        ctx = await browser.new_context(
            viewport=vp,
            device_scale_factor=sb.get("device_scale_factor", 1),
            reduced_motion="no-preference",
        )
        # delay_routes: atrasa as RESPOSTAS de requests cujo URL contem um padrao
        # (ex.: "/rest/v1/") para SEGURAR um estado transitorio de loading tempo
        # suficiente para capturar. Nao muda dado nenhum — so' adia a resposta
        # real; a app renderiza o mesmo estado de carregamento que renderiza em
        # producao, apenas por mais tempo. (Combine com wait_until "domcontentloaded"
        # no goto, senao o proprio goto espera a resposta atrasada.)
        delay_routes = sb.get("delay_routes") or []
        if delay_routes:
            async def _delay_handler(route):
                url = route.request.url
                for rule in delay_routes:
                    pat = rule.get("url_contains")
                    if pat and pat in url:
                        await asyncio.sleep(max(0, rule.get("ms", 3000)) / 1000)
                        break
                await route.continue_()
            await ctx.route("**/*", _delay_handler)
        page = await ctx.new_page()
        await page.goto(sb["base_url"])
        await page.evaluate(
            "([k,v])=>window.localStorage.setItem(k,v)", [storage_key, storage_value])
        if not args.no_cursor:
            await page.add_init_script(CURSOR_JS)
        n = await run_steps(page, sb["steps"], frames, sb.get("fps", 5),
                            sb.get("hold_frames", 6), not args.no_cursor)
        await browser.close()
    return n, frames


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--storyboard", required=True)
    ap.add_argument("--session-file", help="arquivo com JWT cru ou valor do localStorage")
    ap.add_argument("--out", default="./out")
    ap.add_argument("--supabase-ref")
    ap.add_argument("--confirm-writes", action="store_true",
                    help="autoriza executar passos marcados 'mutates': true")
    ap.add_argument("--dry-run", action="store_true",
                    help="valida storyboard+token e lista passos que gravam; nao abre navegador")
    ap.add_argument("--headed", action="store_true")
    ap.add_argument("--no-cursor", action="store_true")
    a = ap.parse_args()

    sb = json.loads(Path(a.storyboard).read_text(encoding="utf-8"))

    # --- token
    raw = None
    if a.session_file:
        raw = Path(a.session_file).read_text(encoding="utf-8")
    elif os.environ.get("PSA_GIF_SESSION"):
        raw = os.environ["PSA_GIF_SESSION"]
    else:
        sys.exit("ERRO: forneca o token via --session-file ou env PSA_GIF_SESSION.")
    storage_value, storage_key, exp, email, ref = load_session(
        raw, a.supabase_ref or sb.get("supabase_ref"))

    now = int(time.time())
    if exp and exp <= now + 30:
        sys.exit(f"ERRO: token EXPIRADO/expirando (exp={exp}, agora={now}). "
                 "Peca um token novo - nao grave com token vencido.")

    host = urlparse(sb.get("base_url", "")).netloc or sb.get("base_url", "?")
    print(f"[token] usuario={email or '?'}  validade~{(exp-now)//60 if exp else '?'} min")
    print(f"[alvo]  app={host}  supabase_ref={ref}  (confira o AMBIENTE antes de gravar/escrever)")

    # --- gate de escrita no banco (declarado) + heuristica (esquecido)
    muta = [(i, s.get("label", s.get("action")))
            for i, s in enumerate(sb["steps"]) if s.get("mutates")]
    susp = suspicious_writes(sb["steps"])

    if susp:
        print("\n[ALERTA HEURISTICO] passos click/press que PARECEM gravar mas NAO estao "
              "marcados 'mutates':")
        for i, lbl, hit in susp:
            print(f"     #{i}  {lbl!r}  (casou com \"{hit}\")")
        print("     -> Se algum GRAVA no banco, adicione \"mutates\": true e trate como escrita.")
        print("     -> Se e' read-only (ex.: so' abre um dialogo/menu), pode ignorar. A "
              "heuristica NAO bloqueia.")

    if muta:
        print("\n[AVISO] PASSOS QUE GRAVAM NO BANCO (token e' admin -> passam RLS):")
        for i, lbl in muta:
            print(f"     #{i}  {lbl}")
        if not a.confirm_writes and not a.dry_run:
            sys.exit("\nBLOQUEADO: ha passos que alteram o banco. Confirme com o "
                     "usuario e rode de novo com --confirm-writes (ou remova/limite "
                     "os passos para gravar so' ate' o dialogo de confirmacao).")
    else:
        print("[ok] nenhum passo marcado 'mutates' (gravacao read-only).")

    if a.dry_run:
        print(f"\n[dry-run] storyboard OK: {len(sb['steps'])} passos, "
              f"{len(muta)} marcados mutates, {len(susp)} suspeitos pela heuristica. "
              "Nada foi executado.")
        return

    out_dir = Path(a.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    n, frames = asyncio.run(record(sb, storage_value, storage_key, out_dir, a))
    gif = out_dir / sb.get("gif_name", "output.gif")
    build_gif(frames, gif, sb.get("fps", 5), sb.get("width", 960))
    size = gif.stat().st_size / 1024
    print(f"\n[OK] GIF: {gif}  ({n} frames, {size:.0f} KB)")
    if muta:
        print("[AVISO] Passos de escrita foram executados. Verifique o estado no banco "
              "e reverta se era demo (snapshot -> restore por id). NUNCA desligue triggers.")


if __name__ == "__main__":
    main()
