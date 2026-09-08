import { useState } from 'react';
import { Presentation } from 'lucide-react';

import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { DevPageHeader } from '@/components/equipe/dev/DevPageHeader';
import { FiltroDeBusca } from '@/components/equipe/FiltroDeBusca';
import { PapeisDeTrabalhoReport } from '@/components/equipe/osg/relatorios/PapeisDeTrabalhoReport';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useClientesList } from '@/hooks/useDevClients';

/**
 * Gerar os slides do Planejamento Tributário, dentro da Digital.
 *
 * **É a mesma tela que a OSG Work já tem**, na cor da Digital. A geração vive
 * num componente só, e as duas áreas o hospedam: quem escreve o papel de
 * trabalho é o Fiscal, aqui, e quem apresenta é a OSG, lá, e não faria sentido
 * o Fiscal atravessar para a área da OSG para gerar o próprio material.
 *
 * A diferença é de onde vem o cliente. Na OSG ele vem da barra compartilhada do
 * OSG Work; aqui não existe essa barra, então a página tem o seletor dela,
 * dentro da caixa de filtro padrão. **De propósito não reaproveitei o seletor da
 * tela de importar**: ele é um componente interno daquela página, e extraí-lo
 * mexeria numa tela que está funcionando para ganhar pouco.
 */
const GeradorDeSlides = () => {
  const { data: clientes = [], isLoading } = useClientesList({ ativo: true });
  const [clienteId, setClienteId] = useState('');

  return (
    <DevLayout title="Gerador de Slides" subtitle="Planejamento Tributário rural">
      <div className="space-y-5">
        <DevPageHeader
          title="Como funciona"
          description="Escolha o cliente e qual revisão do papel de trabalho usar. A ferramenta monta os slides tributários da apresentação, com as tabelas de premissas, carga tributária, transferência da atividade rural e resumo. **Os números vêm do papel de trabalho que já foi conferido**, e não do que está nesta tela. As tabelas saem editáveis, para você acertar o que precisar no PowerPoint."
          icon={Presentation}
        />

        <FiltroDeBusca colunas={2}>
          <div className="space-y-2">
            <Label htmlFor="gs-cliente">Cliente</Label>
            <Select value={clienteId} onValueChange={setClienteId} disabled={isLoading}>
              <SelectTrigger id="gs-cliente">
                <SelectValue placeholder={isLoading ? 'Carregando…' : 'Selecione um cliente'} />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </FiltroDeBusca>

        {/*
          Sem cliente não há o que mostrar, e o texto diz o primeiro passo em vez
          de deixar a página em branco.
        */}
        {clienteId ? (
          <PapeisDeTrabalhoReport clienteId={clienteId} paleta="digital" />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 py-16 text-center">
            <Presentation className="h-10 w-10 text-primary opacity-50" aria-hidden />
            <p className="max-w-md text-sm text-muted-foreground">
              Escolha um cliente acima para ver os papéis de trabalho dele e gerar os slides.
            </p>
          </div>
        )}
      </div>
    </DevLayout>
  );
};

export default GeradorDeSlides;
