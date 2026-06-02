import { useEffect, useMemo, useState } from 'react';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileOutput, Copy, Check, Loader2, AlertTriangle, Database, Pencil } from 'lucide-react';
import { gerarDocumento, extrairCampos, type Template } from '@/lib/templates';
import { camposNecessarios, montarContextoDeEntradas } from '@/lib/templates/vocabulario';
import { useModelos, useModeloBlocos } from '@/hooks/useModelosDocumento';
import { useEntradasMatricula } from '@/hooks/useGeracaoDocumento';
import { useAllMatriculas } from '@/hooks/useDiagnosticoPatrimonial';
import { useOsgWork } from '@/contexts/OsgWorkContext';

// Preenchimento de exemplo (Mat. 9.617) para os campos do bloco de matrícula.
const EXEMPLO: Record<string, string> = {
  areaHa: '396.4',
  valorContabil: '558413.55',
  livro: '02',
  folha: '01',
  denominacao: 'Fazenda Tarumã',
  proprietario: 'Jose Eduardo de Macedo Soares Junior',
  municipio: 'Lucas do Rio Verde',
  uf: 'Mato Grosso',
  matricula: '9.617',
  cartorio: 'Cartório de 1° Ofício de Imóveis',
  comarca: 'Lucas do Rio Verde',
  ufCartorio: 'Mato Grosso',
  ccir: '901.032.174.190-6',
  confrontacoes:
    '01-02 com 758,00 metros, rumo 50°26\'17"SE. Rodovia MT 338; 02-03 com 2.996,00 metros. Diversos rumos. ' +
    'Estrada e Lotes LL e KK; 03-04 com 248,00 metros, rumo 43°57\'30" NW. Linha seca e Cascalheira',
};

const GerarDocumento = () => {
  const { data: modelos = [], isLoading: carregandoModelos } = useModelos();
  const [modeloId, setModeloId] = useState<string | null>(null);
  const { data: docBlocos = [], isLoading: carregandoBlocos } = useModeloBlocos(modeloId);

  // Cliente vem da barra global da área OSG (igual aos cadastros).
  const { clienteId } = useOsgWork();
  const [matriculaId, setMatriculaId] = useState<string | null>(null);
  const { data: todasMatriculas = [] } = useAllMatriculas();
  const { data: entradasMatricula, isFetching: carregandoEntradas } = useEntradasMatricula(matriculaId);

  const matriculasDoCliente = useMemo(
    () =>
      clienteId
        ? todasMatriculas.filter(
            (m) => m.bem_cliente_id === clienteId || m.titular_cliente_ids.includes(clienteId),
          )
        : [],
    [todasMatriculas, clienteId],
  );

  const [valores, setValores] = useState<Record<string, string>>({});
  const [copiado, setCopiado] = useState(false);

  // Ao escolher uma matrícula, substitui os campos pelos dados dela (editáveis depois).
  useEffect(() => {
    if (entradasMatricula) setValores(entradasMatricula);
  }, [entradasMatricula]);

  // Trocar de cliente (barra global) zera a matrícula escolhida.
  useEffect(() => setMatriculaId(null), [clienteId]);

  // Template do engine + placeholders detectados a partir dos blocos do modelo.
  const { template, placeholders } = useMemo(() => {
    const blocos = docBlocos
      .filter((b) => b.bloco?.conteudo)
      .map((b) => ({ id: b.id, conteudo: b.bloco!.conteudo as string, obrigatorio: b.obrigatorio }));
    const tpl: Template = { id: modeloId ?? 'novo', nome: 'documento', blocos };
    const phs = extrairCampos(blocos.map((b) => b.conteudo).join(' '));
    return { template: tpl, placeholders: phs };
  }, [docBlocos, modeloId]);

  const { campos, desconhecidos } = useMemo(() => camposNecessarios(placeholders), [placeholders]);

  // Limpa os valores ao trocar de modelo.
  useEffect(() => setValores({}), [modeloId]);

  const setValor = (id: string, v: string) => setValores((prev) => ({ ...prev, [id]: v }));

  const resultado = useMemo<{ texto: string; erro: null } | { texto: null; erro: string }>(() => {
    if (template.blocos.length === 0) return { texto: '', erro: null };
    try {
      const ctx = montarContextoDeEntradas(valores, desconhecidos);
      return { texto: gerarDocumento(template, ctx), erro: null };
    } catch (e) {
      return { texto: null, erro: e instanceof Error ? e.message : String(e) };
    }
  }, [template, valores, desconhecidos]);

  const copiar = async () => {
    if (!resultado.texto) return;
    await navigator.clipboard.writeText(resultado.texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  const podeExemplo = campos.some((c) => c.id in EXEMPLO);

  return (
    <OsgLayout
      title="Gerar Documento"
      subtitle="Escolha um modelo, preencha os dados e visualize o documento gerado"
    >
      <div className="space-y-4">
        <Card>
          <CardContent className="py-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
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
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Matrícula do cliente</Label>
                <Select value={matriculaId ?? undefined} onValueChange={setMatriculaId} disabled={!clienteId || !modeloId}>
                  <SelectTrigger>
                    <SelectValue placeholder={!clienteId ? 'Selecione um cliente na barra acima' : 'Selecione uma matrícula'} />
                  </SelectTrigger>
                  <SelectContent>
                    {matriculasDoCliente.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.numero ?? 's/ nº'}{m.bem_denominacao ? ` — ${m.bem_denominacao}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {carregandoEntradas && (
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" /> Carregando dados da matrícula…
                </span>
              )}
              {matriculaId && !carregandoEntradas && (
                <span className="text-xs text-osg-700 flex items-center gap-1.5">
                  <Database className="h-3 w-3" /> Campos preenchidos da matrícula
                  <span className="text-muted-foreground inline-flex items-center gap-1">
                    <Pencil className="h-3 w-3" /> editáveis abaixo
                  </span>
                </span>
              )}
              {modeloId && podeExemplo && (
                <Button variant="outline" size="sm" className="ml-auto" onClick={() => setValores({ ...EXEMPLO })}>
                  Preencher exemplo (Mat. 9.617)
                </Button>
              )}
            </div>
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
            {/* Formulário dinâmico */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Dados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {desconhecidos.length > 0 && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      Campos sem definição no vocabulário (tratados como texto livre):{' '}
                      <code>{desconhecidos.join(', ')}</code>. Considere adicioná-los ao vocabulário.
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {campos.map((c) => (
                    <div key={c.id} className={c.tipo === 'textarea' ? 'sm:col-span-2 space-y-1.5' : 'space-y-1.5'}>
                      <Label className="text-xs font-semibold text-muted-foreground">{c.label}</Label>
                      {c.tipo === 'textarea' ? (
                        <Textarea value={valores[c.id] ?? ''} onChange={(e) => setValor(c.id, e.target.value)} rows={4} className="text-sm" />
                      ) : (
                        <Input
                          value={valores[c.id] ?? ''}
                          onChange={(e) => setValor(c.id, e.target.value)}
                          placeholder={c.tipo === 'area' ? 'ex: 396.4' : c.tipo === 'valor' ? 'ex: 558413.55' : undefined}
                          className="text-sm"
                        />
                      )}
                    </div>
                  ))}
                  {desconhecidos.map((ph) => (
                    <div key={ph} className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">{ph}</Label>
                      <Input value={valores[ph] ?? ''} onChange={(e) => setValor(ph, e.target.value)} className="text-sm" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Documento gerado */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileOutput className="h-4 w-4 text-osg-600" /> Documento gerado
                </CardTitle>
                <Button variant="outline" size="sm" onClick={copiar} disabled={!resultado.texto}>
                  {copiado ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
                  {copiado ? 'Copiado' : 'Copiar'}
                </Button>
              </CardHeader>
              <CardContent>
                {resultado.erro ? (
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
                  <Badge variant="outline" className="text-[10px]">{template.blocos.length} blocos</Badge>
                  <Badge variant="outline" className="text-[10px]">{campos.length + desconhecidos.length} campos</Badge>
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
