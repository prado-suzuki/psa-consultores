import { useState } from "react";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";

const navItems = [
  { id: "inicio", label: "Início", href: "#", external: false },
  { id: "servicos", label: "Serviços", href: "#servicos", external: false },
  { id: "sobre", label: "Sobre", href: "#sobre", external: false },
  { id: "contato", label: "Contato", href: "#contato", external: false },
  { id: "carreira", label: "Carreira", href: "https://www.linkedin.com/company/psaconsultores/jobs/", external: true },
];

export const Header = () => {
  const [activeItem, setActiveItem] = useState("inicio");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 md:px-6 py-4 bg-[#030712]/75 backdrop-blur-md">
      <div className="container mx-auto">
        <div className="flex items-center justify-between">
          {/* Navigation - Floating Pills */}
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = activeItem === item.id;

              return (
                <motion.a
                  key={item.id}
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  className={`
                    relative px-5 py-2.5 text-sm font-medium rounded-full
                    backdrop-blur-md border transition-all duration-300
                    ${isActive 
                      ? "bg-primary/20 border-primary/40 text-primary shadow-[0_0_15px_rgba(101,163,13,0.3)]" 
                      : "bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30"
                    }
                  `}
                  onClick={() => setActiveItem(item.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {item.label}
                </motion.a>
              );
            })}
          </nav>

          {/* CTA Buttons - Floating */}
          <div className="hidden md:flex items-center gap-3">
            <motion.button
              onClick={() => window.location.href = '/equipe'}
              className="px-5 py-2.5 text-sm font-medium rounded-full backdrop-blur-md
                bg-white/5 border border-white/15 text-white
                hover:bg-white/15 hover:border-white/25 transition-all duration-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Equipe
            </motion.button>
            <motion.button
              onClick={() => window.location.href = '/auth'}
              className="px-5 py-2.5 text-sm font-medium rounded-full backdrop-blur-md
                bg-primary/90 border border-primary text-primary-foreground
                hover:bg-primary hover:shadow-[0_0_20px_rgba(101,163,13,0.4)] transition-all duration-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Área do Cliente
            </motion.button>
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            className="md:hidden p-2.5 rounded-full backdrop-blur-md bg-white/10 border border-white/20 text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            whileTap={{ scale: 0.95 }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </motion.button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden mt-4 p-4 rounded-2xl backdrop-blur-lg bg-gray-900/90 border border-white/10"
          >
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  className={`
                    px-4 py-3 text-sm font-medium rounded-xl transition-all
                    ${activeItem === item.id 
                      ? "bg-primary/20 text-primary" 
                      : "text-white hover:bg-white/10"
                    }
                  `}
                  onClick={() => {
                    setActiveItem(item.id);
                    setMobileMenuOpen(false);
                  }}
                >
                  {item.label}
                </a>
              ))}
              <div className="h-px bg-white/10 my-2" />
              <button
                onClick={() => window.location.href = '/equipe'}
                className="px-4 py-3 text-sm font-medium rounded-xl text-white hover:bg-white/10 text-left"
              >
                Equipe
              </button>
              <button
                onClick={() => window.location.href = '/auth'}
                className="px-4 py-3 text-sm font-medium rounded-xl bg-primary text-primary-foreground text-left"
              >
                Área do Cliente
              </button>
            </nav>
          </motion.div>
        )}
      </div>
    </header>
  );
};
