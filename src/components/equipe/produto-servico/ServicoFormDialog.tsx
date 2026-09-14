import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { RequiredMark } from '@/components/ui/required-mark';
import ClusterSelect from '@/components/equipe/produto-servico/ClusterSelect';
import {
  dividirNomeServico, gruposDeCodigo, montarNomeServico, proximoCodigoLivre,
  servicosComCodigo, servicosComMesmoNome,
} from '@/lib/produtoServicoNomes';
import {
  useServicosPrestadosList, useServicosPrestadosSave, type ServicoPrestado,
} from '@/hooks/useCategorias';

interface ServicoFormDialogProps {
  aberto: boolean;
  /** Serviço em edição; `null` cria um novo. */
  servico: ServicoPrestado | null;
  /** Cluster pré-selecionado ao criar (o do produto selecionado na tela). */
  clusterPadrao?: string | null;
  onFechar: () => void;
  /** Chamado com o serviço recém-criado, para já vinculá-lo ao produto. */
  onCriado?: (servicoId: string, nome: string) => void;
}

/** Aviso sob os campos: informativo, nunca impeditivo. */
function Aviso({ tom, children }: { tom: 'atencao' | 'ok'; children: ReactNode }) {
  return (
    <p
      className={
        tom === 'atencao'
          ? 'rounded-md border border-warning/40 bg-warning/10 px-2.5 py-1.5 text-xs text-warning'
          : 'rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-xs text-primary'
      }
    >
      {children}
    </p>
  );
}

/**
 * Cadastro de serviço — DOIS campos para o que o banco guarda numa coluna só.
 *
 * `servicos_prestados` tem `id`, `nome` e `cluster_id`, e o número que a
 * operação usa para se referir a um serviço vive DENTRO do nome. Até aqui ele
 * era digitado junto, de cabeça, sem conferência nenhuma — e é dessa digitação
 * que vieram os códigos repetidos e os serviços cadastrados duas vezes, uma com
 * número e outra sem, com os vínculos partidos entre as duas linhas.
 *
 * O formulário separa NÚMERO e NOME na tela e os remonta na gravação
 * (`montarNomeServico`), no mesmo formato de sempre. Nada muda no banco: é de
 * propósito que esta mudança não depende de migration nenhuma. No dia em que
 * `servicos_prestados` ganhar coluna de código, só as três leituras trocam de
 * fonte — os campos, os avisos e a validação ficam como estão.
 *
 * O número chega PRONTO: `proximoCodigoLivre` olha o que já existe no cluster,
 * inclusive o zero à esquerda que a OSG usa e a Tax não, e propõe o primeiro
 * vago. Continua editável — quem cadastra decide, e código repetido ainda pode
 * ser gravado. A tela só se recusa a deixar isso acontecer em silêncio.
 */
export default function ServicoFormDialog({
  aberto, servico, clusterPadrao, onFechar, onCriado,
}: ServicoFormDialogProps) {
  const { save } = useServicosPrestadosSave();
  const { data: catalogo = [] } = useServicosPrestadosList();

  const [codigo, setCodigo] = useState('');
  const [titulo, setTitulo] = useState('');
  const [clusterId, setClusterId] = useState('');
  const [salvando, setSalvando] = useState(false);
  /** Já propus um número para este cluster? Sem isto, apagar o campo o repõe. */
  const [jaPropos, setJaPropos] = useState(false);

  const cluster = clusterId || null;
  const grupos = useMemo(() => gruposDeCodigo(catalogo, cluster), [catalogo, cluster]);
  const raiz = codigo.trim().split('.')[0] || null;

  // Recarrega o formulário a cada abertura — o diálogo é reaproveitado entre itens.
  useEffect(() => {
    if (!aberto) return;
    const partido = dividirNomeServico(servico?.nome);
    setTitulo(servico ? partido.nome : '');
    setCodigo(servico ? (partido.codigo ?? '') : '');
    setClusterId(servico?.cluster_id || (servico ? '' : clusterPadrao || ''));
    setJaPropos(!!servico);
  }, [aberto, servico, clusterPadrao]);

  /*
   * Ao CRIAR, o número acompanha o cluster escolhido: trocar de cluster troca
   * de catálogo, e um número livre na Tax pode estar ocupado na OSG. Em edição
   * o número é o que está gravado e não se mexe sozinho.
   */
  useEffect(() => {
    if (!aberto || servico || jaPropos || catalogo.length === 0) return;
    const primeiro = gruposDeCodigo(catalogo, clusterId || null)[0];
    if (primeiro) setCodigo(proximoCodigoLivre(catalogo, clusterId || null, primeiro.raiz));
    setJaPropos(true);
  }, [aberto, servico, clusterId, catalogo, jaPropos]);

  const trocarGrupo = (novaRaiz: string) => {
    setCodigo(proximoCodigoLivre(catalogo, cluster, novaRaiz));
  };

  /*
   * Colar "1.1.Apoio no fechamento contábil" no nome separa sozinho. É o gesto
   * de quem copia da planilha, e sem isto o número voltaria para dentro do nome
   * pela porta dos fundos.
   */
  const digitarTitulo = (valor: string) => {
    const partido = dividirNomeServico(valor);
    if (partido.codigo) {
      setCodigo(partido.codigo);
      setTitulo(partido.nome);
      return;
    }
    setTitulo(valor);
  };

  const colidem = useMemo(
    () => servicosComCodigo(catalogo, cluster, codigo).filter((s) => s.id !== servico?.id),
    [catalogo, cluster, codigo, servico?.id],
  );
  const parecidos = useMemo(
    () => servicosComMesmoNome(catalogo, cluster, titulo, servico?.id ?? null),
    [catalogo, cluster, titulo, servico?.id],
  );

  const nomeFinal = montarNomeServico(codigo, titulo);

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      const id = await save(servico?.id ?? null, nomeFinal, clusterId || null);
      if (!servico && id) onCriado?.(id, nomeFinal);
      onFechar();
    } catch {
      // erros de validação são tratados no hook
    } finally {
      setSalvando(false);
    }
  };

  // O grupo digitado à mão entra na lista: o seletor não pode ficar em branco
  // mostrando um número que está ali no campo ao lado.
  const opcoesDeGrupo = useMemo(() => {
    const lista = grupos.map((g) => ({ raiz: g.raiz, rotulo: `${g.raiz} — ${g.exemplo}` }));
    if (raiz && !grupos.some((g) => g.raiz === raiz)) {
      lista.push({ raiz, rotulo: `${raiz} — grupo novo` });
      lista.sort((a, b) => Number(a.raiz) - Number(b.raiz));
    }
    return lista;
  }, [grupos, raiz]);

  return (
    <Dialog open={aberto} onOpenChange={valor => { if (!valor) onFechar(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{servico ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Cluster</Label>
            <ClusterSelect
              value={clusterId}
              onChange={(valor) => { setClusterId(valor); if (!servico) setJaPropos(false); }}
            />
          </div>

          {opcoesDeGrupo.length > 0 && (
            <div>
              <Label htmlFor="servico-grupo">Grupo</Label>
              <Select value={raiz ?? ''} onValueChange={trocarGrupo}>
                <SelectTrigger id="servico-grupo">
                  <SelectValue placeholder="Selecione um grupo..." />
                </SelectTrigger>
                <SelectContent>
                  {opcoesDeGrupo.map((g) => (
                    <SelectItem key={g.raiz} value={g.raiz}>{g.rotulo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-[7rem_1fr] gap-3">
            <div>
              <Label htmlFor="servico-numero">Número</Label>
              <Input
                id="servico-numero"
                value={codigo}
                onChange={e => setCodigo(e.target.value)}
                placeholder="Ex: 1.10"
                className="font-mono"
              />
            </div>
            <div>
              <Label htmlFor="servico-nome">Nome <RequiredMark /></Label>
              <Input
                id="servico-nome"
                value={titulo}
                onChange={e => digitarTitulo(e.target.value)}
                placeholder="Ex: Apoio no fechamento contábil"
              />
            </div>
          </div>

          {codigo.trim() && (
            colidem.length > 0 ? (
              <Aviso tom="atencao">
                <strong className="font-semibold">{codigo} já é usado</strong> por{' '}
                {colidem.length === 1 ? 'outro serviço' : `outros ${colidem.length} serviços`} deste
                cluster: {colidem.slice(0, 2).map(s => dividirNomeServico(s.nome).nome).join(', ')}
                {colidem.length > 2 && ` e mais ${colidem.length - 2}`}.
              </Aviso>
            ) : (
              <Aviso tom="ok"><strong className="font-semibold">{codigo}</strong> está livre.</Aviso>
            )
          )}

          {parecidos.length > 0 && (
            <Aviso tom="atencao">
              <strong className="font-semibold">Já existe um serviço com esse nome</strong> neste
              cluster: {parecidos.map(s => s.nome).join(', ')}. Vincular o que já existe evita uma
              segunda linha para o mesmo serviço.
            </Aviso>
          )}

          <p className="text-xs text-muted-foreground">
            Será gravado como{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono">
              {nomeFinal || '(sem nome)'}
            </code>
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={salvando}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
