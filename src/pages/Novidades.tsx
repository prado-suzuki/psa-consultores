import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NovidadeEntry, CategoriaType } from "@/components/novidades/NovidadeEntry";
import { motion } from "framer-motion";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Novidades = () => {
  const { data: novidades, isLoading } = useQuery({
    queryKey: ['novidades-publicas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('novidades')
        .select('*')
        .eq('ativo', true)
        .order('data_publicacao', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gray-900">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Novidades
            </h1>
            <p className="text-lg text-gray-300">
              Fique por dentro das últimas atualizações da PSA Consultores, 
              mudanças no sistema tributário e cases de sucesso.
            </p>
          </motion.div>
        </div>
      </section>

      <main className="py-20 md:py-28">
        <div className="container mx-auto px-4 max-w-4xl">

          {/* Novidades Timeline */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : novidades && novidades.length > 0 ? (
            <div className="space-y-16 md:space-y-20">
              {novidades.map((novidade) => (
                <NovidadeEntry
                  key={novidade.id}
                  categoria={novidade.categoria as CategoriaType}
                  data={format(new Date(novidade.data_publicacao), "d 'de' MMMM, yyyy", { locale: ptBR })}
                  titulo={novidade.titulo}
                  descricao={novidade.descricao}
                  itens={novidade.itens}
                  imagem={novidade.imagem_url || undefined}
                  imagemLateral={(novidade as any).imagem_lateral_url || undefined}
                  imagemLateralPosicao={((novidade as any).imagem_lateral_posicao as "esquerda" | "direita") || "direita"}
                  conteudoCompleto={(novidade as any).conteudo_completo || undefined}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>Nenhuma novidade publicada ainda.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Novidades;
