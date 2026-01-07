import { motion } from "framer-motion";
import { BrazilMap } from "./BrazilMap";
import chevronArrow from "@/assets/icons/chevron-arrow.png";

const offices = [
  {
    id: "cuiaba",
    city: "Cuiabá",
    state: "MT",
    type: "Matriz",
  },
  {
    id: "barreiras",
    city: "Barreiras",
    state: "BA",
    type: "Filial",
  },
  {
    id: "curitiba",
    city: "Curitiba",
    state: "PR",
    type: "Filial",
  },
];

export const OfficesSection = () => {
  return (
    <section className="py-20 md:py-28 bg-gray-50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Mapa - Esquerda */}
          <div className="order-2 lg:order-1">
            <BrazilMap />
          </div>

          {/* Conteúdo - Direita */}
          <div className="order-1 lg:order-2 space-y-8">
            {/* Título e Subtítulo */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Onde Estamos
              </h2>
              <p className="text-gray-600">
                Presença estratégica nas principais regiões do agronegócio brasileiro, 
                atendendo clientes em todo o território nacional.
              </p>
            </motion.div>

            {/* Lista de Escritórios */}
            <div className="space-y-4">
              {offices.map((office, index) => (
                <motion.div
                  key={office.id}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.15 }}
                  className="flex items-center gap-4"
                >
                  <span className="text-sm font-medium text-gray-500 w-14">
                    {office.type}
                  </span>
                  <img 
                    src={chevronArrow} 
                    alt="" 
                    className="w-16 h-16 md:w-20 md:h-20 object-contain" 
                  />
                  <span className="text-lg font-semibold text-gray-900">
                    Escritório {office.city} - {office.state}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Legenda */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
              className="flex items-center gap-6 pt-4 text-sm text-gray-500"
            >
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-cyan-400"></span>
                <span>Escritórios</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span>Estados de atuação</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};
