import { useEffect, useState } from 'react';

import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { OrgaoGovernanca, OrgaoGovernancaInput } from '@/hooks/useDomainOrgaoGovernanca';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ausente = cadastro novo. */
  orgao?: OrgaoGovernanca | null;
  onSalvar: (input: OrgaoGovernancaInput) => Promise<unknown>;
  salvando: boolean;
  /** Ordem sugerida para o próximo órgão, quando é cadastro novo. */
  proximaOrdem: number;
}

const VAZIO = {
  nome: '',
  entra_no_contrato: false,
  vigencia_inicio: '',
  vigencia_fim: '',
};

/**
 * Cadastro de um órgão de governança.
 *
 * O NOME É LIVRE de propósito. A lista não é fixa: três são padrão da OSG e o
 * cliente acrescenta os dele, com nome próprio. Um seletor fechado aqui
 * impediria o caso real dos gerentes, que um cliente põe nas alçadas.
 *
 * O interruptor do contrato é a decisão que mais pesa nesta tela, e por isso vem
 * com a explicação ao lado em vez de um rótulo seco: é ele que faz o gerador
 * escrever "Compete a..." para aquele órgão. Os gerentes existem na Matriz e
 * ficam fora do contrato, e é exatamente essa diferença que o campo guarda.
 */
export function OrgaoGovernancaModal({
  open, onOpenChange, orgao, onSalvar, salvando, proximaOrdem,
}: Props) {
  const editando = !!orgao;
  const [form, setForm] = useState(VAZIO);

  useEffect(() => {
    if (!open) return;
    setForm(orgao
      ? {
        nome: orgao.nome,
        entra_no_contrato: orgao.entra_no_contrato,
        vigencia_inicio: orgao.vigencia_inicio ?? '',
        vigencia_fim: orgao.vigencia_fim ?? '',
      }
      : VAZIO);
  }, [open, orgao]);

  const nomeVazio = !form.nome.trim();
  // O banco tem o mesmo check; aqui é só para não deixar salvar e tomar erro.
  const vigenciaInvertida = !!form.vigencia_inicio && !!form.vigencia_fim
    && form.vigencia_fim < form.vigencia_inicio;

  const salvar = async () => {
    if (nomeVazio || vigenciaInvertida) return;
    await onSalvar({
      nome: form.nome,
      entra_no_contrato: form.entra_no_contrato,
      ordem: orgao?.ordem ?? proximaOrdem,
      vigencia_inicio: form.vigencia_inicio || null,
      vigencia_fim: form.vigencia_fim || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar órgão' : 'Novo órgão de governança'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="orgao-nome">Nome do órgão *</Label>
            <Input
              id="orgao-nome"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              placeholder="Conselho de Administração"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Como este cliente chama a instância. Vira uma coluna da Matriz de Alçadas.
            </p>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="orgao-contrato">Recebe competência no contrato social</Label>
              <p className="text-xs text-muted-foreground">
                Ligado, o gerador escreve &quot;Compete a...&quot; para este órgão. Deixe desligado
                para quem existe só na Matriz, como os gerentes.
              </p>
            </div>
            <Switch
              id="orgao-contrato"
              checked={form.entra_no_contrato}
              onCheckedChange={(v) => setForm((f) => ({ ...f, entra_no_contrato: v }))}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="orgao-inicio">Vigência, início</Label>
              <Input
                id="orgao-inicio"
                type="date"
                value={form.vigencia_inicio}
                onChange={(e) => setForm((f) => ({ ...f, vigencia_inicio: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="orgao-fim">Vigência, fim</Label>
              <Input
                id="orgao-fim"
                type="date"
                value={form.vigencia_fim}
                onChange={(e) => setForm((f) => ({ ...f, vigencia_fim: e.target.value }))}
              />
            </div>
          </div>

          {vigenciaInvertida && (
            <p className="text-xs font-medium text-destructive">
              O fim da vigência não pode ser antes do início.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando || nomeVazio || vigenciaInvertida}>
            {editando ? 'Salvar' : 'Cadastrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
