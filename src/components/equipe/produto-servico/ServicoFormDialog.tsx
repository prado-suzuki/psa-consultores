import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RequiredMark } from '@/components/ui/required-mark';
import ClusterSelect from '@/components/equipe/produto-servico/ClusterSelect';
import {
  dividirNomeServico, montarNomeServico, proximoNumeroServico,
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
 * Ao criar, o próximo número principal do cluster é sugerido automaticamente.
 * Em edição, o número gravado é preservado; ambos continuam editáveis.
 */
export default function ServicoFormDialog({
  aberto, servico, clusterPadrao, onFechar, onCriado,
}: ServicoFormDialogProps) {
  const { save } = useServicosPrestadosSave();
  const { data: catalogo = [], isLoading: carregandoCatalogo } = useServicosPrestadosList();

  const [codigoEditado, setCodigoEditado] = useState<string | null>(null);
  const [titulo, setTitulo] = useState('');
  const [clusterId, setClusterId] = useState('');
  const [salvando, setSalvando] = useState(false);
  const cluster = clusterId || null;
  const codigo = codigoEditado ?? proximoNumeroServico(catalogo, cluster);

  // Recarrega o formulário a cada abertura — o diálogo é reaproveitado entre itens.
  useEffect(() => {
    if (!aberto) return;
    const partido = dividirNomeServico(servico?.nome);
    setTitulo(servico ? partido.nome : '');
    setCodigoEditado(servico ? (partido.codigo ?? '') : null);
    setClusterId(servico?.cluster_id || (servico ? '' : clusterPadrao || ''));
  }, [aberto, servico, clusterPadrao]);

  /*
   * Colar "1.1.Apoio no fechamento contábil" no nome separa sozinho. É o gesto
   * de quem copia da planilha, e sem isto o número voltaria para dentro do nome
   * pela porta dos fundos.
   */
  const digitarTitulo = (valor: string) => {
    const partido = dividirNomeServico(valor);
    if (partido.codigo) {
      setCodigoEditado(partido.codigo);
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
              onChange={(valor) => {
                setClusterId(valor);
                if (!servico) setCodigoEditado(null);
              }}
            />
          </div>

          <div className="grid grid-cols-[7rem_1fr] gap-3">
            <div>
              <Label htmlFor="servico-numero">Número{!servico && ' (automático)'}</Label>
              <Input
                id="servico-numero"
                value={codigo}
                onChange={e => setCodigoEditado(e.target.value)}
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
          <Button onClick={handleSalvar} disabled={salvando || carregandoCatalogo}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
