import { motion } from "framer-motion";

export const TestimonialsSection = () => {
  return (
    <section className="py-20 md:py-28 bg-gray-50 overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 space-y-4"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Nossa Filosofia
          </h2>
          <p className="text-gray-600 leading-relaxed">
            Transformamos complexidade burocrática em vantagem competitiva
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          
          {/* Coluna Esquerda: Vídeo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="aspect-video rounded-xl overflow-hidden shadow-xl border border-gray-200">
              <iframe
                src="https://www.youtube.com/embed/9E-EcRz-Gig"
                title="PSA Consultores"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </motion.div>

          {/* Coluna Direita: Citação Institucional */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col justify-center"
          >
            <p className="text-gray-600 leading-relaxed italic border-l-4 border-emerald-600 pl-4">
              "Nossa abordagem integra conhecimento interdisciplinar nas áreas{" "}
              <span className="text-emerald-600 font-medium">
                fiscal, contábil, tributária, societária, gestão e governança
              </span>
              , para gerar valor no presente e potencializar o futuro dos nossos clientes."
            </p>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
};
