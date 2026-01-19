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
          className="mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Nossa Filosofia
          </h2>
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
            <blockquote className="text-xl md:text-2xl lg:text-3xl text-gray-700 leading-relaxed font-light italic">
              "Nossa abordagem integra conhecimento interdisciplinar nas áreas{" "}
              <span className="text-lime-600 not-italic font-medium">fiscal</span>,{" "}
              <span className="text-lime-600 not-italic font-medium">contábil</span>,{" "}
              <span className="text-lime-600 not-italic font-medium">tributária</span>,{" "}
              <span className="text-lime-600 not-italic font-medium">societária</span>,{" "}
              <span className="text-lime-600 not-italic font-medium">gestão</span> e{" "}
              <span className="text-lime-600 not-italic font-medium">governança</span>, para{" "}
              <span className="text-lime-600 not-italic font-medium">gerar valor</span> no presente e{" "}
              <span className="text-lime-600 not-italic font-medium">potencializar o futuro</span> dos nossos clientes"
            </blockquote>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
};
