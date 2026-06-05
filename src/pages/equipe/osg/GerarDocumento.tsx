import { useEffect, useMemo, useState } from 'react';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileOutput, Copy, Check, Loader2, AlertTriangle, Database, Pencil, Download, Users, Flag } from 'lucide-react';
import {
  avaliarFlags,
  comporBlocos,
  gerarBlocos,
  unirBlocos,
  type Bloco,
  type FlagDeclarativa,
  type Template,
} from '@/lib/templates';
import { baixarDocx } from '@/lib/templates/docx';
import {
  campoDaEntidade,
  camposDaEntidade,
  derivarCampos,
  type CampoEntidade,
  type TipoEntidade,
} from '@/lib/templates/vocabulario';
import { detectarBindingsDeConteudo, labelDoBinding } from '@/lib/templates/binding';
import {
  mapearAdministrador,
  mapearRegistro,
  mapearSocio,
  montarContexto,
  type ItemLista,
} from '@/lib/templates/mapeadores';
import { useModelos, useModeloBlocos } from '@/hooks/useModelosDocumento';
import { useFlags } from '@/hooks/useBibliotecaModelos';
import { useListasDaEmpresa, useRegistrosPorTipo } from '@/hooks/useGeracaoDocumento';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';

const GerarDocumento = () => {
  const { data: modelos = [], isLoading: carregandoModelos } = useModelos();
  const [modeloId, setModeloId] = useState<string | null>(null);
  const { data: docBlocos = [], isLoading: carregandoBlocos } = useModeloBlocos(modeloId);

  // Cliente vem da barra global da área OSG (igual aos cadastros).
  const { clienteId } = useOsgWork();
  const { registros, isFetching: carregandoRegistros } = useRegistrosPorTipo(clienteId);

  // selecao[binding][campoId] = valor; selecaoRegistroId[binding] = id do registro escolhido.
  const [selecao, setSelecao] = useState<Record<string, Record<string, string>>>({});
  const [registroPorBinding, setRegistroPorBinding] = useState<Record<string, string>>({});
  const [valoresLivres, setValoresLivres] = useState<Record<string, string>>({});
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  // Template do engine: blocos do modelo com tipo, obrigatório e flags requeridas.
  const template = useMemo<Template>(() => {
    const blocos = docBlocos
      .filter((b) => b.bloco?.conteudo)
      .map((b) => ({
        id: b.id,
        tipo: b.bloco!.tipo,
        conteudo: b.bloco!.conteudo as string,
        obrigatorio: b.obrigatorio,
        flagsRequeridas: b.bloco!.flags,
      }));
    return { id: modeloId ?? 'novo', nome: 'documento', blocos };
  }, [docBlocos, modeloId]);

  const nomePorBlocoId = useMemo(
    () => new Map(docBlocos.map((b) => [b.id, b.bloco?.nome ?? b.id])),
    [docBlocos],
  );

  // Flags derivadas declarativas avaliadas sobre a empresa selecionada.
  const { data: catalogoFlags = [] } = useFlags();
  const temBlocosComFlags = template.blocos.some((b) => (b.flagsRequeridas ?? []).length > 0);
  const empresaRow = useMemo(
    () => (empresaId ? (registros.pessoa.find((r) => r.id === empresaId)?.row as PessoaRow | undefined) : undefined),
    [registros.pessoa, empresaId],
  );
  const flagsAtivas = useMemo(() => {
    const declarativas: FlagDeclarativa[] = catalogoFlags
      .filter((f) => f.entidade && f.campo && f.valor)
      .map((f) => ({ nome: f.nome, entidade: f.entidade!, campo: f.campo!, valor: f.valor! }));
    return avaliarFlags(declarativas, { empresa: empresaRow });
  }, [catalogoFlags, empresaRow]);

  // Composição: blocos que efetivamente entram com as flags atuais. A detecção
  // de bindings roda SOBRE OS COMPOSTOS — bloco excluído não pede seleção.
  const blocosCompostos = useMemo(() => comporBlocos(template, flagsAtivas), [template, flagsAtivas]);
  const blocosExcluidos = useMemo(
    () => template.blocos.filter((b) => !blocosCompostos.includes(b)),
    [template, blocosCompostos],
  );

  const { bindings, listas, desconhecidos, secoesDesconhecidas, campos: placeholders } = useMemo(
    () => detectarBindingsDeConteudo(blocosCompostos.map((b) => b.conteudo).join(' ')),
    [blocosCompostos],
  );

  // Listas relacionais (sócios/administradores) carregam da empresa escolhida;
  // a empresa também alimenta as flags, então o card aparece em ambos os casos.
  const usaListas = listas.length > 0;
  const precisaEmpresa = usaListas || temBlocosComFlags;
  const { socios, administradores, isFetching: carregandoListas } = useListasDaEmpresa(
    usaListas ? empresaId : null,
  );

  const itensPorLista = useMemo<Record<string, ItemLista[]>>(
    () => ({
      socios: socios.map(mapearSocio),
      administradores: administradores.map(mapearAdministrador),
    }),
    [socios, administradores],
  );

  // Campos editáveis (base, não-derivados) de cada binding, conforme o que o modelo referencia.
  const camposPorBinding = useMemo<Record<string, CampoEntidade[]>>(() => {
    const refs = new Map<string, Set<string>>();
    for (const ph of placeholders) {
      const ponto = ph.indexOf('.');
      if (ponto < 0) continue;
      const nome = ph.slice(0, ponto);
      const campoId = ph.slice(ponto + 1);
      if (!bindings.some((b) => b.nome === nome)) continue;
      if (!refs.has(nome)) refs.set(nome, new Set());
      refs.get(nome)!.add(campoId);
    }
    const out: Record<string, CampoEntidade[]> = {};
    for (const b of bindings) {
      const referenciados = refs.get(b.nome) ?? new Set<string>();
      const vistos = new Set<string>();
      const lista: CampoEntidade[] = [];
      const adicionar = (c: CampoEntidade) => {
        if (!vistos.has(c.id)) {
          vistos.add(c.id);
          lista.push(c);
        }
      };
      for (const campoId of referenciados) {
        const campo = campoDaEntidade(b.tipo, campoId);
        if (campo?.derivadoDe) {
          const base = campoDaEntidade(b.tipo, campo.derivadoDe);
          if (base) adicionar(base);
        } else if (campo) {
          adicionar(campo);
        } else {
          // Campo referenciado fora do catálogo: vira input de texto livre sob o binding.
          adicionar({ id: campoId, label: campoId, tipo: 'texto' });
        }
      }
      // Ordena conforme o catálogo da entidade (campos fora dele vão ao fim).
      const ordem = camposDaEntidade(b.tipo).map((c) => c.id);
      lista.sort((a, z) => {
        const ia = ordem.indexOf(a.id);
        const iz = ordem.indexOf(z.id);
        return (ia < 0 ? Infinity : ia) - (iz < 0 ? Infinity : iz);
      });
      out[b.nome] = lista;
    }
    return out;
  }, [placeholders, bindings]);

  // Trocar de modelo ou de cliente zera as seleções.
  useEffect(() => {
    setSelecao({});
    setRegistroPorBinding({});
    setValoresLivres({});
    setEmpresaId(null);
  }, [modeloId, clienteId]);

  const escolherRegistro = (nome: string, tipo: TipoEntidade, registroId: string) => {
    const reg = registros[tipo].find((r) => r.id === registroId);
    if (!reg) return;
    setRegistroPorBinding((prev) => ({ ...prev, [nome]: registroId }));
    setSelecao((prev) => ({ ...prev, [nome]: mapearRegistro(tipo, reg.row) }));
  };

  const editarCampo = (nome: string, tipo: TipoEntidade, campoId: string, valor: string) => {
    setSelecao((prev) => {
      const atual = { ...(prev[nome] ?? {}), [campoId]: valor };
      return { ...prev, [nome]: derivarCampos(tipo, atual) };
    });
  };

  const resultado = useMemo<
    { blocos: Bloco[]; texto: string; erro: null } | { blocos: null; texto: null; erro: string }
  >(() => {
    if (template.blocos.length === 0) return { blocos: [], texto: '', erro: null };
    try {
      // Texto livre: todo placeholder sem binding resolve em branco quando vazio,
      // para a prévia não travar antes de preencher (diferente dos bindings, que
      // exigem seleção de registro).
      const livres = Object.fromEntries(desconhecidos.map((ph) => [ph, valoresLivres[ph] ?? '']));
      // Seções desconhecidas resolvem como '' (falsy): o trecho sai da prévia sem travar.
      for (const nome of secoesDesconhecidas) livres[nome] = livres[nome] ?? '';
      const ctx = montarContexto(bindings, selecao, livres, itensPorLista, listas);
      const blocos = gerarBlocos(template, ctx, flagsAtivas);
      return { blocos, texto: unirBlocos(blocos), erro: null };
    } catch (e) {
      return { blocos: null, texto: null, erro: e instanceof Error ? e.message : String(e) };
    }
  }, [template, bindings, selecao, valoresLivres, desconhecidos, secoesDesconhecidas, itensPorLista, listas, flagsAtivas]);

  const copiar = async () => {
    if (!resultado.texto) return;
    await navigator.clipboard.writeText(resultado.texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  const nomeModelo = useMemo(
    () => modelos.find((m) => m.id === modeloId)?.nome ?? 'documento',
    [modelos, modeloId],
  );

  const [baixando, setBaixando] = useState(false);
  const baixar = async () => {
    if (!resultado.blocos?.length) return;
    setBaixando(true);
    try {
      await baixarDocx(nomeModelo, resultado.blocos);
    } finally {
      setBaixando(false);
    }
  };

  // Bindings ainda não preenchidos (sem registro escolhido e sem edição manual):
  // a prévia só resolve depois de ligar um registro a cada entidade.
  const bindingsPendentes = bindings.filter(
    (b) => !registroPorBinding[b.nome] && Object.keys(selecao[b.nome] ?? {}).length === 0,
  );
  const listasPendentes = precisaEmpresa && !empresaId;

  // Empresas (PJ) do cliente, para a fonte das listas relacionais.
  const empresas = useMemo(
    () => registros.pessoa.filter((r) => (r.row as PessoaRow).tipo_pessoa === 'PJ'),
    [registros.pessoa],
  );

  const totalCampos =
    bindings.reduce((acc, b) => acc + (camposPorBinding[b.nome]?.length ?? 0), 0) + desconhecidos.length;

  return (
    <OsgLayout
      title="Gerar Documento"
      subtitle="Escolha um modelo, ligue as entidades do cliente e visualize o documento gerado"
    >
      <div className="space-y-4">
        <Card>
          <CardContent className="py-4 space-y-3">
            <div className="space-y-1.5 sm:max-w-md">
              <Label className="text-xs font-semibold text-muted-foreground">Modelo de documento</Label>
              <Select value={modeloId ?? undefined} onValueChange={setModeloId}>
                <SelectTrigger>
                  <SelectValue placeholder={carregandoModelos ? 'Carregando…' : 'Selecione um modelo'} />
                </SelectTrigger>
                <SelectContent>
                  {modelos.filter((m) => m.ativo).map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nome} {m.num_blocos > 0 ? `(${m.num_blocos} blocos)` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {carregandoRegistros && (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" /> Carregando registros do cliente…
              </span>
            )}
          </CardContent>
        </Card>

        {!modeloId ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <FileOutput className="h-8 w-8 mx-auto mb-3 opacity-40" />
              Selecione um modelo para começar.
            </CardContent>
          </Card>
        ) : carregandoBlocos ? (
          <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando modelo…
          </div>
        ) : template.blocos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Este modelo ainda não tem blocos com conteúdo. Monte a sequência em "Montagem de Documentos".
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Bindings + formulário dinâmico */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Dados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {bindings.length === 0 && desconhecidos.length === 0 && !precisaEmpresa && (
                  <p className="text-sm text-muted-foreground">Este modelo não usa variáveis.</p>
                )}

                {precisaEmpresa && (
                  <div className="space-y-3 rounded-lg border border-border/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-osg-700 flex items-center gap-1.5">
                        <Users className="h-4 w-4" /> Empresa
                        <span className="font-normal text-muted-foreground">
                          ({[usaListas ? 'listas' : '', temBlocosComFlags ? 'flags' : ''].filter(Boolean).join(' + ')})
                        </span>
                      </span>
                      <code className="text-[10px] text-muted-foreground">
                        {listas.map((l) => `#${l.nome}`).join(' ')}
                      </code>
                    </div>
                    <Select
                      value={empresaId ?? undefined}
                      onValueChange={setEmpresaId}
                      disabled={!clienteId}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !clienteId
                              ? 'Selecione um cliente na barra acima'
                              : empresas.length === 0
                                ? 'Nenhuma PJ cadastrada para o cliente'
                                : 'Selecione a empresa'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {empresas.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {empresaId && temBlocosComFlags && (
                      <div className="flex items-start gap-1.5 flex-wrap text-xs">
                        <Flag className="h-3 w-3 mt-0.5 text-osg-600 shrink-0" />
                        {flagsAtivas.length > 0 ? (
                          flagsAtivas.map((f) => (
                            <Badge key={f} className="text-[10px] bg-osg-100 text-osg-700 hover:bg-osg-100">
                              {f}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground">
                            Nenhuma flag ativa para esta empresa (verifique o tipo da empresa no cadastro).
                          </span>
                        )}
                        {blocosExcluidos.length > 0 && (
                          <span className="text-muted-foreground basis-full">
                            {blocosExcluidos.length} bloco{blocosExcluidos.length > 1 ? 's' : ''} fora da
                            composição: {blocosExcluidos.map((b) => nomePorBlocoId.get(b.id)).join(', ')}
                          </span>
                        )}
                      </div>
                    )}
                    {empresaId && usaListas && carregandoListas && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin" /> Carregando sócios e administradores…
                      </span>
                    )}
                    {empresaId && !carregandoListas && (
                      <div className="space-y-2">
                        {listas.some((l) => l.nome === 'socios') && (
                          <div className="text-xs">
                            <span className="font-semibold text-muted-foreground">
                              Sócios ({socios.length})
                            </span>
                            {socios.length === 0 ? (
                              <p className="text-amber-700 mt-0.5">
                                Nenhum sócio no Quadro Societário desta empresa.
                              </p>
                            ) : (
                              <ul className="mt-0.5 space-y-0.5">
                                {socios.map((s, i) => (
                                  <li key={s.pessoa.id} className="flex items-center gap-1.5 text-slate-700">
                                    <span className="text-muted-foreground">{i + 1}.</span>
                                    {s.pessoa.denominacao}
                                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                                      {s.pessoa.tipo_pessoa}
                                    </Badge>
                                    {s.quotas != null && (
                                      <span className="text-muted-foreground">{s.quotas} quotas</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                        {listas.some((l) => l.nome === 'administradores') && (
                          <div className="text-xs">
                            <span className="font-semibold text-muted-foreground">
                              Administradores ({administradores.length})
                            </span>
                            {administradores.length === 0 ? (
                              <p className="text-amber-700 mt-0.5">
                                Nenhum administrador cadastrado para esta empresa.
                              </p>
                            ) : (
                              <ul className="mt-0.5 space-y-0.5">
                                {administradores.map((a, i) => (
                                  <li key={a.pessoa.id} className="flex items-center gap-1.5 text-slate-700">
                                    <span className="text-muted-foreground">{i + 1}.</span>
                                    {a.pessoa.denominacao}
                                    {a.cargo && <span className="text-muted-foreground">{a.cargo}</span>}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                        <span className="text-[11px] text-osg-700 flex items-center gap-1.5">
                          <Database className="h-3 w-3" /> Preenchido do cadastro, na ordem do registro
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {bindings.map((b) => {
                  const precisaCliente = b.tipo !== 'cartorio' && !clienteId;
                  return (
                    <div key={b.nome} className="space-y-3 rounded-lg border border-border/60 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-osg-700">{labelDoBinding(b.nome)}</span>
                        <code className="text-[10px] text-muted-foreground">{b.nome}</code>
                      </div>
                      <Select
                        value={registroPorBinding[b.nome] ?? undefined}
                        onValueChange={(id) => escolherRegistro(b.nome, b.tipo, id)}
                        disabled={precisaCliente}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              precisaCliente
                                ? 'Selecione um cliente na barra acima'
                                : registros[b.tipo].length === 0
                                  ? 'Nenhum registro cadastrado'
                                  : 'Selecione um registro'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {registros[b.tipo].map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {registroPorBinding[b.nome] && (
                        <span className="text-xs text-osg-700 flex items-center gap-1.5">
                          <Database className="h-3 w-3" /> Preenchido do cadastro
                          <span className="text-muted-foreground inline-flex items-center gap-1">
                            <Pencil className="h-3 w-3" /> editável abaixo
                          </span>
                        </span>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(camposPorBinding[b.nome] ?? []).map((c) => {
                          const valor = selecao[b.nome]?.[c.id] ?? '';
                          const onChange = (v: string) => editarCampo(b.nome, b.tipo, c.id, v);
                          return (
                            <div key={c.id} className={c.tipo === 'textarea' ? 'sm:col-span-2 space-y-1.5' : 'space-y-1.5'}>
                              <Label className="text-xs font-semibold text-muted-foreground">{c.label}</Label>
                              {c.tipo === 'textarea' ? (
                                <Textarea value={valor} onChange={(e) => onChange(e.target.value)} rows={4} className="text-sm" />
                              ) : (
                                <Input value={valor} onChange={(e) => onChange(e.target.value)} className="text-sm" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {secoesDesconhecidas.length > 0 && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50/60 p-3 text-xs text-amber-800">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      Seções desconhecidas (não são listas nem condicionais do catálogo), removidas da prévia:{' '}
                      <code>{secoesDesconhecidas.map((s) => `#${s}`).join(', ')}</code>.
                    </span>
                  </div>
                )}

                {desconhecidos.length > 0 && (
                  <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50/60 p-3">
                    <div className="flex items-start gap-2 text-xs text-amber-800">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>
                        Variáveis sem binding (modelo legado ou papel desconhecido), tratadas como texto livre:{' '}
                        <code>{desconhecidos.join(', ')}</code>.
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {desconhecidos.map((ph) => (
                        <div key={ph} className="space-y-1.5">
                          <Label className="text-xs font-semibold text-muted-foreground">{ph}</Label>
                          <Input
                            value={valoresLivres[ph] ?? ''}
                            onChange={(e) => setValoresLivres((prev) => ({ ...prev, [ph]: e.target.value }))}
                            className="text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Documento gerado */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileOutput className="h-4 w-4 text-osg-600" /> Documento gerado
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={copiar} disabled={!resultado.texto}>
                    {copiado ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
                    {copiado ? 'Copiado' : 'Copiar'}
                  </Button>
                  <Button size="sm" onClick={baixar} disabled={!resultado.texto || baixando}>
                    {baixando ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
                    Baixar .docx
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {bindingsPendentes.length > 0 || listasPendentes ? (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Database className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      {[
                        listasPendentes ? 'Selecione a empresa' : '',
                        bindingsPendentes.length > 0
                          ? `Selecione um registro para ${bindingsPendentes.map((b) => labelDoBinding(b.nome)).join(', ')}`
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' e ')}{' '}
                      para ver o documento.
                    </span>
                  </div>
                ) : resultado.erro ? (
                  <div className="flex items-start gap-2 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{resultado.erro}</span>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-justify text-slate-800 whitespace-pre-wrap">
                    {resultado.texto}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-1.5 flex-wrap border-t pt-2">
                  <Badge variant="outline" className="text-[10px]">
                    {blocosCompostos.length === template.blocos.length
                      ? `${template.blocos.length} blocos`
                      : `${blocosCompostos.length}/${template.blocos.length} blocos (flags)`}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">{bindings.length} entidades</Badge>
                  {usaListas && (
                    <Badge variant="outline" className="text-[10px]">
                      {listas.map((l) => l.nome).join(' + ')}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px]">{totalCampos} campos</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </OsgLayout>
  );
};

export default GerarDocumento;
