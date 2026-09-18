import { Building2, CircleDot, Filter, Layers, MapPin, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FILTROS_VAZIOS,
  statusLabel,
  type AgrupamentoDoControle,
  type FiltrosDoControle,
  type LinhaDoControle,
} from '@/lib/controleDeProjetos';
import { getRegiaoLabel } from '@/lib/regioes';

interface Props {
  filtros: FiltrosDoControle;
  setFiltros: (filtros: FiltrosDoControle) => void;
  opcoes: { statuses: string[]; regioes: string[]; areas: string[] };
  total: number;
  visiveis: number;
  vencidas: number;
  agrupamento: AgrupamentoDoControle;
  setAgrupamento: (agrupamento: AgrupamentoDoControle) => void;
}

/**
 * Barra de filtros do Controle de Projetos.
 *
 * A busca é um campo de texto e não um seletor de cliente: na planilha a equipe
 * achava a linha com Ctrl+F, e o que ela digitava tanto era nome de cliente
 * quanto número de OS quanto um pedaço da observação. Um `SelecaoDeCliente`
 * responderia só a primeira das três.
 */
export function ControleDeProjetosToolbar({
  filtros,
  setFiltros,
  opcoes,
  total,
  visiveis,
  vencidas,
  agrupamento,
  setAgrupamento,
}: Props) {
  const temFiltro = Boolean(filtros.busca || filtros.status || filtros.regiao || filtros.area);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-sm text-muted-foreground">
          {temFiltro
            ? `${visiveis} de ${total} produtos contratados`
            : `${total} produtos contratados`}
        </p>
        {vencidas > 0 && (
          <p className="text-sm font-medium text-destructive">
            {vencidas} com prazo vencido
          </p>
        )}
      </div>

      {/*
        OS QUATRO SELETORES TÊM A MESMA LARGURA (`w-56`, 224px), e não a que o
        texto de cada um pedia. Eram `w-40`, `w-44`, `w-56` e `w-56`, cada um
        dimensionado à mão contra o próprio rótulo, e o primeiro tinha sido
        dimensionado errado: "Todas as áreas executoras" precisa de 244px e a
        caixa tinha 160, então a tela mostrava "Todas as...". Largura por rótulo
        é decisão que se repete quatro vezes e diverge nas quatro.

        224px é o que cabe o mais largo dos rótulos que SOBRARAM, medido em
        Chromium com Work Sans 14px: "Responsável Executor" (150px de texto) mais
        64px de cromo — ícone, recuo, seta e as duas bordas internas. Foi por
        essa medida que dois rótulos encurtaram: "Todas as áreas executoras"
        virou "Todas as áreas" (o `aria-label` guarda o nome inteiro) e os itens
        de agrupamento perderam o prefixo "Agrupar por", que o ícone e o
        `placeholder` já dizem — com ele, "Agrupar por Responsável Executor"
        pedia 299px.

        O ÚNICO QUE AINDA CORTA é a região, e é da natureza dela: o rótulo do
        cadastro é "3SU - BR-163 Sul, Vale do Araguaia, Serra da Petrovina,
        Norte do MS". Corta pelo fim, que é onde está o texto de apoio — o
        código de três letras, que é o que se lê, fica inteiro.

        O ícone do status entrou junto: sem ele, o texto daquele seletor começava
        24px à esquerda do texto dos outros três, e era metade do que estava
        torto na barra.
      */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />

        <div className="relative w-full min-w-0 sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filtros.busca}
            onChange={(evento) => setFiltros({ ...filtros, busca: evento.target.value })}
            placeholder="Cliente, OS, produto ou responsável"
            className="pl-9"
            aria-label="Buscar por cliente, número da OS, produto ou responsável"
          />
        </div>

        <Select
          value={filtros.area || 'all'}
          onValueChange={(valor) => setFiltros({ ...filtros, area: valor === 'all' ? '' : valor })}
        >
          <SelectTrigger className="w-56" aria-label="Filtrar por área executora">
            <Building2 className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <SelectValue placeholder="Área Executora" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as áreas</SelectItem>
            {opcoes.areas.map((area) => (
              <SelectItem key={area} value={area}>
                {area}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filtros.status || 'all'}
          onValueChange={(valor) => setFiltros({ ...filtros, status: valor === 'all' ? '' : valor })}
        >
          <SelectTrigger className="w-56" aria-label="Filtrar por status">
            <CircleDot className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {opcoes.statuses.map((status) => (
              <SelectItem key={status} value={status}>
                {statusLabel(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filtros.regiao || 'all'}
          onValueChange={(valor) => setFiltros({ ...filtros, regiao: valor === 'all' ? '' : valor })}
        >
          <SelectTrigger className="w-56" aria-label="Filtrar por região">
            <MapPin className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <SelectValue placeholder="Região" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as regiões</SelectItem>
            {opcoes.regioes.map((regiao) => (
              <SelectItem key={regiao} value={regiao}>
                {getRegiaoLabel(regiao)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/*
          O agrupamento fica DEPOIS dos filtros e fora do "Limpar" de propósito:
          ele não esconde linha nenhuma, só muda como as mesmas linhas se
          arrumam. Zerá-lo junto com os filtros tiraria da pessoa a leitura que
          ela escolheu por causa de um gesto que era sobre outra coisa.

          São três critérios, e não os nove da tabela: Área, Status e Região já
          são filtro aqui ao lado — ver `agruparControle`.
        */}
        <Select
          value={agrupamento}
          onValueChange={(valor) => setAgrupamento(valor as AgrupamentoDoControle)}
        >
          <SelectTrigger className="w-56" aria-label="Agrupar a tabela">
            <Layers className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <SelectValue placeholder="Agrupar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nenhum">Sem agrupamento</SelectItem>
            <SelectItem value="executor">Responsável Executor</SelectItem>
            <SelectItem value="cliente">Cliente</SelectItem>
            <SelectItem value="produto">Produto Contratado</SelectItem>
          </SelectContent>
        </Select>

        {temFiltro && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFiltros(FILTROS_VAZIOS)}
          >
            <X className="mr-1 h-4 w-4" />
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
}

/** Reexportado para a página não precisar conhecer o tipo da lista. */
export type { LinhaDoControle };
