import { useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { slugify } from '@/utils/slugify';
import { usePublicNovidades } from '@/hooks/useDomainNovidades';
import { toNovItems } from '@/components/novidades/novidadesView';

const NovidadeDetalhe = () => {
  const { slug } = useParams();
  const { data, isLoading } = usePublicNovidades();
  const items = useMemo(() => toNovItems(data), [data]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  const item = items.find((i) => slugify(i.titulo) === slug);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="pt-28 pb-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <Link
            to="/novidades"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-primary transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Novidades
          </Link>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : !item ? (
            <div className="py-16 text-center text-gray-500">
              <p className="mb-4">Matéria não encontrada.</p>
              <Link to="/novidades" className="text-primary font-semibold">
                Ver todas as novidades →
              </Link>
            </div>
          ) : (
            <motion.article
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
                {item.dataLabel}
              </div>
              <h1 className="text-3xl md:text-5xl font-bold text-gray-900 leading-[1.1] mb-6">
                {item.titulo}
              </h1>
              <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-6">
                {item.descricao}
              </p>

              {item.itens.length > 0 && (
                <ul className="space-y-3 mb-8">
                  {item.itens.map((it, i) => (
                    <li
                      key={i}
                      className="text-gray-700 pl-5 relative before:content-[''] before:absolute before:left-0 before:top-2.5 before:w-2 before:h-2 before:rounded-full before:bg-primary"
                    >
                      {it}
                    </li>
                  ))}
                </ul>
              )}

              {item.conteudoCompleto && (
                <div className="text-gray-700 leading-relaxed whitespace-pre-line border-t border-gray-200 pt-6">
                  {item.conteudoCompleto}
                </div>
              )}
            </motion.article>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NovidadeDetalhe;
