/**
 * Cores da categoria do cliente (Bronze → Diamante).
 *
 * Fonte única porque as duas telas que pintam categoria divergiam: a barra de
 * filtros usava hex de metal cravados (`#CD7F32`, `#C0C0C0`, `#FFD700`,
 * `#00BFFF`) e a tabela de clientes usava tokens semânticos — nela **Bronze e
 * Ouro ficavam idênticos** (`bg-warning/10` nos dois) e Diamante saía azul de
 * `--info`. Mesma categoria, cor diferente conforme a tela.
 *
 * A metáfora do metal fica (o usuário reconhece bronze, prata, ouro, diamante),
 * mas em versões contidas — ver `--categoria-*` em `index.css`. Categoria é
 * atributo de NEGÓCIO, não identidade de área: não muda entre Tax e OSG.
 */
export interface CategoriaClienteConfig {
  key: string;
  /** Ponto indicador (cor cheia). */
  dot: string;
  /** Pílula: fundo suave + texto + borda. */
  badge: string;
}

/*
 * As classes vêm ESCRITAS por extenso, sem template string. O Tailwind lê o
 * código-fonte procurando nomes de classe literais: `bg-categoria-${nome}` não
 * é encontrado, a classe não entra no CSS e o elemento sai sem cor — sem erro de
 * build, de lint ou de tipo. Foi o que aconteceu na primeira versão deste
 * arquivo.
 */
export const categoriaClienteColors: Record<string, CategoriaClienteConfig> = {
  Bronze: {
    key: 'Bronze',
    dot: 'bg-categoria-bronze',
    badge: 'bg-categoria-bronze/10 text-categoria-bronze border-categoria-bronze/20',
  },
  Prata: {
    key: 'Prata',
    dot: 'bg-categoria-prata',
    badge: 'bg-categoria-prata/10 text-categoria-prata border-categoria-prata/20',
  },
  Ouro: {
    key: 'Ouro',
    dot: 'bg-categoria-ouro',
    badge: 'bg-categoria-ouro/10 text-categoria-ouro border-categoria-ouro/20',
  },
  Diamante: {
    key: 'Diamante',
    dot: 'bg-categoria-diamante',
    badge: 'bg-categoria-diamante/10 text-categoria-diamante border-categoria-diamante/20',
  },
};

/** Ordem do menor para o maior — é escala, não lista alfabética. */
export const categoriaClienteList = [
  categoriaClienteColors.Bronze,
  categoriaClienteColors.Prata,
  categoriaClienteColors.Ouro,
  categoriaClienteColors.Diamante,
];

/** Configuração com fallback neutro: `cliente.categoria` é texto livre no banco. */
export function categoriaClienteConfig(categoria: string | null | undefined): CategoriaClienteConfig {
  if (categoria && categoriaClienteColors[categoria]) return categoriaClienteColors[categoria];
  return { key: categoria || '', dot: 'bg-muted-foreground', badge: 'bg-muted text-muted-foreground border-border' };
}
