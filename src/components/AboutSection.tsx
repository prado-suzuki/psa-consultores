import { motion } from "framer-motion";

export const AboutSection = () => {
  return (
    <section id="sobre" className="py-20 md:py-28 bg-gray-50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Quem Somos
            </h2>
            
            <p className="text-gray-600 leading-relaxed">
              Há mais de 20 anos, a PSA se consolidou como referência em consultoria tributária para o agronegócio. Nascemos em Cuiabá, coração do agro brasileiro, e hoje contamos com uma equipe multidisciplinar de mais de 110 profissionais especializados.
            </p>
            
            <p className="text-gray-600 leading-relaxed">
              Nossa atuação é pautada em cinco pilares fundamentais: Gestão, Tecnologia, Compliance, Foco no Cliente e Qualidade. Combinamos expertise técnica com profundo conhecimento do setor para entregar soluções que realmente transformam a realidade fiscal das empresas.
            </p>

            <div className="pt-4 flex flex-wrap gap-x-8 gap-y-4">
              <div>
                <p className="text-2xl font-bold text-gray-900">Cuiabá</p>
                <p className="text-sm text-gray-500">Matriz - MT</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">Barreiras</p>
                <p className="text-sm text-gray-500">Filial - BA</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">Curitiba</p>
                <p className="text-sm text-gray-500">Filial - PR</p>
              </div>
            </div>
          </motion.div>

          {/* Image */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative aspect-[4/3] rounded-lg overflow-hidden"
          >
            <img
              src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop"
              alt="Escritório PSA Consultores"
              className="w-full h-full object-cover"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};
