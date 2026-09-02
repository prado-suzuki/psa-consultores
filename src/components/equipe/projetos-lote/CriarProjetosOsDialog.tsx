import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Building2, CalendarDays, FolderPlus, Loader2, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useOrgProjects } from '@/hooks/useOrgProjects';
import { useOsAbertasComProdutos } from '@/hooks/useDomainOsAbertas';
import { useExternalClients } from '@/hooks/useTaxReferenceData';
import { isoToMasked, SITUACAO_PROJETO_OPTIONS } from '@/components/equipe/client-form/constants';
import type { AreaKey } from '@/config/areaCategories';
import {
  buildLoteOsOptionsByClient,
  CORRIGIR_OS_HINT,
  resolveLoteRoutes,
  type LoteOsCandidata,
} from '@/lib/projetosLote';

interface CriarProjetosOsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Área da tela que abriu o seletor — decide para qual tela de lote ir. */
  area: AreaKey;
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function situacaoLabel(situacao: string | null) {
  return SITUACAO_PROJETO_OPTIONS.find(option => option.value === situacao)?.label || situacao || '—';
}

function periodoLabel(os: LoteOsCandidata) {
  if (!os.data_inicio && !os.data_fim) return 'Sem período';
  return `${os.data_inicio ? isoToMasked(os.data_inicio) : '—'} a ${os.data_fim ? isoToMasked(os.data_fim) : '—'}`;
}

/**
 * Porta de entrada da criação de projetos em lote: escolhe o cliente e a OS e
 * leva para a tela de lote com o snapshot da OS.
 *
 * Antes isso morava na aba "OS - Ordem de Serviço" do cadastro do cliente, onde
 * a OS já estava em mãos. Aqui o cliente é escolhido do zero, então as OS vêm do
 * banco em vez do rascunho do formulário — o que permite criar projetos para OS
 * que ainda não têm nenhum projeto.
 *
 * A lista de clientes mostra apenas quem tem OS aberta com produto sem projeto.
 * Uma OS de 3 produtos com 2 já criados continua contando: sobrou 1.
 *
 * Tudo dentro do ambiente atual: os clientes vêm filtrados por `ambiente` e as OS
 * consideradas são só as do cliente daquele ambiente (ver
 * buildLoteOsOptionsByClient).
 *
 * OS irregular (sem as datas que o projeto herda dela) não abre a tela de lote:
 * fica desabilitada aqui, com o motivo à vista. O bloqueio existia só na hora de
 * criar, depois de o consultor ter preenchido todas as linhas.
 */
export const CriarProjetosOsDialog = ({ open, onOpenChange, area }: CriarProjetosOsDialogProps) => {
  const navigate = useNavigate();
  const routes = resolveLoteRoutes(area);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedOsId, setSelectedOsId] = useState('');

  const { data: clients = [], isLoading: loadingClients } = useExternalClients();
  // Só consulta quando o seletor abre: são as OS de todos os clientes.
  const { data: osAbertas = [], isLoading: loadingOs } = useOsAbertasComProdutos(open);
  const { data: allProjects = [] } = useOrgProjects();

  // Cada abertura começa do zero: reaproveitar a escolha anterior levaria para a
  // OS errada num clique distraído.
  useEffect(() => {
    if (open) return;
    setClientSearch('');
    setSelectedClientId('');
    setSelectedOsId('');
  }, [open]);

  const optionsByClient = useMemo(
    () => buildLoteOsOptionsByClient(clients, osAbertas, allProjects),
    [clients, osAbertas, allProjects],
  );

  // Só entra na lista quem tem o que criar: ao menos uma OS aberta com produto
  // sem projeto. Uma OS de 3 produtos com 2 já criados ainda conta.
  const clientsComPendencia = useMemo(
    () => clients.filter(client => optionsByClient.get(client.id)?.some(option => option.disponiveis > 0)),
    [clients, optionsByClient],
  );

  const selectedClient = clientsComPendencia.find(client => client.id === selectedClientId) || null;

  const clientOptions = useMemo(() => {
    const search = normalize(clientSearch.trim());
    if (!search) return clientsComPendencia;
    return clientsComPendencia.filter(client => normalize(client.nome).includes(search));
  }, [clientsComPendencia, clientSearch]);

  // Todas as OS abertas do cliente, inclusive as já esgotadas: aparecem
  // desabilitadas, para não parecer que a OS sumiu do cadastro.
  const osOptions = useMemo(
    () => (selectedClientId ? optionsByClient.get(selectedClientId) || [] : []),
    [optionsByClient, selectedClientId],
  );

  const selectedOs = osOptions.find(option => option.os.id === selectedOsId) || null;

  const handleConfirm = () => {
    if (!selectedOs || selectedOs.irregular) return;
    onOpenChange(false);
    navigate(routes.lote, { state: { loteFromOs: selectedOs.state } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* DialogContent é um grid: sem min-w-0 nas filhas, um nome de cliente longo
          estica a coluna e o conteúdo vaza para fora da caixa branca do modal. */}
      <DialogContent className="max-w-lg [&>*]:min-w-0">
        <DialogHeader>
          <DialogTitle>Criar projetos da OS</DialogTitle>
          <DialogDescription>
            {selectedClient
              ? 'Escolha a ordem de serviço. A próxima tela cria um projeto por produto contratado.'
              : 'Clientes com OS aberta que ainda tem produto sem projeto vinculado.'}
          </DialogDescription>
        </DialogHeader>

        {!selectedClient ? (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Cliente</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={clientSearch}
                onChange={event => setClientSearch(event.target.value)}
                placeholder="Buscar cliente"
                className="pl-9"
              />
            </div>
            <div className="max-h-64 min-h-[3rem] overflow-y-auto rounded-lg border p-1">
              {loadingClients || loadingOs ? (
                <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />Carregando clientes…
                </p>
              ) : clientOptions.length === 0 ? (
                <p className="px-2 py-10 text-center text-sm text-muted-foreground">
                  {clientSearch.trim()
                    ? 'Nenhum cliente encontrado.'
                    : 'Nenhum cliente com OS aberta sem projeto vinculado.'}
                </p>
              ) : clientOptions.map(client => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => setSelectedClientId(client.id)}
                  title={client.nome}
                  className="flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                >
                  <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{client.nome}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium" title={selectedClient.nome}>
                {selectedClient.nome}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() => { setSelectedClientId(''); setSelectedOsId(''); }}
              >
                <ArrowLeft className="h-3.5 w-3.5" />Trocar cliente
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Ordem de serviço</Label>
              <div className="max-h-56 min-h-[3rem] overflow-y-auto rounded-lg border p-2">
                {/* Sem estado de carregamento: as OS já vieram junto com a lista
                    de clientes — é ela que depende delas para filtrar. */}
                {osOptions.length === 0 ? (
                  <p className="px-2 py-10 text-center text-sm text-muted-foreground">
                    Este cliente não tem OS aberta.
                  </p>
                ) : (
                  <RadioGroup value={selectedOsId} onValueChange={setSelectedOsId}>
                    {osOptions.map(option => {
                      const disabled = option.disponiveis === 0 || Boolean(option.irregular);
                      return (
                        <div key={option.os.id} className="flex items-start gap-3 rounded-lg p-2 hover:bg-muted">
                          <RadioGroupItem
                            value={option.os.id}
                            id={`lote-os-${option.os.id}`}
                            disabled={disabled}
                            className="mt-1"
                          />
                          <Label
                            htmlFor={`lote-os-${option.os.id}`}
                            className={`min-w-0 flex-1 font-normal ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                          >
                            <span className="block truncate font-medium">
                              OS {option.os.numero_os || 'sem número'} · {situacaoLabel(option.os.situacao)}
                            </span>
                            <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <CalendarDays className="h-3 w-3" />{periodoLabel(option.os)}
                            </span>
                            {option.irregular ? (
                              <span className="mt-0.5 flex items-start gap-1.5 text-[11px] text-warning">
                                <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
                                {option.irregular} — {CORRIGIR_OS_HINT}
                              </span>
                            ) : (
                              <span className="mt-0.5 block text-[11px] text-muted-foreground/80">
                                {option.total === 0
                                  ? 'Sem produtos contratados'
                                  : option.disponiveis === 0
                                    ? `Todos os ${option.total} produtos já têm projeto`
                                    : `${option.disponiveis} de ${option.total} produto(s) sem projeto`}
                              </span>
                            )}
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleConfirm} disabled={!selectedOs} className="gap-2">
                <FolderPlus className="h-4 w-4" />
                {selectedOs
                  ? `Criar ${selectedOs.disponiveis} projeto${selectedOs.disponiveis !== 1 ? 's' : ''}`
                  : 'Criar projetos'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
