import { motion } from "framer-motion";
import { ChevronRight, MapPin } from "lucide-react";
import { BrazilMap } from "./BrazilMap";

const offices = [
  {
    city: "Cuiabá",
    state: "MT",
    type: "Matriz",
    address: "Rua Des. José Barros do Vale, 03",
    isMain: true,
  },
  {
    city: "Barreiras",
    state: "BA",
    type: "Filial",
    address: "Centro Empresarial",
    isMain: false,
  },
  {
    city: "Curitiba",
    state: "PR",
    type: "Filial",
    address: "Centro Empresarial",
    isMain: false,
  },
];

export const OfficesSection = () => {
  return (
    <section className="py-20 md:py-28 bg-gray-700">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-50 mb-4">
            Onde Estamos
          </h2>
          <p className="text-gray-300">
            Presença estratégica nas principais regiões do agronegócio brasileiro, 
            atendendo clientes em todo o território nacional.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Map */}
          <div className="order-2 lg:order-1">
            <BrazilMap />
          </div>

          {/* Offices List */}
          <div className="order-1 lg:order-2 space-y-6">
            {offices.map((office, index) => (
              <motion.div
                key={office.city}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.15 }}
                className="group"
              >
                <div className="flex items-start gap-4 p-5 bg-gray-800/50 rounded-xl border border-gray-600/30 hover:border-primary/30 transition-colors">
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      office.isMain 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-gray-600/50 text-gray-400'
                    }`}>
                      <MapPin className="w-5 h-5" />
                    </div>
                  </div>
                  
                  <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        office.isMain 
                          ? 'bg-primary/20 text-primary' 
                          : 'bg-gray-600/50 text-gray-400'
                      }`}>
                        {office.type}
                      </span>
                      <div className="flex items-center text-primary/60">
                        <ChevronRight className="w-4 h-4" />
                        <ChevronRight className="w-4 h-4 -ml-2" />
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-semibold text-gray-50 mb-1">
                      {office.city}
                      <span className="text-gray-400 font-normal ml-2">
                        {office.state}
                      </span>
                    </h3>
                    
                    <p className="text-sm text-gray-400">
                      {office.address}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Legend */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
              className="flex items-center gap-6 pt-4 text-sm text-gray-400"
            >
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                <span>Escritórios</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary/60"></span>
                <span>Área de atuação</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};
