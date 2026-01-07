import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { BrazilMap } from "./BrazilMap";

const offices = [
  {
    id: "cuiaba",
    city: "Cuiabá",
    state: "MT",
    type: "Matriz",
    address: "Rua Des. José Barros do Vale, 03",
    isMain: true,
  },
  {
    id: "barreiras",
    city: "Barreiras",
    state: "BA",
    type: "Filial",
    address: "Centro Empresarial",
    isMain: false,
  },
  {
    id: "curitiba",
    city: "Curitiba",
    state: "PR",
    type: "Filial",
    address: "Centro Empresarial",
    isMain: false,
  },
];

export const OfficesSection = () => {
  const [selectedOffice, setSelectedOffice] = useState<string | null>(null);

  const handleOfficeClick = (officeId: string | null) => {
    setSelectedOffice(officeId);
  };

  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Onde Estamos
          </h2>
          <p className="text-muted-foreground">
            Presença estratégica nas principais regiões do agronegócio brasileiro, 
            atendendo clientes em todo o território nacional.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Map */}
          <div className="order-2 lg:order-1">
            <BrazilMap 
              selectedOffice={selectedOffice} 
              onOfficeClick={handleOfficeClick}
            />
          </div>

          {/* Offices List */}
          <div className="order-1 lg:order-2 space-y-4">
            {offices.map((office, index) => (
              <motion.div
                key={office.id}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.15 }}
                className="group"
              >
                <button
                  onClick={() => handleOfficeClick(selectedOffice === office.id ? null : office.id)}
                  className={`w-full text-left flex items-start gap-4 p-5 bg-background rounded-xl border transition-all duration-300 shadow-sm hover:shadow-md ${
                    selectedOffice === office.id
                      ? 'border-primary ring-2 ring-primary/20 shadow-md'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                      office.isMain || selectedOffice === office.id
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      <MapPin className="w-5 h-5" />
                    </div>
                  </div>
                  
                  <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        office.isMain 
                          ? 'bg-primary/20 text-primary' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {office.type}
                      </span>
                      {selectedOffice === office.id && (
                        <span className="text-xs text-primary font-medium">
                          Visualizando no mapa
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-semibold text-foreground mb-1">
                      {office.city}
                      <span className="text-muted-foreground font-normal ml-2">
                        {office.state}
                      </span>
                    </h3>
                    
                    <p className="text-sm text-muted-foreground">
                      {office.address}
                    </p>
                  </div>
                </button>
              </motion.div>
            ))}

            {/* Legend */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
              className="flex items-center gap-6 pt-4 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-destructive"></span>
                <span>Escritórios</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary/60"></span>
                <span>Área de atuação</span>
              </div>
            </motion.div>

            <p className="text-xs text-muted-foreground pt-2">
              💡 Clique em um escritório para visualizar no mapa
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
