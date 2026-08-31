import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Newspaper, ArrowRight } from "lucide-react";
import { usePublicNovidades } from "@/hooks/useDomainNovidades";
import { toNovItems } from "@/components/novidades/novidadesView";

// Showcase de novidades no painel do login (/auth), sobre a imagem do agro com
// overlay teal. Mostra uma notícia por vez (data + título + resumo) e rotaciona com
// animação de transição. Sem dado falso: se não houver novidades, não renderiza nada.
export const NovidadesShowcase = () => {
  const { data } = usePublicNovidades();
  const items = useMemo(() => toNovItems(data).slice(0, 4), [data]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % items.length), 4500);
    return () => clearInterval(t);
  }, [items.length]);

  if (items.length === 0) return null;

  const n = items[index % items.length];

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex items-center gap-2 text-white font-semibold tracking-wide text-sm mb-5">
        <Newspaper className="h-5 w-5" />
        PSA Novidades
      </div>

      {/* Notícia rotativa com animação de transição */}
      <div className="relative min-h-[180px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-teal-100 mb-2">
              {n.dataLabel}
            </div>
            <h4 className="text-xl font-bold text-white leading-snug mb-2">{n.titulo}</h4>
            <p className="text-sm text-white/80 line-clamp-3">{n.descricao}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Indicadores / navegação manual */}
      {items.length > 1 && (
        <div className="flex items-center gap-2 mt-4">
          {items.map((_, i) => (
            <button
              key={i}
              aria-label={`Novidade ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-6 bg-white" : "w-2 bg-white/40 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      )}

      <Link
        to="/novidades"
        className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-white text-teal-700 font-semibold text-base py-3 transition-colors hover:bg-accent/5"
      >
        Ver todas as novidades
        <ArrowRight className="h-5 w-5" />
      </Link>
    </div>
  );
};
