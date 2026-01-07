import { motion } from "framer-motion";
import { Users, MapPin, Settings, Monitor, Shield, Heart, Award } from "lucide-react";

const directives = [
  {
    icon: Settings,
    title: "Gestão",
    description: "Excelência em processos e governança corporativa"
  },
  {
    icon: Monitor,
    title: "Tecnologia",
    description: "Soluções digitais para otimização tributária"
  },
  {
    icon: Shield,
    title: "Compliance",
    description: "Conformidade fiscal e mitigação de riscos"
  },
  {
    icon: Heart,
    title: "Foco no Cliente",
    description: "Atendimento personalizado e estratégico"
  },
  {
    icon: Award,
    title: "Qualidade",
    description: "Rigor técnico e entrega de resultados"
  }
];

const locations = [
  { city: "Cuiabá", state: "MT", type: "Matriz" },
  { city: "Barreiras", state: "BA", type: "Filial" },
  { city: "Curitiba", state: "PR", type: "Filial" }
];

export const AboutSection = () => {
  return (
    <section className="py-20 md:py-32 bg-gray-900">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column - Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-gray-50">
              Quem <span className="text-primary">Somos</span>
            </h2>
            
            <p className="text-lg text-gray-300 leading-relaxed">
              A PSA Consultores, parte da rede associativa PSA Prado, Sá, Avila Consultores & Advogados, 
              é referência nacional em soluções tributárias, contábeis e de governança corporativa 
              para o agronegócio brasileiro.
            </p>
            
            <p className="text-gray-400 leading-relaxed">
              Com sede em Cuiabá/MT – coração do agronegócio nacional – e filiais em Barreiras/BA e 
              Curitiba/PR, atendemos empresas de médio e grande porte com uma equipe multidisciplinar 
              altamente especializada.
            </p>

            {/* Team & Locations Highlight */}
            <div className="flex flex-wrap gap-6 pt-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-50">110+</div>
                  <div className="text-sm text-gray-400">Profissionais</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-secondary/20 flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-50">3</div>
                  <div className="text-sm text-gray-400">Escritórios</div>
                </div>
              </div>
            </div>

            {/* Locations Tags */}
            <div className="flex flex-wrap gap-2 pt-2">
              {locations.map((loc) => (
                <span
                  key={loc.city}
                  className="px-4 py-2 rounded-full text-sm font-medium bg-gray-800 text-gray-300 border border-gray-700"
                >
                  {loc.city}/{loc.state} {loc.type === "Matriz" && <span className="text-primary">• Matriz</span>}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Right Column - Directives Grid */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-2 sm:grid-cols-3 gap-4"
          >
            {directives.map((directive, index) => (
              <motion.div
                key={directive.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.1 * index }}
                className={`p-5 rounded-xl bg-gray-800/50 border border-gray-700/50 hover:border-primary/50 transition-colors ${
                  index === 4 ? 'col-span-2 sm:col-span-1' : ''
                }`}
              >
                <directive.icon className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold text-gray-50 mb-1">{directive.title}</h3>
                <p className="text-sm text-gray-400">{directive.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};
