import { motion } from "framer-motion";
import farmerIllustration from "@/assets/about/farmer-illustration.jpg";

export const AboutSection = () => {
  return (
    <section id="sobre" className="py-20 md:py-28 bg-gray-50 relative overflow-hidden">
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
          </motion.div>

          {/* Ilustração Integrada */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex items-center justify-center"
          >
            <img 
              src={farmerIllustration} 
              alt="Ilustração de agricultor trabalhando no campo"
              className="w-full max-w-lg h-auto opacity-40 mix-blend-multiply"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};
