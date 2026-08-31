import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { slugify } from '@/utils/slugify';
import { usePublicNovidades, type NovidadeCategoria } from '@/hooks/useDomainNovidades';
import { CATEGORIA_META, toNovItems, type NovItem } from '@/components/novidades/novidadesView';

const CATEGORIAS: (NovidadeCategoria | 'todas')[] = ['todas', 'empresa', 'tributario', 'servicos', 'cases'];
const chipLabel = (c: NovidadeCategoria | 'todas') => (c === 'todas' ? 'Todas' : CATEGORIA_META[c].label);

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const periodoLabel = (iso: string) => {
  const [ano, mes] = iso.slice(0, 7).split('-');
  return `${cap(MESES[Number(mes) - 1])} de ${ano}`;
};

// Data no canto superior esquerdo (substitui a antiga tag de categoria)
const DataKicker = ({ label }: { label: string }) => (
  <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">{label}</div>
);

// Matéria principal (lead) — grande, chama atenção
const Lead = ({ item, onOpen }: { item: NovItem; onOpen: (i: NovItem) => void }) => (
  <motion.article
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.4 }}
    onClick={() => onOpen(item)}
    className="group cursor-pointer"
  >
    <DataKicker label={item.dataLabel} />
    <h3 className="text-3xl md:text-4xl font-bold text-gray-900 leading-[1.1] mb-4 group-hover:text-primary transition-colors">
      {item.titulo}
    </h3>
    <p className="text-lg text-gray-600 leading-relaxed">{item.descricao}</p>
    <span className="inline-block mt-4 text-sm font-semibold text-primary">Ler matéria →</span>
  </motion.article>
);

// Manchete secundária — menor, em lista com fios
const Secondary = ({ item, onOpen }: { item: NovItem; onOpen: (i: NovItem) => void }) => (
  <motion.article
    initial={{ opacity: 0, y: 12 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-40px' }}
    transition={{ duration: 0.35 }}
    onClick={() => onOpen(item)}
    className="group cursor-pointer py-5 first:pt-0 last:pb-0"
  >
    <DataKicker label={item.dataLabel} />
    <h4 className="text-lg font-bold text-gray-900 leading-snug mb-1 group-hover:text-primary transition-colors">{item.titulo}</h4>
    <p className="text-sm text-gray-600 line-clamp-2">{item.descricao}</p>
  </motion.article>
);

const Novidades = () => {
  const navigate = useNavigate();
  const [cat, setCat] = useState<NovidadeCategoria | 'todas'>('todas');
  const [q, setQ] = useState('');
  const { data, isLoading } = usePublicNovidades();
  const items = useMemo(() => toNovItems(data), [data]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const openItem = (item: NovItem) => navigate(`/novidades/${slugify(item.titulo)}`);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((i) => {
      if (cat !== 'todas' && i.categoria !== cat) return false;
      if (term && !`${i.titulo} ${i.descricao}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [items, cat, q]);

  // Agrupa por período (mês/ano), mais recente primeiro
  const grupos = useMemo(() => {
    const mapa = new Map<string, { key: string; label: string; items: NovItem[] }>();
    for (const it of filtered) {
      const key = it.dataISO.slice(0, 7);
      if (!mapa.has(key)) mapa.set(key, { key, label: periodoLabel(it.dataISO), items: [] });
      mapa.get(key)!.items.push(it);
    }
    return [...mapa.values()].sort((a, b) => b.key.localeCompare(a.key));
  }, [filtered]);

  const semNenhuma = !isLoading && items.length === 0;
  const semResultado = !isLoading && items.length > 0 && filtered.length === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero */}
      <section className="pt-28 pb-16 bg-gray-900">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Novidades</h1>
            <p className="text-lg text-gray-300">
              Fique por dentro das últimas atualizações da PSA Consultores, mudanças no sistema tributário e cases de sucesso.
            </p>
          </motion.div>
        </div>
      </section>

      <main className="py-14 md:py-20">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Controles: busca + filtros por categoria (botões no mesmo raio do "Área do Cliente") */}
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-14">
            <div className="relative md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar novidades..."
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIAS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`text-sm font-medium px-4 py-2 rounded-lg border transition-colors ${
                    cat === c
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-600 border-border hover:border-primary hover:text-primary'
                  }`}
                >
                  {chipLabel(c)}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : semNenhuma ? (
            <div className="text-center py-16 text-gray-500">
              <p>Nenhuma novidade publicada ainda.</p>
            </div>
          ) : semResultado ? (
            <div className="text-center py-16 text-gray-500">
              <p>Nenhuma novidade encontrada para esse filtro.</p>
            </div>
          ) : (
            <div className="space-y-16">
              {grupos.map((g) => (
                <section key={g.key}>
                  {/* Cabeçalho do período (estilo editorial) */}
                  <div className="flex items-center gap-4 mb-8">
                    <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-900 whitespace-nowrap">
                      {g.label}
                    </h2>
                    <div className="flex-1 h-px bg-muted" />
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {g.items.length} {g.items.length === 1 ? 'novidade' : 'novidades'}
                    </span>
                  </div>

                  {g.items.length === 1 ? (
                    <Lead item={g.items[0]} onOpen={openItem} />
                  ) : (
                    <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
                      <div className="lg:col-span-2">
                        <Lead item={g.items[0]} onOpen={openItem} />
                      </div>
                      <div className="divide-y divide-border lg:border-l lg:border-border lg:pl-8">
                        {g.items.slice(1).map((it, i) => (
                          <Secondary key={i} item={it} onOpen={openItem} />
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Novidades;
